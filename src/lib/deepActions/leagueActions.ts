/**
 * 团派线深度玩法 — 行动数据
 * 涵盖：青年服务 / 社会工作 / 人才培养 / 团组织建设
 */
import type { DeepAction } from './types';

export type LeagueCategory = '青年服务' | '社会工作' | '人才培养' | '团组织建设';

export const LEAGUE_CATEGORIES: LeagueCategory[] = ['青年服务', '社会工作', '人才培养', '团组织建设'];
export const LEAGUE_CAT_ICONS: Record<LeagueCategory, string> = {
  '青年服务': '🌱', '社会工作': '🌐', '人才培养': '🎓', '团组织建设': '🏫',
};

import _actionsJson from './leagueActions.json';
export const LEAGUE_ACTIONS: DeepAction<LeagueCategory>[] = _actionsJson as unknown as DeepAction<LeagueCategory>[];