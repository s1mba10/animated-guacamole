import notifee, {
  AndroidImportance,
  AuthorizationStatus,
  EventType,
  RepeatFrequency,
  TimestampTrigger,
  TriggerType,
  TriggerNotification,
  AndroidAction,
} from '@notifee/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

export interface NotificationSchedule {
  reminderId: string;
  title: string;
  body: string;
  date: Date;
  data?: Record<string, any>;
}

export interface ScheduledNotification {
  reminderId: string;
  notificationId: string;
  scheduledTime: number;
}

const STORAGE_KEY = 'scheduled_notifications';
const CHANNEL_ID = 'medication-reminders';
const CHANNEL_NAME = 'Medication Reminders';

class NotificationManager {
  private static instance: NotificationManager;
  private isInitialized = false;

  private constructor() {}

  public static getInstance(): NotificationManager {
    if (!NotificationManager.instance) {
      NotificationManager.instance = new NotificationManager();
    }
    return NotificationManager.instance;
  }

  /**
   * Initialize notification system - create channels, request permissions
   */
  public async initialize(): Promise<boolean> {
    if (this.isInitialized) {
      return true;
    }

    try {
      // Request permission
      const settings = await notifee.requestPermission();

      if (settings.authorizationStatus === AuthorizationStatus.DENIED) {
        console.warn('Notification permission denied');
        return false;
      }

      // Create notification channel (Android only)
      if (Platform.OS === 'android') {
        await notifee.createChannel({
          id: CHANNEL_ID,
          name: CHANNEL_NAME,
          importance: AndroidImportance.HIGH,
          sound: 'default',
          vibration: true,
          vibrationPattern: [300, 500, 300, 500],
          lights: true,
          lightColor: '#4A90E2',
          badge: true,
          bypassDnd: true, // Bypass Do Not Disturb for medication reminders
        });
      }

      // Set up notification event handlers
      this.setupEventHandlers();

      this.isInitialized = true;
      return true;
    } catch (error) {
      console.error('Failed to initialize notifications:', error);
      return false;
    }
  }

  /**
   * Check if notification permissions are granted
   */
  public async checkPermission(): Promise<{
    granted: boolean;
    status: AuthorizationStatus;
  }> {
    const settings = await notifee.getNotificationSettings();
    return {
      granted: settings.authorizationStatus === AuthorizationStatus.AUTHORIZED,
      status: settings.authorizationStatus,
    };
  }

  /**
   * Schedule repeat notifications to ensure user doesn't miss it
   */
  private async scheduleRepeatNotifications(
    schedule: NotificationSchedule,
    originalTime: Date
  ): Promise<void> {
    // Schedule 3 follow-up notifications at 5, 10, and 15 minutes after the original
    const repeatIntervals = [5, 10, 15];
    const snoozeCount = (schedule.data?.snoozeCount as number) || 0;

    for (const intervalMinutes of repeatIntervals) {
      const repeatTime = new Date(originalTime.getTime() + intervalMinutes * 60 * 1000);

      // Only schedule if it's still in the future
      if (repeatTime.getTime() <= Date.now()) {
        continue;
      }

      const repeatId = `${schedule.reminderId}_repeat_${intervalMinutes}`;

      try {
        const trigger: TimestampTrigger = {
          type: TriggerType.TIMESTAMP,
          timestamp: repeatTime.getTime(),
          alarmManager: Platform.OS === 'android' ? {
            allowWhileIdle: true,
          } : undefined,
        };

        await notifee.createTriggerNotification(
          {
            id: repeatId,
            title: `⏰ ${schedule.title}`,
            body: `Напоминание: ${schedule.body}`,
            android: {
              channelId: CHANNEL_ID,
              importance: AndroidImportance.HIGH,
              pressAction: {
                id: 'default',
                launchActivity: 'default',
              },
              actions: this.createNotificationActions(snoozeCount),
              autoCancel: false,
              sound: 'default',
              vibrationPattern: [500, 1000, 500, 1000],
              smallIcon: 'ic_launcher',
              color: '#FF6B6B',
              tag: schedule.reminderId, // Group with original notification
            },
            ios: {
              sound: 'default',
              categoryId: 'medication-reminder',
            },
            data: {
              reminderId: schedule.reminderId,
              isRepeat: 'true',
              repeatInterval: intervalMinutes.toString(),
              snoozeCount: snoozeCount,
              ...schedule.data,
            },
          },
          trigger
        );

        // Save repeat notification
        await this.saveScheduledNotification({
          reminderId: repeatId,
          notificationId: repeatId,
          scheduledTime: repeatTime.getTime(),
        });

        console.log(`Scheduled repeat notification ${repeatId} for ${intervalMinutes} minutes after original`);
      } catch (error) {
        console.error(`Failed to schedule repeat notification at ${intervalMinutes} minutes:`, error);
      }
    }
  }

