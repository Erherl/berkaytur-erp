import { APP_CONFIG } from '../../config/appConfig';

/**
 * Interface defining Storage Repository interactions
 */
export interface IStorageAdapter {
  getItem<T>(key: string, defaultValue: T): T;
  setItem(key: string, value: any): void;
  removeItem(key: string): void;
  clearNamespace(): void;
}

/**
 * Type-safe, try-catch shielded LocalStorage Adapter
 */
export class LocalStorageAdapter implements IStorageAdapter {
  private prefix: string;

  constructor(prefix: string = APP_CONFIG.STORAGE_PREFIX) {
    this.prefix = prefix;
  }

  private getPrefixedKey(key: string): string {
    return key.startsWith(this.prefix) ? key : `${this.prefix}${key}`;
  }

  /**
   * Safely retrieves an item from LocalStorage or returns defaultValue if not found or corrupted
   */
  public getItem<T>(key: string, defaultValue: T): T {
    try {
      const prefixedKey = this.getPrefixedKey(key);
      const item = localStorage.getItem(prefixedKey);
      if (item === null) {
        return defaultValue;
      }
      return JSON.parse(item) as T;
    } catch (error) {
      console.warn(`LocalStorage read error for key: ${key}. Returning default.`, error);
      return defaultValue;
    }
  }

  /**
   * Safely serializes and saves an item into LocalStorage
   */
  public setItem(key: string, value: any): void {
    try {
      const prefixedKey = this.getPrefixedKey(key);
      localStorage.setItem(prefixedKey, JSON.stringify(value));
    } catch (error) {
      console.error(`LocalStorage write error for key: ${key}`, error);
    }
  }

  /**
   * Removes an item from LocalStorage
   */
  public removeItem(key: string): void {
    try {
      const prefixedKey = this.getPrefixedKey(key);
      localStorage.removeItem(prefixedKey);
    } catch (error) {
      console.error(`LocalStorage delete error for key: ${key}`, error);
    }
  }

  /**
   * Clears all keys belonging to this application's namespace
   */
  public clearNamespace(): void {
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(this.prefix)) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key));
    } catch (error) {
      console.error('LocalStorage namespace clearing failed', error);
    }
  }
}

// Single export of persistent storage engine
export const storage = new LocalStorageAdapter();
