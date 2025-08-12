import notifee, {
  TimestampTrigger,
  TriggerType,
  AndroidImportance,
} from '@notifee/react-native';

export interface ReminderNotification {
  title: string;
  body: string;
  date: Date;
}

export async function reminderNotification({ title, body, date }: ReminderNotification) {
  try {
    await notifee.requestPermission();
    const channelId = await notifee.createChannel({
      id: 'default',
      name: 'Default',
      importance: AndroidImportance.HIGH,
    });
    const trigger: TimestampTrigger = {
      type: TriggerType.TIMESTAMP,
      timestamp: date.getTime(),
    };
    await notifee.createTriggerNotification(
      {
        title,
        body,
        android: { channelId },
      },
      trigger,
    );
  } catch (e) {
    console.warn('Failed to schedule notification', e);
  }
}
