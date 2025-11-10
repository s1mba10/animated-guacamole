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
import {
  handleTakeAction,
  handleSnoozeAction,
  handleSkipAction,
} from './notificationHandlers';
import { logNotification } from '../config/debug';
import { REPEAT_NOTIFICATION_INTERVALS, MAX_SNOOZE_COUNT } from '../constants/reminder';

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
    // Schedule follow-up notifications at configured intervals
    const snoozeCount = (schedule.data?.snoozeCount as number) || 0;

    for (const intervalMinutes of REPEAT_NOTIFICATION_INTERVALS) {
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
              largeIcon: require('../../assets/app_icon.png'),
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

        logNotification(`Scheduled repeat notification ${repeatId} for ${intervalMinutes} minutes after original`);
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
            largeIcon: require('../../assets/app_icon.png'),
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

      logNotification(`Scheduled notification ${notificationId} for reminder ${schedule.reminderId} at ${schedule.date.toISOString()}`);
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

        logNotification(`Cancelled notification for reminder ${reminderId}`);
      }

      // Also cancel all repeat notifications for this reminder
      for (const interval of REPEAT_NOTIFICATION_INTERVALS) {
        const repeatId = `${reminderId}_repeat_${interval}`;
        try {
          await notifee.cancelNotification(repeatId);
          await this.removeScheduledNotification(repeatId);
          logNotification(`Cancelled repeat notification ${repeatId}`);
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

        logNotification(`Cancelled ${notificationIds.length} notifications`);
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
      logNotification('Cancelled all notifications');
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
      logNotification('Restoring notifications...');

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

      logNotification(`Restored ${restoredCount} notifications`);
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
        logNotification(`Cleaned up ${scheduled.length - future.length} old notifications`);
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
        // Android will use the app icon by default
      },
    ];

    // Only show snooze button if not snoozed MAX_SNOOZE_COUNT times already
    if (snoozeCount < MAX_SNOOZE_COUNT) {
      actions.push({
        title: 'Отложить (15 мин)',
        pressAction: { id: 'snooze' },
        // Android will use the app icon by default
      });
    }

    actions.push({
      title: 'Пропустить',
      pressAction: { id: 'skip' },
      // Android will use the app icon by default
    });

    return actions;
  }

  private setupEventHandlers(): void {
    // Handle foreground notification events
    // Note: Background events are now handled in index.js for headless support
    notifee.onForegroundEvent(async ({ type, detail }) => {
      if (type === EventType.ACTION_PRESS) {
        const { notification, pressAction } = detail;

        if (!notification || !pressAction) {
          return;
        }

        const reminderId = notification.data?.reminderId as string;

        if (!reminderId) {
          console.warn('No reminderId found in notification data');
          return;
        }

        logNotification(`Foreground event: action=${pressAction.id}, reminderId=${reminderId}`);

        // Use standalone handlers for consistency
        switch (pressAction.id) {
          case 'take':
            await handleTakeAction(reminderId);
            // Cancel the notification
            await notifee.cancelNotification(notification.id || '');
            break;

          case 'snooze':
            await handleSnoozeAction(notification);
            // Cancel the current notification
            await notifee.cancelNotification(notification.id || '');
            break;

          case 'skip':
            await handleSkipAction(reminderId);
            // Cancel the notification
            await notifee.cancelNotification(notification.id || '');
            break;
        }
      }
    });
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
const notificationManagerInstance = NotificationManager.getInstance();
export default notificationManagerInstance;

// Export the scheduleNotification method for use in notificationHandlers
export const scheduleNotification = (schedule: NotificationSchedule) =>
  notificationManagerInstance.scheduleNotification(schedule);
