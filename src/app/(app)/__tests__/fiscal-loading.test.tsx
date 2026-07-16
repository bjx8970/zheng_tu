import React from 'react';
import { render } from '@testing-library/react-native';
import FiscalScreen from '../fiscal';

jest.mock('react-native-reanimated', () => {
  const AnimatedView = ({ children, ...props }: any) => <>{children}</>;
  return {
    __esModule: true,
    default: { View: AnimatedView, Text: AnimatedView, Image: AnimatedView, ScrollView: AnimatedView },
    View: AnimatedView, Text: AnimatedView, Image: AnimatedView, ScrollView: AnimatedView,
    useSharedValue: jest.fn(() => ({ value: 0 })),
    useAnimatedStyle: jest.fn(() => ({})),
    withTiming: jest.fn(() => 0),
    withSpring: jest.fn(() => 0),
    withSequence: jest.fn(() => 0),
    withRepeat: jest.fn(() => 0),
    withDelay: jest.fn(() => 0),
    Easing: { in: jest.fn(), out: jest.fn(), inOut: jest.fn(), linear: jest.fn() },
    runOnJS: jest.fn((fn: (...args: unknown[]) => unknown) => fn),
    createAnimatedComponent: (comp: React.ComponentType) => comp,
    FadeInDown: { duration: jest.fn(() => ({ springify: jest.fn(() => ({ delay: jest.fn() })) })) },
    FadeIn: { duration: jest.fn(() => ({})) },
    ZoomIn: { duration: jest.fn(() => ({ springify: jest.fn(() => ({ damping: jest.fn(() => ({})) })) })) },
    FadeOut: { duration: jest.fn(() => ({})) },
  };
});

jest.mock('@/ctx/GameContext', () => {
  const React = require('react');
  return {
    useGame: jest.fn(),
    GameProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  };
});

jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), replace: jest.fn() }),
  useFocusEffect: jest.fn(),
  Stack: { Screen: 'StackScreen' },
  Redirect: ({ href }: { href: string }) => null,
}));

jest.mock('expo-status-bar', () => ({ StatusBar: () => null }));

jest.mock('@/db/gameApi', () => ({
  getFiscalSummary: jest.fn().mockResolvedValue(null),
}));

const { useGame } = require('@/ctx/GameContext');

describe('FiscalScreen — save=null loading state', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('save=null → 渲染 ActivityIndicator', () => {
    (useGame as jest.Mock).mockReturnValue({
      save: null,
      isLoading: false,
    });
    const { getByTestId } = render(<FiscalScreen />);
    expect(getByTestId('activity-indicator')).toBeTruthy();
  });

  it('save=null → 不崩溃或返回 null', () => {
    (useGame as jest.Mock).mockReturnValue({
      save: null,
      isLoading: false,
    });
    const { toJSON } = render(<FiscalScreen />);
    expect(toJSON()).not.toBeNull();
  });
});
