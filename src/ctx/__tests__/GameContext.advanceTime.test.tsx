import { renderHook, act } from '@testing-library/react-native';
import { GameProvider, useGame } from '@/ctx/GameContext';
import { createMockSave } from '@/test/factories';

async function renderGameProvider() {
  return renderHook(() => useGame(), {
    wrapper: ({ children }) => <GameProvider>{children}</GameProvider>,
  });
}

describe('advanceTime — isAdvancingRef lock (B2 regression)', () => {
  it('正常执行后 can advance again', async () => {
    const { result } = await renderGameProvider();
    await act(async () => { await new Promise(r => setTimeout(r, 100)); });
    await act(async () => { await result.current.advanceTime(); });
    await act(async () => { await expect(result.current.advanceTime()).resolves.toBeUndefined(); });
  });
});

describe('advanceTime — no save guard', () => {
  it('save 为 null 时 advanceTime 不抛出异常', async () => {
    const { result } = await renderGameProvider();
    await act(async () => { await result.current.advanceTime(); });
    expect(result.current.save).toBeNull();
  });
});
