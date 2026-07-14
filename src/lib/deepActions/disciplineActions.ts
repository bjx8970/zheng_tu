/**
 * 纪检线深度玩法 — 行动数据
 * 涵盖：巡视反腐 / 案件查处 / 廉政建设 / 专项整治
 */
import type { DeepAction } from './types';

export type DisciplineCategory = '巡视反腐' | '案件查处' | '廉政建设' | '专项整治';

export const DISCIPLINE_CATEGORIES: DisciplineCategory[] = ['巡视反腐', '案件查处', '廉政建设', '专项整治'];
export const DISCIPLINE_CAT_ICONS: Record<DisciplineCategory, string> = {
  '巡视反腐': '🔍', '案件查处': '⚖️', '廉政建设': '🛡️', '专项整治': '⚡',
};

import _actionsJson from './disciplineActions.json';
export const DISCIPLINE_ACTIONS: DeepAction<DisciplineCategory>[] = _actionsJson as unknown as DeepAction<DisciplineCategory>[];