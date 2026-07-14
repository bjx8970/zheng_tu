/**
 * 行政线深度玩法 — 行动数据
 * 涵盖：城市治理 / 民生工程 / 经济发展 / 政务改革 / 专项工程
 */
import type { DeepAction } from './types';

export type AdminCategory = '城市治理' | '民生工程' | '经济发展' | '政务改革' | '专项工程';

export const ADMIN_CATEGORIES: AdminCategory[] = ['城市治理', '民生工程', '经济发展', '政务改革', '专项工程'];
export const ADMIN_CAT_ICONS: Record<AdminCategory, string> = {
  '城市治理': '🏛️', '民生工程': '🏘️', '经济发展': '💼', '政务改革': '⚙️', '专项工程': '🚧',
};

import _actionsJson from './adminActions.json';
export const ADMIN_ACTIONS: DeepAction<AdminCategory>[] = _actionsJson as unknown as DeepAction<AdminCategory>[];