import { StateCreator, StoreApi, UseBoundStore } from 'zustand';

export type StoreSlice<T> = StateCreator<T, [], [], Partial<T>>;

export function createStore<T extends object>(
  slices: Array<StoreSlice<T>>,
  options?: {
    name?: string;
    persist?: boolean;
    partialize?: (state: T) => Partial<T>;
  }
): UseBoundStore<StoreApi<T>> {
  const { create } = require('zustand');
  const { devtools } = require('zustand/middleware');
  const { persist } = require('zustand/middleware');

  let creator: StateCreator<T> = (set, get, api) => {
    const merged: T = {} as T;
    for (const slice of slices) {
      Object.assign(merged, slice(set, get, api));
    }
    return merged;
  };

  if (options?.persist) {
    const { persist: persistMiddleware } = require('zustand/middleware');
    creator = persistMiddleware(creator, {
      name: options.name || 'zhengtu-store',
      partialize: options.partialize || (() => ({})),
      version: 1,
      migrate: (persistedState: any, version: number) => {
        if (version === 0) {
          return { ...persistedState, _migrated: true };
        }
        return persistedState;
      },
    });
  }

  if (process.env.NODE_ENV !== 'production' && options?.name) {
    const { devtools: devtoolsMiddleware } = require('zustand/middleware');
    creator = devtoolsMiddleware(creator, { name: options.name });
  }

  return create(creator) as UseBoundStore<StoreApi<T>>;
}

export function createSelectors<T>(store: UseBoundStore<StoreApi<T>>) {
  return {
    ...store,
    use: {
      ...store,
      select: <K extends keyof T>(selector: (state: T) => K) => store(selector),
    },
  };
}

export function createHook<T>(store: UseBoundStore<StoreApi<T>>, selector: (state: T) => any) {
  return () => store(selector);
}