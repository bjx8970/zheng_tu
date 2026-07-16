// tests/setup/jest.unit.ts

jest.mock('zustand', () => ({
  create: () => (fn: any) => {
    let storeState: any = {};
    const set: any = (partial: any, replace?: boolean) => {
      if (typeof partial === 'function') {
        storeState = replace ? partial(storeState) : { ...storeState, ...partial(storeState) };
      } else {
        storeState = replace ? partial : { ...storeState, ...partial };
      }
    };
    const get = () => storeState;
    const api = {};
    const result = fn(set, get, api);
    storeState = { ...storeState, ...result };
    const store: any = (selector?: any) => selector ? selector(storeState) : storeState;
    store.setState = set;
    store.getState = get;
    return store;
  },
}));

jest.mock('zustand/middleware', () => ({
  devtools: (fn: any, _opts?: any) => fn,
  persist: (fn: any, _opts?: any) => fn,
  createJSONStorage: () => ({
    getItem: jest.fn(() => null),
    setItem: jest.fn(),
    removeItem: jest.fn(),
  }),
}));

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn(), replace: jest.fn() }),
  useLocalSearchParams: () => ({}),
  Stack: { Screen: ({ children }: any) => children },
  Tabs: { Screen: ({ children }: any) => children },
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  SafeAreaProvider: ({ children }: any) => children,
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: jest.fn().mockResolvedValue(null),
    setItem: jest.fn().mockResolvedValue(undefined),
    removeItem: jest.fn().mockResolvedValue(undefined),
  },
}));

(globalThis as any).testUtils = {
  waitFor: (ms: number) => new Promise(r => setTimeout(r, ms)),
  mockRandom: (value: number) => {
    const original = Math.random;
    Math.random = jest.fn().mockReturnValue(value);
    return () => { Math.random = original; };
  },
};