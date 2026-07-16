import {
  COOLDOWN_FIELDS,
  saveCooldownCache,
  loadCooldownCache,
  enqueueOfflineOp,
  loadOfflineQueue,
  applyLocalCachePatch,
} from '@/lib/cooldownCache';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createMockSave } from '@/test/factories';

const SAVE_ID = 'test-save-id';

beforeEach(() => {
  jest.clearAllMocks();
});

describe('COOLDOWN_FIELDS — cityGovFund', () => {
  it('cityGovFund 包含在 COOLDOWN_FIELDS 中', () => {
    expect((COOLDOWN_FIELDS as readonly string[]).includes('cityGovFund')).toBe(true);
  });
});

describe('saveCooldownCache — cityGovFund 持久化', () => {
  it('将 cityGovFund 写入 AsyncStorage', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

    await saveCooldownCache(SAVE_ID, { cityGovFund: 300 } as Record<string, unknown>);

    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      expect.stringContaining(SAVE_ID),
      expect.stringContaining('"cityGovFund":300'),
    );
  });

  it('不保存不在 COOLDOWN_FIELDS 中的字段', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

    await saveCooldownCache(SAVE_ID, { someRandomField: 123 } as Record<string, unknown>);

    expect(AsyncStorage.setItem).not.toHaveBeenCalled();
  });
});

describe('enqueueOfflineOp — cityGovFund 入队', () => {
  it('DB 写入失败时将 cityGovFund 加入离线队列', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify([]));

    await enqueueOfflineOp(SAVE_ID, { cityGovFund: 150, actionResultsLog: '{}' } as Record<string, unknown>);

    expect(AsyncStorage.setItem).toHaveBeenCalled();
    const setCall = (AsyncStorage.setItem as jest.Mock).mock.calls[0];
    const stored = JSON.parse(setCall[1] as string);
    expect(stored[0].updates.cityGovFund).toBe(150);
  });
});

describe('applyLocalCachePatch — cityGovFund 恢复', () => {
  it('从缓存恢复 cityGovFund 到 DB 数据上', () => {
    const dbSave = createMockSave({ cityGovFund: 500, gameDays: 1000 });
    const cache: Partial<Record<string, unknown>> = { cityGovFund: 300 };

    const patched = applyLocalCachePatch(dbSave, cache);
    expect(patched.cityGovFund).toBe(300);
  });
});