  /**
   * Schedule a notification for medication reminder
   */
  public async scheduleNotification(
    schedule: NotificationSchedule
  ): Promise<string | null> {
    try {
      if (!this.isInitialized) {
        const initialized = await this.initialize();
        if (!initialized) {
          throw new Error('Failed to initialize notification system');
        }
      }

      // Check if date is in the future
      if (schedule.date.getTime() <= Date.now()) {
        console.warn('Attempting to schedule notification in the past');
        return null;
      }

      const trigger: TimestampTrigger = {
        type: TriggerType.TIMESTAMP,
        timestamp: schedule.date.getTime(),
        alarmManager: Platform.OS === 'android' ? {
          allowWhileIdle: true,
        } : undefined,
        repeatFrequency: RepeatFrequency.NONE,
      };

      // Get snoozeCount from data if available
      const snoozeCount = (schedule.data?.snoozeCount as number) || 0;

      // Create notification with actions
      const notificationId = await notifee.createTriggerNotification(
        {
          id: schedule.reminderId,
          title: schedule.title,
          body: schedule.body,
          android: {
            channelId: CHANNEL_ID,
            importance: AndroidImportance.HIGH,
            pressAction: {
              id: 'default',
              launchActivity: 'default',
            },
            actions: this.createNotificationActions(snoozeCount),
            autoCancel: false, // Don't dismiss automatically so user must acknowledge
            sound: 'default',
            vibrationPattern: [300, 500, 300, 500],
            smallIcon: 'ic_launcher',
            color: '#4A90E2',
            showTimestamp: true,
            timestamp: schedule.date.getTime(),
            fullScreenAction: {
              id: 'default',
              launchActivity: 'default',
            },
            showChronometer: false,
            ongoing: false,
            onlyAlertOnce: false, // Keep alerting
            timeoutAfter: 15 * 60 * 1000, // Auto-dismiss after 15 minutes
          },
          ios: {
            sound: 'default',
            categoryId: 'medication-reminder',
          },
          data: {
            reminderId: schedule.reminderId,
            snoozeCount: snoozeCount,
            ...schedule.data,
          },
        },
        trigger
      );

      // Save notification ID for later management
      await this.saveScheduledNotification({
        reminderId: schedule.reminderId,
        notificationId: notificationId,
        scheduledTime: schedule.date.getTime(),
      });

      // Schedule repeat notifications to ensure the user doesn't miss it
      await this.scheduleRepeatNotifications(schedule, schedule.date);

      console.log(`Scheduled notification ${notificationId} for reminder ${schedule.reminderId}`);
      return notificationId;
    } catch (error) {
      console.error('Failed to schedule notification:', error);
      throw error;
    }
  }

  /**
   * Cancel a specific notification by reminder ID
   */
  public async cancelNotification(reminderId: string): Promise<void> {
    try {
      // Get the notification ID from storage
      const scheduled = await this.getScheduledNotifications();
      const notification = scheduled.find(n => n.reminderId === reminderId);

      if (notification) {
        // Cancel the main notification
        await notifee.cancelNotification(notification.notificationId);

        // Remove from storage
        await this.removeScheduledNotification(reminderId);

        console.log(`Cancelled notification for reminder ${reminderId}`);
      }

      // Also cancel all repeat notifications for this reminder
      const repeatIntervals = [5, 10, 15];
      for (const interval of repeatIntervals) {
        const repeatId = `${reminderId}_repeat_${interval}`;
        try {
          await notifee.cancelNotification(repeatId);
          await this.removeScheduledNotification(repeatId);
          console.log(`Cancelled repeat notification ${repeatId}`);
        } catch (error) {
          // Ignore errors for repeat notifications that might not exist
        }
      }
    } catch (error) {
      console.error('Failed to cancel notification:', error);
    }
  }

