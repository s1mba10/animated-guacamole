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
          vibrationPattern: [300, 500],
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
      };

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
            actions: this.createNotificationActions(),
            autoCancel: true,
            sound: 'default',
            vibrationPattern: [300, 500],
            smallIcon: 'ic_launcher',
            color: '#4A90E2',
            showTimestamp: true,
            timestamp: schedule.date.getTime(),
          },
          ios: {
            sound: 'default',
            categoryId: 'medication-reminder',
          },
          data: {
            reminderId: schedule.reminderId,
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
        // Cancel the notification
        await notifee.cancelNotification(notification.notificationId);

        // Remove from storage
        await this.removeScheduledNotification(reminderId);

        console.log(`Cancelled notification for reminder ${reminderId}`);
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
        await notifee.cancelNotifications(notificationIds);

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

  private createNotificationActions(): AndroidAction[] {
    return [
      {
        title: 'Принял',
        pressAction: { id: 'take' },
        icon: 'https://my-cdn.com/icons/check.png',
      },
      {
        title: 'Отложить (15 мин)',
        pressAction: { id: 'snooze' },
        icon: 'https://my-cdn.com/icons/snooze.png',
      },
      {
        title: 'Пропустить',
        pressAction: { id: 'skip' },
        icon: 'https://my-cdn.com/icons/close.png',
      },
    ];
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

      console.log(`Marked reminder ${reminderId} as taken`);
    } catch (error) {
      console.error('Failed to handle take action:', error);
    }
  }

  private async handleSnoozeAction(notification: any): Promise<void> {
    try {
      const reminderId = notification.data?.reminderId as string;
      const snoozeTime = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

      // Cancel current notification
      await this.cancelNotification(reminderId);

      // Schedule new notification
      await this.scheduleNotification({
        reminderId: `${reminderId}_snooze`,
        title: notification.title || 'Напоминание',
        body: notification.body || 'Время принять лекарство',
        date: snoozeTime,
        data: notification.data,
      });

      console.log(`Snoozed reminder ${reminderId} for 15 minutes`);
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

      console.log(`Marked reminder ${reminderId} as skipped`);
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
