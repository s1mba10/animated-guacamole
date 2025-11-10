import { Reminder } from '../types';
import { REMINDER_TIMEOUT_MS } from '../constants/reminder';

/**
 * Apply status rules to reminders based on current time
 * - If reminder is already 'taken' or 'missed', keep the status
 * - If reminder is pending and 15+ minutes past due time, mark as 'missed'
 * - Otherwise, keep as 'pending'
 */
export const applyStatusRules = (items: Reminder[]): Reminder[] => {
  const now = Date.now();
  return items.map((r) => {
    if (r.status === 'taken' || r.status === 'missed') {
      return r;
    }
    const due = new Date(`${r.date}T${r.time}`);
    return now >= due.getTime() + REMINDER_TIMEOUT_MS
      ? { ...r, status: 'missed' }
      : { ...r, status: 'pending' };
  });
};
