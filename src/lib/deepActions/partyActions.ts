/**
 * 党务线深度玩法 — 行动数据
 * 涵盖：组织建设 / 干部工作 / 宣传思想 / 党纪党规
 */
import type { DeepAction } from './types';

export type PartyCategory = '组织建设' | '干部工作' | '宣传思想' | '党纪党规';

export const PARTY_CATEGORIES: PartyCategory[] = ['组织建设', '干部工作', '宣传思想', '党纪党规'];
export const PARTY_CAT_ICONS: Record<PartyCategory, string> = {
  '组织建设': '🏗️', '干部工作': '🎖️', '宣传思想': '📢', '党纪党规': '⚖️',
};

import _actionsJson from './partyActions.json';
export const PARTY_ACTIONS: DeepAction<PartyCategory>[] = _actionsJson as unknown as DeepAction<PartyCategory>[];