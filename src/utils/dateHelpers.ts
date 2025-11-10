import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

/**
 * Format date in Russian locale (e.g., "15 января")
 */
export const formatDateRu = (iso: string): string =>
  format(new Date(iso), 'd MMMM', { locale: ru });

/**
 * Format date for display (e.g., "15-01-2024")
 */
export const formatDisplayDate = (iso: string): string =>
  format(new Date(iso), 'dd-MM-yyyy');

/**
 * Format time from Date object (e.g., "09:30")
 */
export const formatTimeFromDate = (date: Date): string =>
  `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;

/**
 * Parse date and time strings into a Date object
 */
export const parseDateTimeString = (date: string, time: string): Date => {
  const [hour, minute] = time.split(':').map(Number);
  const dateObj = new Date(date);
  dateObj.setHours(hour, minute, 0, 0);
  return dateObj;
};

/**
 * Format ISO date string to YYYY-MM-DD format
 */
export const formatISODate = (date: Date): string =>
  format(date, 'yyyy-MM-dd');
