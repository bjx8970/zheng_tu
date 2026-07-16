import { getSupabaseClient } from './networking/supabaseClient';
import { SupabasePlayerRepository } from './persistence/supabase/repositories/SupabasePlayerRepository';
import { PlayerMapper } from './persistence/supabase/mappers/PlayerMapper';
import { domainEventBus } from './eventBus';
import { createGameStore } from './state/zustand/store';

// ===== Repository 单例 =====

let _playerRepo: SupabasePlayerRepository | null = null;

export function getPlayerRepository(): SupabasePlayerRepository {
  if (!_playerRepo) {
    _playerRepo = new SupabasePlayerRepository(getSupabaseClient(), new PlayerMapper());
  }
  return _playerRepo;
}

export function setPlayerRepository(repo: SupabasePlayerRepository): void {
  _playerRepo = repo;
}

// ===== Store 单例 =====

let _gameStore: ReturnType<typeof createGameStore> | null = null;

export function getGameStore() {
  if (!_gameStore) {
    _gameStore = createGameStore();
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
  const client = getSupabaseClient();
  const { error } = await client.from('player_saves').select('id').limit(1);
  if (error) {
    console.warn('[Infrastructure] Supabase connection check failed:', error.message);
  }

  getGameStore();

  domainEventBus.subscribeAll((event) => {
    console.log('[DomainEvent]', event.type);
  });

  console.log('[Infrastructure] Initialized');
}

export async function shutdownInfrastructure(): Promise<void> {
  domainEventBus.clear();
  resetGameStore();
  console.log('[Infrastructure] Shutdown');
}