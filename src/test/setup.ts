import React from 'react';
import '@testing-library/react-native/matchers';

if (typeof global.setImmediate === 'undefined') {
  global.setImmediate = (cb: () => void) => setTimeout(cb, 0);
}
if (typeof global.clearImmediate === 'undefined') {
  global.clearImmediate = (id: unknown) => clearTimeout(id as number);
}

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

jest.mock('@/client/supabase', () => ({
  supabase: {
    auth: {
      getSession: jest.fn().mockResolvedValue({ data: { session: null } }),
      getUser: jest.fn().mockResolvedValue({ data: { user: null } }),
      onAuthStateChange: jest.fn(() => ({ data: { subscription: { unsubscribe: jest.fn() } } })),
      signInWithPassword: jest.fn(),
      signUp: jest.fn(),
      signOut: jest.fn(),
      refreshSession: jest.fn(),
    },
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
    })),
  },
}));

jest.mock('expo-audio', () => ({
  useAudioPlayer: jest.fn(() => ({ seekTo: jest.fn(), play: jest.fn() })),
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
  },
}));

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

jest.mock('react-native-gesture-handler', () => ({
  GestureHandlerRootView: 'GestureHandlerRootView',
}));

jest.mock('react-native-css-interop/src/runtime/third-party-libs/react-native-safe-area-context', () => ({
  maybeHijackSafeAreaProvider: (type: unknown) => type,
}));

jest.mock('@/lib/cooldownCache', () => ({
  saveCooldownCache: jest.fn(),
  loadCooldownCache: jest.fn().mockResolvedValue({}),
  enqueueOfflineOp: jest.fn(),
  loadOfflineQueue: jest.fn().mockResolvedValue([]),
  clearOfflineQueue: jest.fn(),
  applyLocalCachePatch: jest.fn((data) => data),
}));
