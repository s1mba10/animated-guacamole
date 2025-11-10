/**
 * Constants for reminder and notification functionality
 */

// Reminder timeout settings
export const REMINDER_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes
export const REMINDER_TIMEOUT_MINUTES = 15;

// Snooze settings
export const MAX_SNOOZE_COUNT = 3;
export const SNOOZE_DURATION_MS = 15 * 60 * 1000; // 15 minutes
export const SNOOZE_DURATION_MINUTES = 15;

// Notification repeat intervals (in minutes)
export const REPEAT_NOTIFICATION_INTERVALS = [5, 10, 15];

// Auto-update interval for status checks (in milliseconds)
export const STATUS_UPDATE_INTERVAL_MS = 60 * 1000; // 1 minute

// Debounce delay for saving reminders
export const SAVE_DEBOUNCE_DELAY_MS = 300; // 300ms
