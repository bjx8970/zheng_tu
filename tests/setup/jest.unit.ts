// tests/setup/jest.unit.ts

jest.mock('zustand', () => {
  let storeState: any = {};
  const mockSet = (partial: any) => {
    if (typeof partial === 'function') {
      storeState = { ...storeState, ...partial(storeState) };
    } else {
      storeState = { ...storeState, ...partial };
    }
  };
  const mockGet = () => storeState;
  const mockApi = {};

  return {
    create: () => (fn: any) => {
      storeState = fn(mockSet, mockGet, mockApi);
      return (selector?: any) => selector ? selector(storeState) : mockGet();
    },
  };
});

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

global.testUtils = {
  waitFor: (ms: number) => new Promise(r => setTimeout(r, ms)),
  mockRandom: (value: number) => {
    const original = Math.random;
    Math.random = jest.fn().mockReturnValue(value);
    return () => { Math.random = original; };
  },
};