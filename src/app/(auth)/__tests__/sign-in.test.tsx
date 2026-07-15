import React from 'react';
import { render, fireEvent, act, screen } from '@testing-library/react';
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
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('网络异常时 loading 被重置（不会永久锁定）', async () => {
    (supabase.auth.signInWithPassword as jest.Mock).mockRejectedValue(new Error('Network error'));
    render(<SignInScreen />);
    const emailInput = screen.getByPlaceholderText('请输入账号');
    const passwordInput = screen.getByPlaceholderText('请输入密码');
    const loginButton = screen.getByText('登录');

    await act(async () => {
      fireEvent.changeText(emailInput, 'testuser');
      fireEvent.changeText(passwordInput, 'password123');
      fireEvent.press(loginButton);
    });

    // 等待异步操作完成
    await act(async () => { await new Promise(r => setTimeout(r, 50)); });
    // 按钮应重新启用（loading 已重置）
    expect(screen.getByText('登录')).not.toBeDisabled();
  });

  it('密码错误时显示错误信息', async () => {
    (supabase.auth.signInWithPassword as jest.Mock).mockResolvedValue({
      data: { session: null },
      error: { message: '账号或密码错误' },
    });
    render(<SignInScreen />);
    const emailInput = screen.getByPlaceholderText('请输入账号');
    const passwordInput = screen.getByPlaceholderText('请输入密码');
    const loginButton = screen.getByText('登录');

    await act(async () => {
      fireEvent.changeText(emailInput, 'testuser');
      fireEvent.changeText(passwordInput, 'wrongpassword');
      fireEvent.press(loginButton);
    });

    await act(async () => { await new Promise(r => setTimeout(r, 50)); });
    expect(screen.queryByText('账号或密码错误')).not.toBeNull();
  });

  it('空输入时显示验证错误', async () => {
    render(<SignInScreen />);
    const loginButton = screen.getByText('登录');
    await act(async () => { fireEvent.press(loginButton); });
    expect(screen.queryByText('请输入密码')).not.toBeNull();
  });
});
