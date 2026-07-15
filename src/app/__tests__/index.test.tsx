import React from 'react';
import { render } from '@testing-library/react';
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

const mockRouterReplace = jest.fn();
jest.mock('expo-router', () => ({
  Redirect: ({ href }: { href: string }) => {
    mockRouterReplace(href);
    return null;
  },
  useRouter: () => ({ replace: mockRouterReplace }),
  Stack: { Screen: 'StackScreen' },
  useFocusEffect: jest.fn(),
}));

describe('IndexScreen routing', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('session=null → 跳转 sign-in', () => {
    (useSession as jest.Mock).mockReturnValue({ session: null, isLoading: false });
    (useGame as jest.Mock).mockReturnValue({ save: null, isLoading: false });
    render(<IndexScreen />);
    expect(mockRouterReplace).toHaveBeenCalledWith('/(auth)/sign-in');
  });

  it('isLoading=true → 不跳转（显示加载）', () => {
    (useSession as jest.Mock).mockReturnValue({ session: null, isLoading: true });
    (useGame as jest.Mock).mockReturnValue({ save: null, isLoading: false });
    render(<IndexScreen />);
    expect(mockRouterReplace).not.toHaveBeenCalled();
  });

  it('session + isLoading=false + needsCharacterCreation → 跳转 character-create', () => {
    (useSession as jest.Mock).mockReturnValue({ session: { user: { id: '1' } }, isLoading: false });
    (useGame as jest.Mock).mockReturnValue({
      save: { needsCharacterCreation: true },
      isLoading: false,
    });
    render(<IndexScreen />);
    expect(mockRouterReplace).toHaveBeenCalledWith('/(app)/character-create');
  });

  it('session + isLoading=false + save=null → 跳转 sign-in（B5 regression）', () => {
    (useSession as jest.Mock).mockReturnValue({ session: { user: { id: '1' } }, isLoading: false });
    (useGame as jest.Mock).mockReturnValue({ save: null, isLoading: false });
    render(<IndexScreen />);
    expect(mockRouterReplace).toHaveBeenCalledWith('/(auth)/sign-in');
  });

  it('session + save=ready → 跳转 home', () => {
    (useSession as jest.Mock).mockReturnValue({ session: { user: { id: '1' } }, isLoading: false });
    (useGame as jest.Mock).mockReturnValue({
      save: { needsCharacterCreation: false },
      isLoading: false,
    });
    render(<IndexScreen />);
    expect(mockRouterReplace).toHaveBeenCalledWith('/(app)/home');
  });
});
