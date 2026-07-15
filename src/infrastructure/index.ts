import { getSupabaseClient } from './networking/supabaseClient';
import { SupabasePlayerRepository } from './persistence/supabase/repositories/SupabasePlayerRepository';
import { PlayerMapper } from './persistence/supabase/mappers/PlayerMapper';
import { domainEventBus } from './eventBus';
import { createGameStore } from './state/zustand/createStore';
import { createPlayerSlice } from './state/zustand/slices/playerSlice';
import { createCareerSlice } from './state/zustand/slices/careerSlice';
import { createGovernanceSlice } from './state/zustand/slices/governanceSlice';
import { createPersonnelSlice } from './state/zustand/slices/personnelSlice';
import { createFinanceSlice } from './state/zustand/slices/financeSlice';
import { createPoliticalSlice } from './state/zustand/slices/politicalSlice';
import { createSystemSlice } from './state/zustand/slices/systemSlice';

// ===== Repository 单例 =====

let _playerRepo: SupabasePlayerRepository | null = null;

export function getPlayerRepository(): SupabasePlayerRepository {
  if (!_playerRepo) {
    _playerRepo = new SupabasePlayerRepository(getSupabaseClient(), new PlayerMapper());
  }
  return _playerRepo;
}

// 用于测试替换
export function setPlayerRepository(repo: SupabasePlayerRepository): void {
  _playerRepo = repo;
}

// ===== Store 单例 =====

let _gameStore: ReturnType<typeof createGameStore> | null = null;

export function getGameStore() {
  if (!_gameStore) {
    _gameStore = createGameStore([
      { name: 'player', slice: createPlayerSlice },
      { name: 'career', slice: createCareerSlice },
      { name: 'governance', slice: createGovernanceSlice },
      { name: 'personnel', slice: createPersonnelSlice },
      { name: 'finance', slice: createFinanceSlice },
      { name: 'political', slice: createPoliticalSlice },
      { name: 'system', slice: createSystemSlice },
    ], {
      name: 'ZhengTuGameStore',
      persist: true,
      partialize: (state) => ({
        save: state.save,
        lastSyncedAt: state.lastSyncedAt,
      }),
    });
  }
  return _gameStore;
}

export function setGameStore(store: ReturnType<typeof createGameStore>): void {
  _gameStore = store;
}

export function resetGameStore(): void {
  _gameStore = null;
}

// ===== 初始化入口 =====

export async function initializeInfrastructure(): Promise<void> {
  // 1. 验证 Supabase 连接
  const client = getSupabaseClient();
  const { error } = await client.from('player_saves').select('id').limit(1);
  if (error) {
    console.warn('[Infrastructure] Supabase connection check failed:', error.message);
  }

  // 2. 初始化 Store（触发 persist hydrate）
  getGameStore();

  // 3. 订阅领域事件 -> 同步到 Store / 埋点
  domainEventBus.subscribeAll((event) => {
    console.log('[DomainEvent]', event.type, event.payload);
    // 可在此接入 Sentry/Analytics
  });

  console.log('[Infrastructure] Initialized');
}

export async function shutdownInfrastructure(): Promise<void> {
  domainEventBus.clear();
  resetGameStore();
  console.log('[Infrastructure] Shutdown');
}