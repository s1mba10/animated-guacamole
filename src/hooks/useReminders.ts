import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Reminder, ReminderStatus } from '../types';
import NotificationManager from '../services/NotificationManager';

export const useReminders = () => {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState<boolean | null>(null);

  // Initialize notification system on mount
  useEffect(() => {
    const init = async () => {
      try {
        // Initialize the notification system
        const initialized = await NotificationManager.initialize();

        // Check permission status
        const { granted } = await NotificationManager.checkPermission();
        setNotificationPermission(granted);

        if (!initialized || !granted) {
          console.warn('Notifications not available or permission denied');
        }
      } catch (error) {
        console.error('Failed to initialize notifications:', error);
      }
    };

    init();
  }, []);

  // memoize so useEffect below doesn't trigger on every render
  const fetchReminders = useCallback(async () => {
    setLoading(true);
    try {
      const stored = await AsyncStorage.getItem('reminders');
      if (stored) {
        const loadedReminders = JSON.parse(stored);
        setReminders(loadedReminders);

        // Restore notifications after loading reminders
        await NotificationManager.restoreNotifications(loadedReminders);

        // Cleanup old notifications
        await NotificationManager.cleanup();
      }
    } catch (error) {
      console.error('Failed to fetch reminders:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const saveReminders = async (items: Reminder[]) => {
    try {
      setReminders(items);
      await AsyncStorage.setItem('reminders', JSON.stringify(items));
    } catch (error) {
      console.error('Failed to save reminders:', error);
      throw error;
    }
  };

  const scheduleReminders = async (items: Reminder[]): Promise<{ success: boolean; error?: string }> => {
    if (!items.length) {
      return { success: true };
    }

    try {
      // Check if notifications are available
      const { granted } = await NotificationManager.checkPermission();
      if (!granted) {
        return {
          success: false,
          error: 'Разрешение на уведомления не предоставлено. Пожалуйста, включите уведомления в настройках.'
        };
      }

      const existing = [...reminders];
      const all = [...existing, ...items];
      await saveReminders(all);

      // Schedule notifications for each reminder
      let scheduledCount = 0;
      let failedCount = 0;

      for (const reminder of items) {
        try {
          const [hour, minute] = reminder.time.split(':').map(Number);
          const notificationDate = new Date(reminder.date);
          notificationDate.setHours(hour, minute, 0, 0);

          if (notificationDate > new Date()) {
            const notificationId = await NotificationManager.scheduleNotification({
              reminderId: reminder.id,
              title: `Напоминание: ${reminder.name}`,
              body: `Примите ${reminder.dosage}`,
              date: notificationDate,
            });

            if (notificationId) {
              scheduledCount++;
            } else {
              failedCount++;
            }
          }
        } catch (error) {
          console.error(`Failed to schedule notification for reminder ${reminder.id}:`, error);
          failedCount++;
        }
      }

      console.log(`Scheduled ${scheduledCount}/${items.length} notifications (${failedCount} failed)`);

      if (failedCount > 0 && scheduledCount === 0) {
        return {
          success: false,
          error: 'Не удалось запланировать уведомления. Проверьте настройки приложения.'
        };
      }

      return { success: true };
    } catch (error) {
      console.error('Failed to schedule reminders:', error);
      return {
        success: false,
        error: 'Произошла ошибка при планировании напоминаний.'
      };
    }
  };

  const updateReminderStatus = async (id: string | number, status: ReminderStatus) => {
    try {
      const updated = reminders.map(r => (r.id === id ? { ...r, status } : r));
      await saveReminders(updated);

      // If status changed to taken or missed, cancel the notification
      if (status === 'taken' || status === 'missed') {
        await NotificationManager.cancelNotification(String(id));
      }
    } catch (error) {
      console.error('Failed to update reminder status:', error);
      throw error;
    }
  };

  const deleteReminder = async (id: string | number) => {
    try {
      const filtered = reminders.filter(r => r.id !== id);
      await saveReminders(filtered);

      // Cancel the associated notification
      await NotificationManager.cancelNotification(String(id));
    } catch (error) {
      console.error('Failed to delete reminder:', error);
      throw error;
    }
  };

  const deleteByCourse = async (courseId: number) => {
    try {
      const toDelete = reminders.filter(r => r.courseId === courseId);
      const filtered = reminders.filter(r => r.courseId !== courseId);
      await saveReminders(filtered);

      // Cancel all associated notifications
      const reminderIds = toDelete.map(r => String(r.id));
      await NotificationManager.cancelNotifications(reminderIds);
    } catch (error) {
      console.error('Failed to delete reminders by course:', error);
      throw error;
    }
  };

  const requestNotificationPermission = async (): Promise<boolean> => {
    try {
      await NotificationManager.initialize();
      const { granted } = await NotificationManager.checkPermission();
      setNotificationPermission(granted);
      return granted;
    } catch (error) {
      console.error('Failed to request notification permission:', error);
      return false;
    }
  };

  useEffect(() => {
    fetchReminders();
  }, [fetchReminders]);

  return {
    reminders,
    loading,
    notificationPermission,
    fetchReminders,
    scheduleReminders,
    updateReminderStatus,
    deleteReminder,
    deleteByCourse,
    requestNotificationPermission,
  };
};

