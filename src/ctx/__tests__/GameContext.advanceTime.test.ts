import { renderHook, act } from '@testing-library/react';
import { GameProvider, useGame } from '@/ctx/GameContext';
import { createMockSave } from '@/test/factories';

function renderGameProvider() {
  return renderHook(() => useGame(), {
    wrapper: ({ children }) => <GameProvider>{children}</GameProvider>,
  });
}

describe('advanceTime — isAdvancingRef lock (B2 regression)', () => {
  it('正常执行后 can advance again', async () => {
    const { result } = renderGameProvider();
    // 等待初始加载完成
    await act(async () => { await new Promise(r => setTimeout(r, 100)); });
    // advanceTime 在没有 save 时应直接返回，不锁定
    await act(async () => { await result.current.advanceTime(); });
    // 再次调用不应被锁定
    await act(async () => { await expect(result.current.advanceTime()).resolves.toBeUndefined(); });
  });
});

describe('advanceTime — no save guard', () => {
  it('save 为 null 时 advanceTime 不抛出异常', async () => {
    const { result } = renderGameProvider();
    await act(async () => { await result.current.advanceTime(); });
    expect(result.current.save).toBeNull();
  });
});
