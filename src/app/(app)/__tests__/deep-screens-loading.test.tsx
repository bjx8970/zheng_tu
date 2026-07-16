import React from 'react';
import { render } from '@testing-library/react-native';

import AdminDeep from '../admin-deep';
import DisciplineDeep from '../discipline-deep';
import PartyDeep from '../party-deep';
import LeagueDeep from '../league-deep';

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

jest.mock('@/lib/rankTheme', () => ({
  getRankThemeWithLine: jest.fn(() => ({ primary: '#FFB800', pageBg: '#F5F4F1' })),
}));

jest.mock('@/lib/deepActions/useDeepAction', () => ({
  useDeepAction: jest.fn(),
  fmtGovFund: jest.fn(() => ''),
}));

const { useGame } = require('@/ctx/GameContext');
const { useDeepAction } = require('@/lib/deepActions/useDeepAction');

function mockDeepActionNoSave() {
  (useDeepAction as jest.Mock).mockReturnValue({
    save: null,
    acting: null,
    savedResults: {},
    balance: 0,
    rank: 1,
    actionCost: () => 100,
    isCool: () => false,
    cdLeft: () => 0,
    handleAction: jest.fn(),
  });
}

function mockGameNoSave() {
  (useGame as jest.Mock).mockReturnValue({
    save: null,
    isLoading: false,
    updateGameSave: jest.fn(),
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  mockGameNoSave();
});

describe('deep screens — save=null loading state', () => {
  it('admin-deep save=null → 渲染 ActivityIndicator', async () => {
    mockDeepActionNoSave();
    const { getByTestId } = await render(<AdminDeep />);
    expect(getByTestId('activity-indicator')).toBeTruthy();
  });

  it('admin-deep save=null → 不崩溃或 null', async () => {
    mockDeepActionNoSave();
    const { toJSON } = await render(<AdminDeep />);
    expect(toJSON()).not.toBeNull();
  });

  it('discipline-deep save=null → 渲染 ActivityIndicator', async () => {
    mockDeepActionNoSave();
    const { getByTestId } = await render(<DisciplineDeep />);
    expect(getByTestId('activity-indicator')).toBeTruthy();
  });

  it('discipline-deep save=null → 不崩溃或 null', async () => {
    mockDeepActionNoSave();
    const { toJSON } = await render(<DisciplineDeep />);
    expect(toJSON()).not.toBeNull();
  });

  it('party-deep save=null → 渲染 ActivityIndicator', async () => {
    mockDeepActionNoSave();
    const { getByTestId } = await render(<PartyDeep />);
    expect(getByTestId('activity-indicator')).toBeTruthy();
  });

  it('party-deep save=null → 不崩溃或 null', async () => {
    mockDeepActionNoSave();
    const { toJSON } = await render(<PartyDeep />);
    expect(toJSON()).not.toBeNull();
  });

  it('league-deep save=null → 渲染 ActivityIndicator', async () => {
    mockDeepActionNoSave();
    const { getByTestId } = await render(<LeagueDeep />);
    expect(getByTestId('activity-indicator')).toBeTruthy();
  });

  it('league-deep save=null → 不崩溃或 null', async () => {
    mockDeepActionNoSave();
    const { toJSON } = await render(<LeagueDeep />);
    expect(toJSON()).not.toBeNull();
  });
});
