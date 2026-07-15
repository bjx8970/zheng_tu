// tests/setup/jest.unit.ts
import '@testing-library/jest-native';

// Mock react-native modules
jest.mock('react-native-reanimated', () => {
  const Reanimated = require('react-native-reanimated/mock');
  Reanimated.default.call = () => {};
  return Reanimated;
});

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
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(undefined),
  removeItem: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('zustand', () => ({
  create: (fn: any) => {
    let state = fn(
      (partial: any) => { state = { ...state, ...partial }; },
      () => state,
      {}
    );
    return (selector: any) => selector(state);
  },
}));

jest.mock('zustand/middleware', () => ({
  devtools: (fn: any) => fn,
  persist: (fn: any) => fn,
  createJSONStorage: () => ({
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
  }),
}));

// 全局测试工具
global.testUtils = {
  waitFor: (ms: number) => new Promise(r => setTimeout(r, ms)),
  mockRandom: (value: number) => {
    const original = Math.random;
    Math.random = jest.fn().mockReturnValue(value);
    return () => { Math.random = original; };
  },
};

// 扩展 Jest 匹配器
expect.extend({
  toBeWithinRange(received: number, min: number, max: number) {
    const pass = received >= min && received <= max;
    return {
      pass,
      message: () => `expected ${received} ${pass ? 'not ' : ''}to be within ${min}-${max}`,
    };
  },
});

declare global {
  namespace jest {
    interface Matchers<R> {
      toBeWithinRange(min: number, max: number): R;
    }
  }
  var testUtils: {
    waitFor: (ms: number) => Promise<void>;
    mockRandom: (value: number) => () => void;
  };
}