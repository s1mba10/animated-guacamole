import { Reminder } from '../types';

export type RootStackParamList = {
  Main:
    | {
        updatedReminder?: Reminder;
        newReminder?: Reminder;
        newReminders?: Reminder[];
        forceRefresh?: number;
      }
    | undefined;
  ReminderEdit: {
    reminder: Reminder;
    mainKey?: string;
  };
  ReminderAdd: {
    selectedDate?: string;
    mainKey?: string;
    course?: import('../types').MedicationCourse;
  };
  Profile: undefined;
  Medications: undefined;
};