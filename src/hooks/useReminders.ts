import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Reminder, ReminderStatus } from '../types';
import { reminderNotification } from '../utils/notifications';

export const useReminders = () => {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(false);

  // memoize so useEffect below doesn't trigger on every render
  const fetchReminders = useCallback(async () => {
    setLoading(true);
    try {
      const stored = await AsyncStorage.getItem('reminders');
      if (stored) {
        setReminders(JSON.parse(stored));
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const saveReminders = async (items: Reminder[]) => {
    setReminders(items);
    await AsyncStorage.setItem('reminders', JSON.stringify(items));
  };

  const scheduleReminders = async (items: Reminder[]) => {
    if (!items.length) return;
    const existing = [...reminders];
    const all = [...existing, ...items];
    await saveReminders(all);
    items.forEach(reminder => {
      const [hour, minute] = reminder.time.split(':').map(Number);
      const notificationDate = new Date(reminder.date);
      notificationDate.setHours(hour, minute, 0, 0);
      if (notificationDate > new Date()) {
        reminderNotification({
          title: `Напоминание: ${reminder.name}`,
          body: `Примите ${reminder.dosage}`,
          date: notificationDate,
        });
      }
    });
  };

  const updateReminderStatus = async (id: string | number, status: ReminderStatus) => {
    const updated = reminders.map(r => (r.id === id ? { ...r, status } : r));
    await saveReminders(updated);
  };

  const deleteReminder = async (id: string | number) => {
    const filtered = reminders.filter(r => r.id !== id);
    await saveReminders(filtered);
  };

  const deleteByCourse = async (courseId: number) => {
    const filtered = reminders.filter(r => r.courseId !== courseId);
    await saveReminders(filtered);
  };

  useEffect(() => {
    fetchReminders();
  }, [fetchReminders]);

  return {
    reminders,
    loading,
    fetchReminders,
    scheduleReminders,
    updateReminderStatus,
    deleteReminder,
    deleteByCourse,
  };
};

