import { useState, useEffect, useCallback } from 'react';
import type { PipelineEvent, NotificationEvent } from '../../shared/types';

export function usePipelineEvents() {
  const [events, setEvents] = useState<PipelineEvent[]>([]);
  const [loading, setLoading] = useState(true);

  // Load initial events from store
  useEffect(() => {
    const loadEvents = async () => {
      try {
        if (window.electronAPI?.getPipelineEvents) {
          const stored = await window.electronAPI.getPipelineEvents();
          if (Array.isArray(stored)) {
            setEvents(stored);
          }
        }
      } catch (error) {
        console.error('Failed to load pipeline events:', error);
      } finally {
        setLoading(false);
      }
    };

    loadEvents();
  }, []);

  // Subscribe to real-time events
  useEffect(() => {
    if (!window.electronAPI?.onPipelineEvent) return;

    const unsubscribe = window.electronAPI.onPipelineEvent((event: PipelineEvent) => {
      setEvents((prev) => {
        const newEvents = [event, ...prev];
        return newEvents.slice(0, 50);
      });
    });

    return () => {
      // Cleanup would go here if needed
    };
  }, []);

  const clearEvents = useCallback(() => {
    setEvents([]);
  }, []);

  return { events, loading, clearEvents };
}

export function useNotifications() {
  const [notifications, setNotifications] = useState<NotificationEvent[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // Load initial notifications from store
  useEffect(() => {
    const loadNotifications = async () => {
      try {
        if (window.electronAPI?.getNotifications) {
          const stored = await window.electronAPI.getNotifications();
          if (Array.isArray(stored)) {
            setNotifications(stored);
            setUnreadCount(stored.filter(n => !n.read).length);
          }
        }
      } catch (error) {
        console.error('Failed to load notifications:', error);
      } finally {
        setLoading(false);
      }
    };

    loadNotifications();
  }, []);

  // Subscribe to real-time notifications
  useEffect(() => {
    if (!window.electronAPI?.onNotificationEvent) return;

    const unsubscribe = window.electronAPI.onNotificationEvent((event: NotificationEvent) => {
      setNotifications((prev) => {
        const newNotifications = [event, ...prev];
        return newNotifications.slice(0, 100);
      });
      if (!event.read) {
        setUnreadCount((prev) => prev + 1);
      }
    });

    return () => {
      // Cleanup would go here if needed
    };
  }, []);

  const markAsRead = useCallback(async (id: string) => {
    try {
      if (window.electronAPI?.markNotificationRead) {
        await window.electronAPI.markNotificationRead(id);
      }
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    try {
      for (const notification of notifications.filter(n => !n.read)) {
        if (window.electronAPI?.markNotificationRead) {
          await window.electronAPI.markNotificationRead(notification.id);
        }
      }
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
    }
  }, [notifications]);

  const clearAll = useCallback(async () => {
    try {
      if (window.electronAPI?.clearAllNotifications) {
        await window.electronAPI.clearAllNotifications();
      }
      setNotifications([]);
      setUnreadCount(0);
    } catch (error) {
      console.error('Failed to clear notifications:', error);
    }
  }, []);

  return {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    clearAll,
  };
}
