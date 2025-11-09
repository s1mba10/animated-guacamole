/**
 * Standalone notification action handlers
 * These functions work without React context and can be used in headless background tasks
 */
import notifee from '@notifee/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { NotificationSchedule } from './NotificationManager';

/**
 * Handle "Take" action - mark reminder as taken
 */
export async function handleTakeAction(reminderId: string): Promise<void> {
  try {
    // Get current reminders
    const stored = await AsyncStorage.getItem('reminders');
    if (stored) {
      const reminders = JSON.parse(stored);
      const updated = reminders.map((r: any) =>
        r.id === reminderId ? { ...r, status: 'taken' } : r
      );
      await AsyncStorage.setItem('reminders', JSON.stringify(updated));
      console.log(`Updated reminder ${reminderId} status to 'taken' in storage`);
    }

    // Remove from scheduled notifications
    await removeScheduledNotification(reminderId);

    // Cancel all repeat notifications for this reminder
    const repeatIntervals = [5, 10, 15];
    const cancelPromises = repeatIntervals.map(async (interval) => {
      const repeatId = `${reminderId}_repeat_${interval}`;
      try {
        await notifee.cancelNotification(repeatId);
        await removeScheduledNotification(repeatId);
      } catch (error) {
        console.error(`Failed to cancel repeat notification ${repeatId}:`, error);
      }
    });

    // Wait for all cancel operations to complete
    await Promise.all(cancelPromises);

    console.log(`Marked reminder ${reminderId} as taken and cancelled repeat notifications`);
  } catch (error) {
    console.error('Failed to handle take action:', error);
  }
}

/**
 * Handle "Snooze" action - reschedule reminder for 15 minutes later
 */
export async function handleSnoozeAction(notification: any): Promise<void> {
  try {
    const reminderId = notification.data?.reminderId as string;

    // Load current reminders from storage
    const stored = await AsyncStorage.getItem('reminders');
    if (!stored) {
      console.error('No reminders found in storage');
      return;
    }

    const reminders = JSON.parse(stored);
    const reminderIndex = reminders.findIndex((r: any) => r.id === reminderId);

    if (reminderIndex === -1) {
      console.error(`Reminder ${reminderId} not found in storage`);
      return;
    }

    const reminder = reminders[reminderIndex];

    // Check if already snoozed 3 times
    const currentSnoozeCount = reminder.snoozeCount || 0;
    if (currentSnoozeCount >= 3) {
      console.log(`Reminder ${reminderId} has reached maximum snooze count`);
      return;
    }

    // Calculate new time (15 minutes from now)
    const snoozeTime = new Date(Date.now() + 15 * 60 * 1000);
    const newTime = `${snoozeTime.getHours().toString().padStart(2, '0')}:${snoozeTime.getMinutes().toString().padStart(2, '0')}`;
    const newDate = `${snoozeTime.getFullYear()}-${(snoozeTime.getMonth() + 1).toString().padStart(2, '0')}-${snoozeTime.getDate().toString().padStart(2, '0')}`;

    // Store original time/date on first snooze
    if (currentSnoozeCount === 0) {
      reminder.originalTime = reminder.time;
      reminder.originalDate = reminder.date;
    }

    // Update reminder with new time and increment snooze count
    reminder.time = newTime;
    reminder.date = newDate;
    reminder.snoozeCount = currentSnoozeCount + 1;

    // Update reminders array
    reminders[reminderIndex] = reminder;

    // Save updated reminders to storage
    await AsyncStorage.setItem('reminders', JSON.stringify(reminders));

    // Cancel current notification and all repeat notifications
    await cancelNotificationWithRepeats(reminderId);

    // Schedule new notification at the new time
    // Dynamic import to avoid circular dependencies during initialization
    const { scheduleNotification } = await import('./NotificationManager');
    await scheduleNotification({
      reminderId: reminderId,
      title: notification.title || 'Напоминание',
      body: notification.body || 'Время принять лекарство',
      date: snoozeTime,
      data: {
        ...notification.data,
        snoozeCount: reminder.snoozeCount,
      },
    });

    console.log(`Snoozed reminder ${reminderId} to ${newTime} (${reminder.snoozeCount}/3)`);
  } catch (error) {
    console.error('Failed to handle snooze action:', error);
  }
}

/**
 * Handle "Skip" action - mark reminder as missed
 */
export async function handleSkipAction(reminderId: string): Promise<void> {
  try {
    // Get current reminders
    const stored = await AsyncStorage.getItem('reminders');
    if (stored) {
      const reminders = JSON.parse(stored);
      const updated = reminders.map((r: any) =>
        r.id === reminderId ? { ...r, status: 'missed' } : r
      );
      await AsyncStorage.setItem('reminders', JSON.stringify(updated));
      console.log(`Updated reminder ${reminderId} status to 'missed' in storage`);
    }

    // Remove from scheduled notifications
    await removeScheduledNotification(reminderId);

    // Cancel all repeat notifications for this reminder
    const repeatIntervals = [5, 10, 15];
    const cancelPromises = repeatIntervals.map(async (interval) => {
      const repeatId = `${reminderId}_repeat_${interval}`;
      try {
        await notifee.cancelNotification(repeatId);
        await removeScheduledNotification(repeatId);
      } catch (error) {
        console.error(`Failed to cancel repeat notification ${repeatId}:`, error);
      }
    });

    // Wait for all cancel operations to complete
    await Promise.all(cancelPromises);

    console.log(`Marked reminder ${reminderId} as skipped and cancelled repeat notifications`);
  } catch (error) {
    console.error('Failed to handle skip action:', error);
  }
}

// Helper functions

const STORAGE_KEY = 'scheduled_notifications';

async function removeScheduledNotification(reminderId: string): Promise<void> {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    const scheduled = stored ? JSON.parse(stored) : [];
    const filtered = scheduled.filter((n: any) => n.reminderId !== reminderId);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error('Failed to remove scheduled notification:', error);
  }
}

async function cancelNotificationWithRepeats(reminderId: string): Promise<void> {
  try {
    // Cancel the main notification
    await notifee.cancelNotification(reminderId);
    await removeScheduledNotification(reminderId);

    // Cancel all repeat notifications
    const repeatIntervals = [5, 10, 15];
    for (const interval of repeatIntervals) {
      const repeatId = `${reminderId}_repeat_${interval}`;
      try {
        await notifee.cancelNotification(repeatId);
        await removeScheduledNotification(repeatId);
      } catch (error) {
        // Ignore errors for repeat notifications that might not exist
      }
    }

    console.log(`Cancelled notification ${reminderId} and all repeat notifications`);
  } catch (error) {
    console.error('Failed to cancel notification with repeats:', error);
  }
}
