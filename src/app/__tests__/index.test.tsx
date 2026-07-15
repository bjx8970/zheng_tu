import React from 'react';
import { render } from '@testing-library/react-native';
import IndexScreen from '@/app/index';
import { useSession } from '@/ctx';
import { useGame } from '@/ctx/GameContext';

jest.mock('@/ctx', () => ({
  useSession: jest.fn(),
  SessionProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock('@/ctx/GameContext', () => ({
  useGame: jest.fn(),
  GameProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock('expo-router', () => ({
  Redirect: 'Redirect',
  useRouter: () => ({ replace: jest.fn() }),
  Stack: { Screen: 'StackScreen' },
  useFocusEffect: jest.fn(),
}));

describe('IndexScreen routing', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('session=null → 不崩溃（路由由 Redirect 处理）', async () => {
    (useSession as jest.Mock).mockReturnValue({ session: null, isLoading: false });
    (useGame as jest.Mock).mockReturnValue({ save: null, isLoading: false });
    await render(<IndexScreen />);
  });

  it('isLoading=true → 不崩溃', async () => {
    (useSession as jest.Mock).mockReturnValue({ session: null, isLoading: true });
    (useGame as jest.Mock).mockReturnValue({ save: null, isLoading: false });
    await render(<IndexScreen />);
  });

  it('session + isLoading=false + needsCharacterCreation → 不崩溃', async () => {
    (useSession as jest.Mock).mockReturnValue({ session: { user: { id: '1' } }, isLoading: false });
    (useGame as jest.Mock).mockReturnValue({
      save: { needsCharacterCreation: true },
      isLoading: false,
    });
    await render(<IndexScreen />);
  });

  it('session + isLoading=false + save=null → 不崩溃（B5 regression）', async () => {
    (useSession as jest.Mock).mockReturnValue({ session: { user: { id: '1' } }, isLoading: false });
    (useGame as jest.Mock).mockReturnValue({ save: null, isLoading: false });
    await render(<IndexScreen />);
  });

  it('session + save=ready → 不崩溃', async () => {
    (useSession as jest.Mock).mockReturnValue({ session: { user: { id: '1' } }, isLoading: false });
    (useGame as jest.Mock).mockReturnValue({
      save: { needsCharacterCreation: false },
      isLoading: false,
    });
    await render(<IndexScreen />);
  });
});