  /**
   * Cancel multiple notifications by reminder IDs
   */
  public async cancelNotifications(reminderIds: string[]): Promise<void> {
    try {
      const scheduled = await this.getScheduledNotifications();
      const notificationIds = scheduled
        .filter(n => reminderIds.includes(n.reminderId))
        .map(n => n.notificationId);

      if (notificationIds.length > 0) {
        // Cancel each notification individually
        for (const notificationId of notificationIds) {
          await notifee.cancelNotification(notificationId);
        }

        // Remove from storage
        const remaining = scheduled.filter(
          n => !reminderIds.includes(n.reminderId)
        );
        await this.saveAllScheduledNotifications(remaining);

        console.log(`Cancelled ${notificationIds.length} notifications`);
      }
    } catch (error) {
      console.error('Failed to cancel notifications:', error);
    }
  }

  /**
   * Cancel all scheduled notifications
   */
  public async cancelAllNotifications(): Promise<void> {
    try {
      await notifee.cancelAllNotifications();
      await AsyncStorage.removeItem(STORAGE_KEY);
      console.log('Cancelled all notifications');
    } catch (error) {
      console.error('Failed to cancel all notifications:', error);
    }
  }

  /**
   * Restore notifications after app restart
   * Should be called on app launch
   */
  public async restoreNotifications(
    reminders: Array<{
      id: string;
      name: string;
      dosage: string;
      time: string;
      date: string;
      status: string;
    }>
  ): Promise<void> {
    try {
      console.log('Restoring notifications...');

      // Get currently scheduled notifications from notifee
      const triggerNotifications = await notifee.getTriggerNotifications();
      const existingIds = new Set(
        triggerNotifications.map(n => n.notification.data?.reminderId)
      );

      // Get our stored notification mappings
      const stored = await this.getScheduledNotifications();
      const now = Date.now();

      // Clean up past notifications from storage
      const validStored = stored.filter(n => n.scheduledTime > now);
      await this.saveAllScheduledNotifications(validStored);

      // Schedule missing notifications
      let restoredCount = 0;
      for (const reminder of reminders) {
        // Only restore pending reminders
        if (reminder.status !== 'pending') {
          continue;
        }

        const [hour, minute] = reminder.time.split(':').map(Number);
        const notificationDate = new Date(reminder.date);
        notificationDate.setHours(hour, minute, 0, 0);

        // Skip past notifications
        if (notificationDate.getTime() <= now) {
          continue;
        }

        // Check if notification already exists
        if (!existingIds.has(reminder.id)) {
          await this.scheduleNotification({
            reminderId: reminder.id,
            title: `Напоминание: ${reminder.name}`,
            body: `Примите ${reminder.dosage}`,
            date: notificationDate,
            data: {
              snoozeCount: (reminder as any).snoozeCount || 0,
            },
          });
          restoredCount++;
        }
      }

      console.log(`Restored ${restoredCount} notifications`);
    } catch (error) {
      console.error('Failed to restore notifications:', error);
    }
  }

  /**
   * Clean up old notifications that have already fired
   */
  public async cleanup(): Promise<void> {
    try {
      const scheduled = await this.getScheduledNotifications();
      const now = Date.now();

      // Keep only future notifications
      const future = scheduled.filter(n => n.scheduledTime > now);

      if (future.length < scheduled.length) {
        await this.saveAllScheduledNotifications(future);
        console.log(`Cleaned up ${scheduled.length - future.length} old notifications`);
      }
    } catch (error) {
      console.error('Failed to cleanup notifications:', error);
    }
  }

  /**
   * Get all trigger notifications from the system
   */
  public async getActiveNotifications(): Promise<TriggerNotification[]> {
    try {
      return await notifee.getTriggerNotifications();
    } catch (error) {
      console.error('Failed to get active notifications:', error);
      return [];
    }
  }

  // Private helper methods

  private createNotificationActions(snoozeCount: number = 0): AndroidAction[] {
    const actions: AndroidAction[] = [
      {
        title: 'Принял',
        pressAction: { id: 'take' },
        icon: 'https://my-cdn.com/icons/check.png',
      },
    ];

    // Only show snooze button if not snoozed 3 times already
    if (snoozeCount < 3) {
      actions.push({
        title: 'Отложить (15 мин)',
        pressAction: { id: 'snooze' },
        icon: 'https://my-cdn.com/icons/snooze.png',
      });
    }

    actions.push({
      title: 'Пропустить',
      pressAction: { id: 'skip' },
      icon: 'https://my-cdn.com/icons/close.png',
    });

    return actions;
  }

