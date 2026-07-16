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

describe('advanceTime — cityGovFund 月度增量不覆盖用户扣款', () => {
  it('优先使用 saveRef.current.cityGovFund 叠加月度净增量', async () => {
    const { result } = await renderGameProvider();
    await act(async () => { await new Promise(r => setTimeout(r, 100)); });
    if (!result.current.save) return;

    await act(async () => {
      await result.current.updateGameSave({ cityGovFund: 300 });
    });
    const saveAfterDeduction = result.current.save;
    expect(saveAfterDeduction?.cityGovFund).toBe(300);

    await act(async () => { await result.current.advanceTime(); });
    const saveAfterAdvance = result.current.save;
    expect(saveAfterAdvance?.cityGovFund).toBeGreaterThanOrEqual(0);
  });
});
