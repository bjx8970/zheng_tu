import React from 'react';
import { render, fireEvent, waitFor, cleanup, act } from '@testing-library/react-native';
import { supabase } from '@/client/supabase';
import SignInScreen from '@/app/(auth)/sign-in';

jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: jest.fn(), push: jest.fn(), back: jest.fn() }),
  useFocusEffect: jest.fn(),
  Stack: { Screen: 'StackScreen' },
}));

jest.mock('@/ctx', () => ({
  useSession: jest.fn(() => ({ session: null, isLoading: false })),
}));

describe('SignInScreen', () => {
  beforeEach(async () => {
    await cleanup();
    jest.clearAllMocks();
  });

  it('空输入时显示验证错误', async () => {
    const { getByText, queryByText } = await render(<SignInScreen />);

    await waitFor(() => {
      expect(getByText('登  录')).toBeTruthy();
    });
    const loginButton = getByText('登  录');
    await fireEvent.press(loginButton);
    await act(async () => {});
    expect(queryByText('请输入用户名')).not.toBeNull();
  });

  it('密码错误时显示错误信息', async () => {
    (supabase.auth.signInWithPassword as jest.Mock).mockResolvedValue({
      data: { session: null },
      error: { message: '账号或密码错误' },
    });
    const { getByPlaceholderText, getByText, queryByText } = await render(<SignInScreen />);

    await waitFor(() => {
      expect(getByPlaceholderText('请输入用户名')).toBeTruthy();
    });
    const emailInput = getByPlaceholderText('请输入用户名');
    const passwordInput = getByPlaceholderText('请输入密码');
    const loginButton = getByText('登  录');

    await fireEvent.changeText(emailInput, 'testuser');
    await fireEvent.changeText(passwordInput, 'wrongpassword');
    await fireEvent.press(loginButton);
    await act(async () => {});
    expect(queryByText(/账号或密码错误/)).not.toBeNull();
  });

  it('网络异常时 loading 被重置（不会永久锁定）', async () => {
    (supabase.auth.signInWithPassword as jest.Mock).mockRejectedValue(new Error('Network error'));
    const { getByPlaceholderText, getByText, queryByText } = await render(<SignInScreen />);
    await waitFor(() => {
      expect(getByPlaceholderText('请输入用户名')).toBeTruthy();
    });
    const emailInput = getByPlaceholderText('请输入用户名');
    const passwordInput = getByPlaceholderText('请输入密码');
    const loginButton = getByText('登  录');

    await fireEvent.changeText(emailInput, 'testuser');
    await fireEvent.changeText(passwordInput, 'password123');
    await fireEvent.press(loginButton);
    await act(async () => {});
    expect(queryByText('网络异常，请稍后重试')).not.toBeNull();
    expect(getByText('登  录')).not.toBeDisabled();
  });
});
