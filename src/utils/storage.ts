import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Storage manager with in-memory caching for better performance
 */
class StorageManager {
  private cache = new Map<string, any>();
  private pendingWrites = new Map<string, Promise<void>>();

  /**
   * Get a value from storage with caching
   */
  async get<T>(key: string): Promise<T | null> {
    // Return from cache if available
    if (this.cache.has(key)) {
      return this.cache.get(key);
    }

    try {
      const value = await AsyncStorage.getItem(key);
      if (value) {
        const parsed = JSON.parse(value);
        this.cache.set(key, parsed);
        return parsed;
      }
      return null;
    } catch (error) {
      console.error(`Failed to get ${key} from storage:`, error);
      return null;
    }
  }

  /**
   * Set a value in storage with caching
   */
  async set(key: string, value: any): Promise<void> {
    // Wait for any pending write to complete
    if (this.pendingWrites.has(key)) {
      await this.pendingWrites.get(key);
    }

    // Start new write operation
    const writeOperation = (async () => {
      try {
        this.cache.set(key, value);
        await AsyncStorage.setItem(key, JSON.stringify(value));
      } catch (error) {
        console.error(`Failed to set ${key} in storage:`, error);
        throw error;
      } finally {
        this.pendingWrites.delete(key);
      }
    })();

    this.pendingWrites.set(key, writeOperation);
    await writeOperation;
  }

  /**
   * Remove a value from storage and cache
   */
  async remove(key: string): Promise<void> {
    try {
      this.cache.delete(key);
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.error(`Failed to remove ${key} from storage:`, error);
    }
  }

  /**
   * Invalidate cache for a specific key
   */
  invalidate(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Clear all cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get multiple values at once
   */
  async getMultiple<T>(keys: string[]): Promise<Map<string, T | null>> {
    const results = new Map<string, T | null>();

    await Promise.all(
      keys.map(async (key) => {
        const value = await this.get<T>(key);
        results.set(key, value);
      })
    );

    return results;
  }
}

// Export singleton instance
export const storage = new StorageManager();
