import { StateStorage } from 'zustand/middleware';

// AsyncStorage 适配器
export function createAsyncStorage(persistName: string): StateStorage {
  const AsyncStorage = require('@react-native-async-storage/async-storage').default;
  
  return {
    getItem: async (name: string) => {
      try {
        const value = await AsyncStorage.getItem(`${persistName}:${name}`);
        return value ?? null;
      } catch {
        return null;
      }
    },
    setItem: async (name: string, value: string) => {
      try {
        await AsyncStorage.setItem(`${persistName}:${name}`, value);
      } catch (e) {
        console.warn('[Persist] Failed to set item:', e);
      }
    },
    removeItem: async (name: string) => {
      try {
        await AsyncStorage.removeItem(`${persistName}:${name}`);
      } catch (e) {
        console.warn('[Persist] Failed to remove item:', e);
      }
    },
  };
}

// MMKV 适配器（更快，推荐生产环境）
export function createMMKVStorage(persistName: string): StateStorage {
  try {
    const { MMKV } = require('react-native-mmkv');
    const storage = new MMKV({ id: persistName });
    return {
      getItem: (name) => storage.getString(name) ?? null,
      setItem: (name, value) => storage.set(name, value),
      removeItem: (name) => storage.delete(name),
    };
  } catch {
    return createAsyncStorage(persistName);
  }
}

export function createPersistMiddleware<T>(
  storage: StateStorage,
  options?: { name?: string; partialize?: (state: T) => Partial<T>; version?: number }
) {
  return (config: any) => config;
}