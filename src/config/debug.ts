/**
 * Debug configuration
 */

// Enable debug logging in development mode
export const DEBUG_NOTIFICATIONS = __DEV__;
export const DEBUG_STORAGE = __DEV__;
export const DEBUG_NAVIGATION = __DEV__;

/**
 * Conditional logger for notifications
 */
export const logNotification = (...args: any[]) => {
  if (DEBUG_NOTIFICATIONS) {
    console.log('[NotificationManager]', ...args);
  }
};

/**
 * Conditional logger for storage operations
 */
export const logStorage = (...args: any[]) => {
  if (DEBUG_STORAGE) {
    console.log('[Storage]', ...args);
  }
};

/**
 * Conditional logger for navigation
 */
export const logNavigation = (...args: any[]) => {
  if (DEBUG_NAVIGATION) {
    console.log('[Navigation]', ...args);
  }
};
