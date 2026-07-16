import { renderHook, act } from '@testing-library/react-native';
import { useDeepAction } from '@/lib/deepActions/useDeepAction';
import { GameProvider } from '@/ctx/GameContext';
import type { DeepAction } from '@/lib/deepActions/types';

function createAction(overrides?: Partial<DeepAction>): DeepAction {
  return {
    key: 'test_action',
    icon: '⚡',
    title: '测试行动',
    subtitle: 'test',
    desc: '测试用',
    baseCost: 100,
    minRank: 1,
    cooldownDays: 30,
    successRate: 80,
    successOutcome: { desc: '成功', merit: 10 },
    failOutcome: { desc: '失败', merit: 0 },
    ...overrides,
  };
}

function renderDeepAction(args?: Parameters<typeof useDeepAction>[0]) {
  return renderHook(() => useDeepAction(args ?? {
    cooldownsField: 'adminDeepCooldowns',
    resultsField: 'adminDeepResults',
  }), {
    wrapper: ({ children }) => <GameProvider>{children}</GameProvider>,
  });
}

describe('useDeepAction — cityGovFund 扣款', () => {
  it('成功时扣减 cityGovFund', async () => {
    const { result } = renderDeepAction();
    await act(async () => { await new Promise(r => setTimeout(r, 100)); });

    const action = createAction({ baseCost: 200 });
    await act(async () => {
      await result.current.handleAction(action);
    });
  });

  it('余额不足时禁止执行', async () => {
    const { result } = renderDeepAction();
    await act(async () => { await new Promise(r => setTimeout(r, 100)); });

    const action = createAction({ baseCost: 999999 });
    const beforeBalance = result.current.balance;
    await act(async () => {
      await result.current.handleAction(action);
    });
    expect(result.current.balance).toBe(beforeBalance);
  });
});
