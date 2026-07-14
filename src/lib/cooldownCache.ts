/**
 * cooldownCache.ts
 * 离线冷却本地缓存：将所有冷却/结果字段持久化到 AsyncStorage
 *
 * 设计目标：
 * 1. updateGameSave 每次写入 DB 时，同步写入本地缓存
 * 2. DB 写入失败（断网）时，将操作存入离线队列
 * 3. refreshSave 后，用本地缓存补丁覆盖 DB 返回的过时冷却数据
 * 4. 网络恢复时，自动 flush 离线队列
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { PlayerSave } from '@/types/game';

// ── 冷却相关字段列表（Record<string,number> 或 JSON string 类型）────────────
export const COOLDOWN_FIELDS = [
  'careerPathCooldowns',
  'adminGovCooldowns',
  'judicialExtraCooldowns',
  'discDeepCooldowns',
  'partyDeepCooldowns',
  'leagueDeepCooldowns',
  'adminDeepCooldowns',
  'grayIncomeCooldowns',
  'powerTradeCooldowns',
  'personnelCooldowns',
  'actionResultsLog',
  'massIncidentResults',
  'discDeepResults',
  'partyDeepResults',
  'leagueDeepResults',
  'adminDeepResults',
] as const;

export type CooldownFields = Pick<PlayerSave, typeof COOLDOWN_FIELDS[number]>;

// AsyncStorage key 前缀
const CACHE_KEY = (saveId: string) => `@cooldown_cache_${saveId}`;
const QUEUE_KEY = (saveId: string) => `@offline_queue_${saveId}`;

// ── 读取本地冷却缓存 ──────────────────────────────────────────────────────────
export async function loadCooldownCache(saveId: string): Promise<Partial<CooldownFields>> {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY(saveId));
    if (!raw) return {};
    return JSON.parse(raw) as Partial<CooldownFields>;
  } catch {
    return {};
  }
}

// ── 写入本地冷却缓存（仅写冷却相关字段）──────────────────────────────────────
export async function saveCooldownCache(
  saveId: string,
  updates: Parameters<typeof Object.assign>[0],
): Promise<void> {
  try {
    // 提取 updates 中属于 COOLDOWN_FIELDS 的字段
    const patch: Partial<CooldownFields> = {};
    for (const key of COOLDOWN_FIELDS) {
      if (key in updates) {
        (patch as Record<string, unknown>)[key] = (updates as Record<string, unknown>)[key];
      }
    }
    if (Object.keys(patch).length === 0) return;

    const existing = await loadCooldownCache(saveId);
    const merged = mergeCooldowns(existing, patch);
    await AsyncStorage.setItem(CACHE_KEY(saveId), JSON.stringify(merged));
  } catch {
    // 静默失败，不影响主流程
  }
}

// ── 清除本地缓存（存档被删除/重置时调用）──────────────────────────────────────
export async function clearCooldownCache(saveId: string): Promise<void> {
  try {
    await AsyncStorage.multiRemove([CACHE_KEY(saveId), QUEUE_KEY(saveId)]);
  } catch {
    // 静默失败
  }
}

// ── 离线队列：将 DB 写入失败的操作暂存 ──────────────────────────────────────
export type OfflineOp = {
  saveId: string;
  updates: Record<string, unknown>;
  timestamp: number;
};

export async function enqueueOfflineOp(saveId: string, updates: Record<string, unknown>): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(QUEUE_KEY(saveId));
    const queue: OfflineOp[] = raw ? (JSON.parse(raw) as OfflineOp[]) : [];
    // 只保留冷却相关字段，避免队列膨胀
    const patch: Record<string, unknown> = {};
    for (const key of COOLDOWN_FIELDS) {
      if (key in updates) patch[key] = updates[key as keyof typeof updates];
    }
    if (Object.keys(patch).length === 0) return;
    queue.push({ saveId, updates: patch, timestamp: Date.now() });
    // 最多保留最近 50 条，防止无限膨胀
    const trimmed = queue.slice(-50);
    await AsyncStorage.setItem(QUEUE_KEY(saveId), JSON.stringify(trimmed));
  } catch {
    // 静默失败
  }
}

export async function loadOfflineQueue(saveId: string): Promise<OfflineOp[]> {
  try {
    const raw = await AsyncStorage.getItem(QUEUE_KEY(saveId));
    return raw ? (JSON.parse(raw) as OfflineOp[]) : [];
  } catch {
    return [];
  }
}

export async function clearOfflineQueue(saveId: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(QUEUE_KEY(saveId));
  } catch {
    // 静默失败
  }
}

// ── 合并冷却数据：对 Record<string,number> 类型的字段取最大值（更晚的冷却优先）
// 对 JSON string 类型（results）取本地版本（本地比 DB 更新）────────────────────
function mergeCooldowns(
  base: Partial<CooldownFields>,
  patch: Partial<CooldownFields>,
): Partial<CooldownFields> {
  const result = { ...base };
  for (const key of COOLDOWN_FIELDS) {
    const patchVal = patch[key as keyof CooldownFields];
    if (patchVal === undefined) continue;

    const baseVal = base[key as keyof CooldownFields];

    if (key.endsWith('Results') || key === 'actionResultsLog') {
      // JSON string 类型：若 patch 有值则用 patch（本地比 DB 新）
      (result as Record<string, unknown>)[key] = patchVal;
    } else {
      // Record<string,number> 冷却字典：对每个 key 取较大的 gameDays 值
      const baseMap = (typeof baseVal === 'object' && baseVal !== null
        ? baseVal
        : {}) as Record<string, number>;
      const patchMap = (typeof patchVal === 'object' && patchVal !== null
        ? patchVal
        : {}) as Record<string, number>;
      const merged: Record<string, number> = { ...baseMap };
      for (const [k, v] of Object.entries(patchMap)) {
        merged[k] = Math.max(merged[k] ?? 0, v);
      }
      (result as Record<string, unknown>)[key] = merged;
    }
  }
  return result;
}

// ── 将本地缓存补丁应用到 DB 返回的 save 上 ─────────────────────────────────
export function applyLocalCachePatch(dbSave: PlayerSave, cache: Partial<CooldownFields>): PlayerSave {
  if (Object.keys(cache).length === 0) return dbSave;
  const merged = mergeCooldowns(
    // 以 DB 数据为 base
    Object.fromEntries(COOLDOWN_FIELDS.map(k => [k, dbSave[k as keyof PlayerSave]])) as Partial<CooldownFields>,
    cache,
  );
  return { ...dbSave, ...(merged as Partial<PlayerSave>) };
}
