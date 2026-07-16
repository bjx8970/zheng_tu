import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ErrorBoundary } from '@/components/ErrorBoundary';

jest.mock('@sentry/react-native', () => ({
  captureException: jest.fn(),
}));

function Bomb({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) throw new Error('test error');
  return <>{'正常内容'}</>;
}

describe('ErrorBoundary', () => {
  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('正常渲染 children', () => {
    const { getByText } = render(
      <ErrorBoundary>
        <Bomb shouldThrow={false} />
      </ErrorBoundary>
    );
    expect(getByText('正常内容')).toBeTruthy();
  });

  it('子组件抛错后显示错误信息', () => {
    const { getByText } = render(
      <ErrorBoundary>
        <Bomb shouldThrow={true} />
      </ErrorBoundary>
    );
    expect(getByText('页面加载出错')).toBeTruthy();
    expect(getByText('test error')).toBeTruthy();
  });

  it('点击重试后恢复正常渲染', () => {
    const { getByText, rerender } = render(
      <ErrorBoundary>
        <Bomb shouldThrow={true} />
      </ErrorBoundary>
    );
    expect(getByText('页面加载出错')).toBeTruthy();

    fireEvent.press(getByText('重试'));

    rerender(
      <ErrorBoundary>
        <Bomb shouldThrow={false} />
      </ErrorBoundary>
    );
    expect(getByText('正常内容')).toBeTruthy();
  });

  it('未知错误显示默认文案', () => {
    function SilentBomb() {
      React.useEffect(() => {
        throw undefined as unknown as Error;
      }, []);
      return null;
    }

    const { getByText } = render(
      <ErrorBoundary>
        <SilentBomb />
      </ErrorBoundary>
    );
    expect(getByText('页面加载出错')).toBeTruthy();
    expect(getByText('发生了未知错误')).toBeTruthy();
  });
});
