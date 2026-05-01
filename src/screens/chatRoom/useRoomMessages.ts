import { useEffect, useRef, useState } from 'react';
import {
  loadOlderMessages,
  subscribeToLatestMessages,
  type Message,
  type MessagesCursor,
} from '../../services/messages';

export function useRoomMessages(roomId: string) {
  const PAGE_SIZE = 50;
  const MORE_SIZE = 50;

  const [loading, setLoading] = useState(true);
  const [messagesDesc, setMessagesDesc] = useState<Message[]>([]);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const cursorRef = useRef<MessagesCursor>(null);

  useEffect(() => {
    const unsub = subscribeToLatestMessages(
      roomId,
      PAGE_SIZE,
      ({ newestDesc, cursor, hasMore }) => {
        cursorRef.current = cursor;
        setHasMore(hasMore);

        setMessagesDesc(prev => {
          const newestIds = new Set(newestDesc.map(m => m.id));
          const olderOnly = prev.filter(m => !newestIds.has(m.id));
          return [...newestDesc, ...olderOnly];
        });

        setLoading(false);
      },
      err => {
        console.warn('messages subscribe error', err);
        setLoading(false);
      },
    );

    return unsub;
  }, [roomId]);

  const loadMoreOlder = async () => {
    if (loadingMore || !hasMore) return;

    const cursor = cursorRef.current;
    if (!cursor) return;

    try {
      setLoadingMore(true);

      const {
        olderDesc,
        nextCursor,
        hasMore: more,
      } = await loadOlderMessages(roomId, cursor, MORE_SIZE);

      cursorRef.current = nextCursor;
      setHasMore(more);

      setMessagesDesc(prev => {
        const prevIds = new Set(prev.map(m => m.id));
        const dedupOlder = olderDesc.filter(m => !prevIds.has(m.id));
        return [...prev, ...dedupOlder];
      });
    } catch (e) {
      console.warn('loadMoreOlder error', e);
    } finally {
      setLoadingMore(false);
    }
  };

  return { loading, messagesDesc, loadingMore, hasMore, loadMoreOlder };
}
