import { useEffect, useRef } from 'react';
import { apiCall, getApiBaseUrl } from './api';

export interface SyncPayload {
  version: number;
  last_topic?: string;
  topics?: Record<string, number>;
}

class LiveSyncClient {
  private eventSource: EventSource | null = null;
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private broadcastChannel: BroadcastChannel | null = null;
  private lastVersion = 0;
  private lastTopics: Record<string, number> = {};
  private started = false;

  public start() {
    if (this.started || typeof window === 'undefined') return;
    this.started = true;

    if ('BroadcastChannel' in window) {
      this.broadcastChannel = new BroadcastChannel('kaizen_live_sync');
      this.broadcastChannel.onmessage = (ev) => {
        if (ev.data?.type === 'sync') {
          this.handleIncomingState(ev.data.payload, true);
        }
      };
    }

    window.addEventListener('kaizen_local_mutation', this.handleLocalMutation as EventListener);
    window.addEventListener('kaizen_auth_state_changed', this.handleAuthChanged);
    window.addEventListener('focus', this.checkNow);
    document.addEventListener('visibilitychange', this.handleVisibilityChange);

    this.connectStream();
    this.pollTimer = setInterval(() => {
      // Poll fast if SSE is not open, or as a low-frequency safety net
      if (!this.eventSource || this.eventSource.readyState !== EventSource.OPEN) {
        this.checkNow();
      }
    }, 3500);
  }

  private handleVisibilityChange = () => {
    if (document.visibilityState === 'visible') {
      this.checkNow();
      if (!this.eventSource || this.eventSource.readyState === EventSource.CLOSED) {
        this.connectStream();
      }
    }
  };

  private handleAuthChanged = () => {
    const token = localStorage.getItem('access_token');
    if (token) {
      this.lastVersion = 0;
      this.lastTopics = {};
      this.connectStream();
    } else {
      this.closeStream();
    }
  };

  private handleLocalMutation = (e: CustomEvent<{ endpoint: string }>) => {
    const endpoint = (e.detail?.endpoint || '').toLowerCase();
    let topic = 'all';
    if (endpoint.includes('/courses') || endpoint.includes('/modules') || endpoint.includes('/contents') || endpoint.includes('/quizzes')) {
      topic = 'courses';
    } else if (endpoint.includes('/enrollments') || endpoint.includes('/assign-course')) {
      topic = 'enrollments';
    } else if (endpoint.includes('/exams')) {
      topic = 'exams';
    } else if (endpoint.includes('/badges')) {
      topic = 'badges';
    } else if (endpoint.includes('/departments')) {
      topic = 'departments';
    } else if (endpoint.includes('/admin') || endpoint.includes('/users') || endpoint.includes('/profile')) {
      topic = 'users';
    }
    const synthetic: SyncPayload = {
      version: this.lastVersion + 1,
      last_topic: topic,
      topics: { ...this.lastTopics, [topic]: (this.lastTopics[topic] || 0) + 1 },
    };
    this.broadcastChannel?.postMessage({ type: 'sync', payload: synthetic });
    this.emitSync([topic, 'all']);
  };

  private connectStream() {
    this.closeStream();
    const token = localStorage.getItem('access_token');
    if (!token) return;

    try {
      const url = `${getApiBaseUrl()}/api/sync/stream?token=${encodeURIComponent(token)}`;
      const es = new EventSource(url);
      es.addEventListener('sync', (event: MessageEvent) => {
        try {
          const payload: SyncPayload = JSON.parse(event.data);
          this.handleIncomingState(payload, false);
        } catch {
          // ignore malformed event
        }
      });
      es.onerror = () => {
        if (es.readyState === EventSource.CLOSED) {
          this.eventSource = null;
        }
      };
      this.eventSource = es;
    } catch {
      this.eventSource = null;
    }
  }

  private closeStream() {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
  }

  public checkNow = async () => {
    const token = localStorage.getItem('access_token');
    if (!token) return;
    try {
      const res = await apiCall('/api/sync/version');
      if (res.ok) {
        const payload: SyncPayload = await res.json();
        this.handleIncomingState(payload, false);
      }
    } catch {
      // silent background check
    }
  };

  private handleIncomingState(payload: SyncPayload, forceEmit: boolean) {
    if (!payload || typeof payload.version !== 'number') return;

    // First handshake sets baseline without triggering redundant initial refetch
    if (this.lastVersion === 0 && !forceEmit) {
      this.lastVersion = payload.version;
      this.lastTopics = payload.topics || {};
      return;
    }

    if (payload.version <= this.lastVersion && !forceEmit) {
      return;
    }

    const changedTopics: string[] = [];
    const incomingTopics = payload.topics || {};
    for (const key of Object.keys(incomingTopics)) {
      if ((incomingTopics[key] || 0) > (this.lastTopics[key] || 0)) {
        changedTopics.push(key);
      }
    }
    if (payload.last_topic && !changedTopics.includes(payload.last_topic)) {
      changedTopics.push(payload.last_topic);
    }
    if (changedTopics.length === 0) {
      changedTopics.push('all');
    }

    this.lastVersion = Math.max(this.lastVersion, payload.version);
    this.lastTopics = { ...this.lastTopics, ...incomingTopics };
    this.emitSync(changedTopics);
  }

  private emitSync(topics: string[]) {
    window.dispatchEvent(new CustomEvent('kaizen_live_sync', { detail: { topics } }));
  }
}

export const liveSyncClient = new LiveSyncClient();

/**
 * Subscribe a page/component to real-time backend updates for the given topics.
 * Automatically debounces and invokes the latest callback silently in the background.
 */
export const useLiveSync = (topics: string[], onSync: () => void) => {
  const callbackRef = useRef(onSync);
  const topicsRef = useRef(topics);

  useEffect(() => {
    callbackRef.current = onSync;
  }, [onSync]);

  useEffect(() => {
    topicsRef.current = topics;
  }, [topics]);

  useEffect(() => {
    liveSyncClient.start();
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;

    const handler = (ev: Event) => {
      const detail = (ev as CustomEvent<{ topics: string[] }>).detail;
      const incoming = detail?.topics || ['all'];
      const interested = topicsRef.current;
      const matches =
        interested.includes('all') ||
        incoming.includes('all') ||
        incoming.some((t) => interested.includes(t));

      if (!matches) return;

      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        callbackRef.current();
      }, 150);
    };

    window.addEventListener('kaizen_live_sync', handler);
    return () => {
      window.removeEventListener('kaizen_live_sync', handler);
      if (debounceTimer) clearTimeout(debounceTimer);
    };
  }, []);
};
