export type ReminderStatus = 'taken' | 'pending' | 'missed';

export type MedicationType = 'tablet' | 'capsule' | 'liquid' | 'injection' | 'other';
export type Reminder = {
  id: string;
  name: string;
  dosage: string;
  type: MedicationType;
  time: string;
  status: ReminderStatus;
  date: string; // YYYY-MM-DD format
  courseId?: number;
  snoozeCount?: number; // Track how many times this reminder was snoozed (max 3)
  originalTime?: string; // Store original time if snoozed (format: HH:mm)
  originalDate?: string; // Store original date if snoozed (format: YYYY-MM-DD)
};

export interface Medication {
  id: number;
  name: string;
  dosage: string;
  description: string;
  created_at: string;
}

export interface MedicationCourse {
  id: number;
  name: string;
  dosage: string;
  type: MedicationType;
  times: string[];
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  repeatPattern: 'once' | 'daily' | 'alternate' | 'weekdays';
  weekdays?: number[]; // 0-6
}

export interface ReminderResponse {
  id: number;
  medication_id: number;
  date: string;
  time: string;
  note: string;
  status: ReminderStatus;
}
