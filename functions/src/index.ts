import {setGlobalOptions} from "firebase-functions";
import {onDocumentCreated} from "firebase-functions/v2/firestore";
import * as logger from "firebase-functions/logger";

import {initializeApp} from "firebase-admin/app";
import {FieldValue, getFirestore} from "firebase-admin/firestore";
import {getMessaging} from "firebase-admin/messaging";

initializeApp();

setGlobalOptions({maxInstances: 10});

const db = getFirestore();

type RoomDoc = {
  name?: string;
};

type UserDoc = {
  fcmTokens?: Record<string, true>;
};

type MessageDoc = {
  text?: string;
  uid?: string;
  displayName?: string;
};

export const notifyOnNewMessage = onDocumentCreated(
  {document: "rooms/{roomId}/messages/{messageId}", region: "europe-west10"},
  async (event) => {
    const roomId = event.params.roomId as string;

    const message = event.data?.data() as MessageDoc | undefined;
    if (!message) {
      logger.warn("Missing message data", {roomId});
      return;
    }

    const senderUid = message.uid;
    if (!senderUid) {
      logger.warn("Message missing uid", {roomId});
      return;
    }

    // Load room name (for notification title)
    const roomSnap = await db.collection("rooms").doc(roomId).get();
    const room =
      (roomSnap.exists ? (roomSnap.data() as RoomDoc) : undefined) ?? undefined;

    const roomName =
      typeof room?.name === "string" && room.name.trim().length > 0 ?
        room.name :
        "Chat room";

    const senderName = message.displayName ?? "Someone";
    const text = message.text ?? "Ny besked";

    const title = roomName;
    const body = `${senderName}: ${text}`;

    // Find subscribed members
    const membersSnap = await db
      .collection("rooms")
      .doc(roomId)
      .collection("members")
      .where("subscribedToNotifications", "==", true)
      .get();

    if (membersSnap.empty) {
      logger.info("No subscribed members", {roomId});
      return;
    }

    const targetUids = membersSnap.docs
      .map((d) => d.id)
      .filter((uid) => uid !== senderUid);

    if (targetUids.length === 0) {
      logger.info("No recipients after filtering sender", {roomId});
      return;
    }

    // Load users to gather tokens (and keep uid<->token mapping for cleanup)
    const userSnaps = await Promise.all(
      targetUids.map((uid) => db.collection("users").doc(uid).get()),
    );

    const tokenEntries: Array<{ uid: string; token: string }> = [];
    for (let i = 0; i < userSnaps.length; i++) {
      const snap = userSnaps[i];
      const uid = targetUids[i];

      if (!snap.exists) continue;

      const user = snap.data() as UserDoc;
      const userTokens = user.fcmTokens ? Object.keys(user.fcmTokens) : [];

      for (const t of userTokens) {
        tokenEntries.push({uid, token: t});
      }
    }

    const uniqueTokens = Array.from(new Set(tokenEntries.map((e) => e.token)));

    if (uniqueTokens.length === 0) {
      logger.info("No FCM tokens for recipients", {
        roomId,
        targetUidsCount: targetUids.length,
      });
      return;
    }

    const res = await getMessaging().sendEachForMulticast({
      tokens: uniqueTokens,
      notification: {title, body},
      data: {roomId},
      android: {
        priority: "high",
        notification: {
          channelId: "chat",
        },
      },
    });

    logger.info("Push sent", {
      roomId,
      successCount: res.successCount,
      failureCount: res.failureCount,
      recipients: uniqueTokens.length,
    });

    // Cleanup invalid tokens
    const invalidTokens: string[] = [];
    res.responses.forEach((r, idx) => {
      if (r.success) return;

      const code = (r.error as { code?: string } | null | undefined)?.code;
      if (
        code === "messaging/registration-token-not-registered" ||
        code === "messaging/invalid-registration-token"
      ) {
        invalidTokens.push(uniqueTokens[idx]);
      }
    });

    if (invalidTokens.length === 0) return;

    const invalidSet = new Set(invalidTokens);

    const updatesByUid = new Map<string, string[]>();
    for (const entry of tokenEntries) {
      if (!invalidSet.has(entry.token)) continue;
      const arr = updatesByUid.get(entry.uid) ?? [];
      arr.push(entry.token);
      updatesByUid.set(entry.uid, arr);
    }

    await Promise.all(
      Array.from(updatesByUid.entries()).map(([uid, tokensToRemove]) => {
        const update: Record<string, unknown> = {};
        for (const t of tokensToRemove) {
          update[`fcmTokens.${t}`] = FieldValue.delete();
        }
        return db.collection("users").doc(uid).update(update);
      }),
    );

    logger.warn("Removed invalid tokens", {count: invalidTokens.length});
  },
);