  private setupEventHandlers(): void {
    // Handle notification actions (take, snooze, skip)
    notifee.onBackgroundEvent(async ({ type, detail }) => {
      const { notification, pressAction } = detail;

      if (!notification || !pressAction) {
        return;
      }

      const reminderId = notification.data?.reminderId as string;

      switch (pressAction.id) {
        case 'take':
          // Update reminder status to 'taken'
          await this.handleTakeAction(reminderId);
          break;

        case 'snooze':
          // Reschedule notification for 15 minutes later
          await this.handleSnoozeAction(notification);
          break;

        case 'skip':
          // Update reminder status to 'missed'
          await this.handleSkipAction(reminderId);
          break;
      }
    });

    // Handle foreground notification events
    notifee.onForegroundEvent(async ({ type, detail }) => {
      if (type === EventType.ACTION_PRESS) {
        const { notification, pressAction } = detail;

        if (!notification || !pressAction) {
          return;
        }

        const reminderId = notification.data?.reminderId as string;

        switch (pressAction.id) {
          case 'take':
            await this.handleTakeAction(reminderId);
            break;

          case 'snooze':
            await this.handleSnoozeAction(notification);
            break;

          case 'skip':
            await this.handleSkipAction(reminderId);
            break;
        }
      }
    });
  }

  private async handleTakeAction(reminderId: string): Promise<void> {
    try {
      // Get current reminders
      const stored = await AsyncStorage.getItem('reminders');
      if (stored) {
        const reminders = JSON.parse(stored);
        const updated = reminders.map((r: any) =>
          r.id === reminderId ? { ...r, status: 'taken' } : r
        );
        await AsyncStorage.setItem('reminders', JSON.stringify(updated));
      }

      // Remove from scheduled notifications
      await this.removeScheduledNotification(reminderId);

      // Cancel all repeat notifications for this reminder
      const repeatIntervals = [5, 10, 15];
      for (const interval of repeatIntervals) {
        const repeatId = `${reminderId}_repeat_${interval}`;
        try {
          await notifee.cancelNotification(repeatId);
          await this.removeScheduledNotification(repeatId);
        } catch (error) {
          // Ignore errors
        }
      }

      console.log(`Marked reminder ${reminderId} as taken and cancelled repeat notifications`);
    } catch (error) {
      console.error('Failed to handle take action:', error);
    }
  }

  private async handleSnoozeAction(notification: any): Promise<void> {
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
      await this.cancelNotification(reminderId);

      // Schedule new notification at the new time
      await this.scheduleNotification({
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

  private async handleSkipAction(reminderId: string): Promise<void> {
    try {
      // Get current reminders
      const stored = await AsyncStorage.getItem('reminders');
      if (stored) {
        const reminders = JSON.parse(stored);
        const updated = reminders.map((r: any) =>
          r.id === reminderId ? { ...r, status: 'missed' } : r
        );
        await AsyncStorage.setItem('reminders', JSON.stringify(updated));
      }

      // Remove from scheduled notifications
      await this.removeScheduledNotification(reminderId);

      // Cancel all repeat notifications for this reminder
      const repeatIntervals = [5, 10, 15];
      for (const interval of repeatIntervals) {
        const repeatId = `${reminderId}_repeat_${interval}`;
        try {
          await notifee.cancelNotification(repeatId);
          await this.removeScheduledNotification(repeatId);
        } catch (error) {
          // Ignore errors
        }
      }

      console.log(`Marked reminder ${reminderId} as skipped and cancelled repeat notifications`);
    } catch (error) {
      console.error('Failed to handle skip action:', error);
    }
  }

  private async getScheduledNotifications(): Promise<ScheduledNotification[]> {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Failed to get scheduled notifications:', error);
      return [];
    }
  }

  private async saveScheduledNotification(
    notification: ScheduledNotification
  ): Promise<void> {
    try {
      const scheduled = await this.getScheduledNotifications();

      // Remove old entry if exists
      const filtered = scheduled.filter(
        n => n.reminderId !== notification.reminderId
      );

      // Add new entry
      filtered.push(notification);

      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    } catch (error) {
      console.error('Failed to save scheduled notification:', error);
    }
  }

  private async saveAllScheduledNotifications(
    notifications: ScheduledNotification[]
  ): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(notifications));
    } catch (error) {
      console.error('Failed to save all scheduled notifications:', error);
    }
  }

  private async removeScheduledNotification(reminderId: string): Promise<void> {
    try {
      const scheduled = await this.getScheduledNotifications();
      const filtered = scheduled.filter(n => n.reminderId !== reminderId);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    } catch (error) {
      console.error('Failed to remove scheduled notification:', error);
    }
  }
}

// Export singleton instance
export default NotificationManager.getInstance();
