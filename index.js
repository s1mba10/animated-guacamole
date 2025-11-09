/**
 * @format
 */

import { AppRegistry } from 'react-native';
import notifee, { EventType } from '@notifee/react-native';
import App from './App';
import { name as appName } from './app.json';
import {
  handleTakeAction,
  handleSnoozeAction,
  handleSkipAction,
} from './src/services/notificationHandlers';

/**
 * Register headless background event handler
 * This runs even when the app is completely killed/closed
 * IMPORTANT: Must be registered before AppRegistry.registerComponent
 */
notifee.onBackgroundEvent(async ({ type, detail }) => {
  const { notification, pressAction } = detail;

  if (!notification || !pressAction) {
    return;
  }

  const reminderId = notification.data?.reminderId;

  if (!reminderId) {
    console.warn('No reminderId found in notification data');
    return;
  }

  console.log(`Background event: type=${type}, action=${pressAction.id}, reminderId=${reminderId}`);

  // Handle notification actions
  switch (pressAction.id) {
    case 'take':
      // Update reminder status to 'taken'
      await handleTakeAction(reminderId);
      // Cancel the notification
      await notifee.cancelNotification(notification.id);
      break;

    case 'snooze':
      // Reschedule notification for 15 minutes later
      await handleSnoozeAction(notification);
      // Cancel the current notification
      await notifee.cancelNotification(notification.id);
      break;

    case 'skip':
      // Update reminder status to 'missed'
      await handleSkipAction(reminderId);
      // Cancel the notification
      await notifee.cancelNotification(notification.id);
      break;

    default:
      console.log(`Unknown action: ${pressAction.id}`);
  }
});

// Register main application
AppRegistry.registerComponent(appName, () => App);
