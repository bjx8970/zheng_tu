/**
 * 四条仕途路线 UI 主题系统
 * 每条线 × 每职级都有独特的主题色与背景风格
 */

import type { CareerLine } from './lineGameplay';

export interface LineTheme {
  /** 主色 */
  primary: string;
  /** 辅色 */
  secondary: string;
  /** 背景色 */
  bg: string;
  /** 卡片背景 */
  cardBg: string;
  /** 边框色 */
  border: string;
  /** 标题文字色 */
  titleColor: string;
  /** 正文文字色 */
  textColor: string;
  /** 描述文字色 */
  descColor: string;
  /** 状态图标 emoji */
  emblem: string;
  /** 级别标签 */
  tierLabel: string;
  /** 背景装饰文字（水印风格） */
  watermark: string;
}

// ── 党务线主题（红色系，随级别加深）─────────────────────────────────────────
const PARTY_THEMES: Record<number, LineTheme> = {
  1: { primary: '#c0392b', secondary: '#e74c3c', bg: '#fff5f5', cardBg: '#fff', border: '#f5c6cb', titleColor: '#922b21', textColor: '#333', descColor: '#666', emblem: '🏘️', tierLabel: '基层党支部', watermark: '党' },
  2: { primary: '#b03a2e', secondary: '#cb4335', bg: '#fdf2f2', cardBg: '#fff', border: '#f1948a', titleColor: '#7b241c', textColor: '#333', descColor: '#666', emblem: '🌾', tierLabel: '乡镇党务', watermark: '组' },
  3: { primary: '#a93226', secondary: '#c0392b', bg: '#fbeaea', cardBg: '#fff', border: '#e6a4a4', titleColor: '#6e2115', textColor: '#2d2d2d', descColor: '#555', emblem: '🔴', tierLabel: '乡镇党委', watermark: '党' },
  4: { primary: '#9b2219', secondary: '#b03a2e', bg: '#f9e1e1', cardBg: '#fdfafa', border: '#dc7c7c', titleColor: '#5b1a12', textColor: '#2d2d2d', descColor: '#555', emblem: '🏛️', tierLabel: '县委常委', watermark: '印' },
  5: { primary: '#8b1a10', secondary: '#9b2219', bg: '#f7d7d7', cardBg: '#fcf8f8', border: '#cd6b6b', titleColor: '#5b1a12', textColor: '#2d2d2d', descColor: '#555', emblem: '🎖️', tierLabel: '县委书记', watermark: '旗' },
  6: { primary: '#7d1309', secondary: '#8b1a10', bg: '#f5cccc', cardBg: '#fcf8f8', border: '#c05a5a', titleColor: '#4a1109', textColor: '#222', descColor: '#444', emblem: '⭐', tierLabel: '县委要职', watermark: '委' },
  7: { primary: '#6e0f05', secondary: '#7d1309', bg: '#f0c2c2', cardBg: '#fcf7f7', border: '#b04848', titleColor: '#3e0d04', textColor: '#222', descColor: '#444', emblem: '🔴', tierLabel: '市委常委', watermark: '党' },
  8: { primary: '#640000', secondary: '#6e0f05', bg: '#ecb8b8', cardBg: '#fbf5f5', border: '#a03030', titleColor: '#3a0000', textColor: '#222', descColor: '#444', emblem: '🏙️', tierLabel: '市委副书记', watermark: '旗' },
  9: { primary: '#580000', secondary: '#640000', bg: '#e8aeae', cardBg: '#faf4f4', border: '#902020', titleColor: '#300000', textColor: '#1a1a1a', descColor: '#333', emblem: '🎯', tierLabel: '市委书记', watermark: '印' },
  10: { primary: '#4d0000', secondary: '#580000', bg: '#e3a4a4', cardBg: '#f9f2f2', border: '#800000', titleColor: '#280000', textColor: '#1a1a1a', descColor: '#333', emblem: '🏛️', tierLabel: '省委常委', watermark: '委' },
  11: { primary: '#3d0000', secondary: '#4d0000', bg: '#dd9898', cardBg: '#f8f0f0', border: '#700000', titleColor: '#200000', textColor: '#1a1a1a', descColor: '#333', emblem: '⭐', tierLabel: '省委书记', watermark: '党' },
  12: { primary: '#d4ac0d', secondary: '#c0392b', bg: '#1a0000', cardBg: '#2a0000', border: '#d4ac0d', titleColor: '#f5d60f', textColor: '#fff', descColor: '#ffcccc', emblem: '🌟', tierLabel: '中央委员', watermark: '中' },
  13: { primary: '#f1c40f', secondary: '#e74c3c', bg: '#150000', cardBg: '#220000', border: '#f1c40f', titleColor: '#ffe066', textColor: '#fff', descColor: '#ffcccc', emblem: '🏅', tierLabel: '政治局委员', watermark: '局' },
  14: { primary: '#ffd700', secondary: '#ff4444', bg: '#100000', cardBg: '#1a0000', border: '#ffd700', titleColor: '#fff0a0', textColor: '#fff', descColor: '#ffd0d0', emblem: '🔑', tierLabel: '政治局常委', watermark: '政' },
  15: { primary: '#ffec00', secondary: '#ff0000', bg: '#0a0000', cardBg: '#140000', border: '#ffec00', titleColor: '#fff', textColor: '#fff', descColor: '#ffc0c0', emblem: '⭐', tierLabel: '党的总书记', watermark: '★' },
};

// ── 行政线主题（蓝色系，随级别加深）─────────────────────────────────────────
const GOVT_THEMES: Record<number, LineTheme> = {
  1: { primary: '#2980b9', secondary: '#3498db', bg: '#f0f8ff', cardBg: '#fff', border: '#b8d4ec', titleColor: '#1a5fa8', textColor: '#333', descColor: '#666', emblem: '🏠', tierLabel: '乡镇公务员', watermark: '政' },
  2: { primary: '#2471a3', secondary: '#2980b9', bg: '#eaf4fc', cardBg: '#fff', border: '#a9c8e8', titleColor: '#155388', textColor: '#333', descColor: '#666', emblem: '📄', tierLabel: '乡镇助理', watermark: '务' },
  3: { primary: '#1f618d', secondary: '#2471a3', bg: '#e4f0fa', cardBg: '#fff', border: '#96b8e0', titleColor: '#104a7c', textColor: '#2d2d2d', descColor: '#555', emblem: '🔵', tierLabel: '乡镇长', watermark: '政' },
  4: { primary: '#1a5276', secondary: '#1f618d', bg: '#dceaf6', cardBg: '#fafcff', border: '#80a8d4', titleColor: '#0e3f65', textColor: '#2d2d2d', descColor: '#555', emblem: '🏢', tierLabel: '副县长', watermark: '令' },
  5: { primary: '#154360', secondary: '#1a5276', bg: '#d4e2f0', cardBg: '#f9fbfe', border: '#6898c4', titleColor: '#0a334f', textColor: '#2d2d2d', descColor: '#555', emblem: '🏛️', tierLabel: '县长', watermark: '章' },
  6: { primary: '#103652', secondary: '#154360', bg: '#cbdaea', cardBg: '#f8fafd', border: '#5080aa', titleColor: '#092844', textColor: '#222', descColor: '#444', emblem: '⭐', tierLabel: '县委书记', watermark: '政' },
  7: { primary: '#0c2d45', secondary: '#103652', bg: '#c2d2e4', cardBg: '#f7f9fb', border: '#3870a0', titleColor: '#071e30', textColor: '#222', descColor: '#444', emblem: '🌆', tierLabel: '副市长', watermark: '府' },
  8: { primary: '#082438', secondary: '#0c2d45', bg: '#b8cadc', cardBg: '#f5f8fb', border: '#2060a0', titleColor: '#041828', textColor: '#222', descColor: '#444', emblem: '🏙️', tierLabel: '市长', watermark: '市' },
  9: { primary: '#041c2e', secondary: '#082438', bg: '#aec0d4', cardBg: '#f3f7fa', border: '#0050a0', titleColor: '#021420', textColor: '#1a1a1a', descColor: '#333', emblem: '🎯', tierLabel: '市委书记', watermark: '令' },
  10: { primary: '#001428', secondary: '#041c2e', bg: '#a4b8cc', cardBg: '#f0f4f8', border: '#003880', titleColor: '#000e1c', textColor: '#1a1a1a', descColor: '#333', emblem: '🏛️', tierLabel: '省长', watermark: '省' },
  11: { primary: '#00102a', secondary: '#001428', bg: '#9ab0c4', cardBg: '#eef2f6', border: '#002870', titleColor: '#00091e', textColor: '#1a1a1a', descColor: '#333', emblem: '⭐', tierLabel: '省委书记', watermark: '政' },
  12: { primary: '#d4ac0d', secondary: '#1a5fa8', bg: '#00101c', cardBg: '#001824', border: '#d4ac0d', titleColor: '#f5d60f', textColor: '#fff', descColor: '#c0d8ff', emblem: '🌟', tierLabel: '国务院部长', watermark: '国' },
  13: { primary: '#f1c40f', secondary: '#3498db', bg: '#000c16', cardBg: '#00121c', border: '#f1c40f', titleColor: '#ffe066', textColor: '#fff', descColor: '#b0ccff', emblem: '🏅', tierLabel: '国务院副总理', watermark: '院' },
  14: { primary: '#ffd700', secondary: '#00aaff', bg: '#000810', cardBg: '#000e18', border: '#ffd700', titleColor: '#fff0a0', textColor: '#fff', descColor: '#99c0ff', emblem: '🔑', tierLabel: '总理', watermark: '令' },
  15: { primary: '#ffec00', secondary: '#0055ff', bg: '#00060a', cardBg: '#000c12', border: '#ffec00', titleColor: '#fff', textColor: '#fff', descColor: '#80b4ff', emblem: '⭐', tierLabel: '总统', watermark: '★' },
};

// ── 纪检线主题（深蓝/金色系）──────────────────────────────────────────────
const DISCIPLINE_THEMES: Record<number, LineTheme> = {
  1: { primary: '#7d6608', secondary: '#b7950b', bg: '#fefce8', cardBg: '#fff', border: '#f5e0a0', titleColor: '#6d5a06', textColor: '#333', descColor: '#666', emblem: '⚖️', tierLabel: '纪检委员', watermark: '纪' },
  2: { primary: '#6d5a06', secondary: '#7d6608', bg: '#fef9e0', cardBg: '#fff', border: '#edd890', titleColor: '#5c4c04', textColor: '#333', descColor: '#666', emblem: '🔍', tierLabel: '纪检干事', watermark: '察' },
  3: { primary: '#5c4c04', secondary: '#6d5a06', bg: '#fdf6d8', cardBg: '#fefdf5', border: '#dbc880', titleColor: '#4a3a02', textColor: '#2d2d2d', descColor: '#555', emblem: '🟡', tierLabel: '乡镇纪检书记', watermark: '法' },
  4: { primary: '#1a2a5e', secondary: '#2c3e7d', bg: '#eef0fa', cardBg: '#fff', border: '#b0c0e8', titleColor: '#10205a', textColor: '#2d2d2d', descColor: '#555', emblem: '📂', tierLabel: '县纪委常委', watermark: '纪' },
  5: { primary: '#141f4f', secondary: '#1a2a5e', bg: '#e6e8f5', cardBg: '#fafafd', border: '#9090d0', titleColor: '#0c1840', textColor: '#2d2d2d', descColor: '#555', emblem: '🔒', tierLabel: '县纪委书记', watermark: '廉' },
  6: { primary: '#0e1640', secondary: '#141f4f', bg: '#dddff0', cardBg: '#f8f8fc', border: '#7070c0', titleColor: '#080e34', textColor: '#222', descColor: '#444', emblem: '⭐', tierLabel: '市纪委常委', watermark: '清' },
  7: { primary: '#080e34', secondary: '#0e1640', bg: '#d4d6e8', cardBg: '#f5f5fa', border: '#5050b0', titleColor: '#040828', textColor: '#222', descColor: '#444', emblem: '🎯', tierLabel: '市纪委书记', watermark: '正' },
  8: { primary: '#040828', secondary: '#080e34', bg: '#cbccdc', cardBg: '#f0f0f8', border: '#3030a0', titleColor: '#020618', textColor: '#222', descColor: '#444', emblem: '🏙️', tierLabel: '省纪委常委', watermark: '纪' },
  9: { primary: '#020618', secondary: '#040828', bg: '#c0c2d4', cardBg: '#eeecf4', border: '#001a90', titleColor: '#010410', textColor: '#1a1a1a', descColor: '#333', emblem: '🔎', tierLabel: '省纪委书记', watermark: '察' },
  10: { primary: '#000314', secondary: '#020618', bg: '#b6b8cc', cardBg: '#ecebf2', border: '#000a80', titleColor: '#00020c', textColor: '#1a1a1a', descColor: '#333', emblem: '🏛️', tierLabel: '中纪委委员', watermark: '廉' },
  11: { primary: '#1a0020', secondary: '#2d0040', bg: '#aa90b4', cardBg: '#e8e0ec', border: '#6020a0', titleColor: '#180018', textColor: '#1a1a1a', descColor: '#333', emblem: '⭐', tierLabel: '中纪委副书记', watermark: '法' },
  12: { primary: '#d4ac0d', secondary: '#000314', bg: '#100018', cardBg: '#180020', border: '#d4ac0d', titleColor: '#f5d60f', textColor: '#fff', descColor: '#ffeedd', emblem: '🌟', tierLabel: '中纪委委员', watermark: '纪' },
  13: { primary: '#f1c40f', secondary: '#200030', bg: '#0c0014', cardBg: '#140018', border: '#f1c40f', titleColor: '#ffe066', textColor: '#fff', descColor: '#ffd0ee', emblem: '🏅', tierLabel: '中纪委副书记', watermark: '察' },
  14: { primary: '#ffd700', secondary: '#3d0060', bg: '#08000e', cardBg: '#0e0014', border: '#ffd700', titleColor: '#fff0a0', textColor: '#fff', descColor: '#ffaae0', emblem: '🔑', tierLabel: '中纪委书记', watermark: '清' },
  15: { primary: '#ffec00', secondary: '#5a0080', bg: '#050008', cardBg: '#0a000e', border: '#ffec00', titleColor: '#fff', textColor: '#fff', descColor: '#ff88cc', emblem: '⭐', tierLabel: '纪委最高职', watermark: '★' },
};

// ── 团派线主题（青绿色系，随级别加深）────────────────────────────────────────
const LEAGUE_THEMES: Record<number, LineTheme> = {
  1: { primary: '#1a7a4a', secondary: '#27ae60', bg: '#f0fff6', cardBg: '#fff', border: '#b0e0c8', titleColor: '#146038', textColor: '#333', descColor: '#666', emblem: '🌱', tierLabel: '乡镇团支部书记', watermark: '团' },
  2: { primary: '#157a3e', secondary: '#1a7a4a', bg: '#e8faf0', cardBg: '#fff', border: '#98d4b8', titleColor: '#0e5830', textColor: '#333', descColor: '#666', emblem: '🙌', tierLabel: '团支部委员', watermark: '青' },
  3: { primary: '#106a32', secondary: '#157a3e', bg: '#e0f4e8', cardBg: '#fafef8', border: '#80c8a0', titleColor: '#085024', textColor: '#2d2d2d', descColor: '#555', emblem: '🌿', tierLabel: '乡镇团委书记', watermark: '春' },
  4: { primary: '#0b5828', secondary: '#106a32', bg: '#d8eee0', cardBg: '#f8fdf6', border: '#68b888', titleColor: '#04401a', textColor: '#2d2d2d', descColor: '#555', emblem: '🏢', tierLabel: '县团委副书记', watermark: '团' },
  5: { primary: '#084820', secondary: '#0b5828', bg: '#d0e8d8', cardBg: '#f5fcf0', border: '#50a870', titleColor: '#023014', textColor: '#2d2d2d', descColor: '#555', emblem: '🎖️', tierLabel: '县团委书记', watermark: '旗' },
  6: { primary: '#053818', secondary: '#084820', bg: '#c8e0d0', cardBg: '#f2fbed', border: '#389860', titleColor: '#02280c', textColor: '#222', descColor: '#444', emblem: '⭐', tierLabel: '市团委常委', watermark: '青' },
  7: { primary: '#032a10', secondary: '#053818', bg: '#c0d8c8', cardBg: '#eff9ea', border: '#208850', titleColor: '#012008', textColor: '#222', descColor: '#444', emblem: '🌆', tierLabel: '市团委副书记', watermark: '团' },
  8: { primary: '#021e08', secondary: '#032a10', bg: '#b8d0c0', cardBg: '#ecf7e6', border: '#107840', titleColor: '#010c04', textColor: '#222', descColor: '#444', emblem: '🏙️', tierLabel: '市团委书记', watermark: '工' },
  9: { primary: '#011408', secondary: '#021e08', bg: '#b0c8b8', cardBg: '#e8f4e0', border: '#006830', titleColor: '#000802', textColor: '#1a1a1a', descColor: '#333', emblem: '🎯', tierLabel: '省团委常委', watermark: '年' },
  10: { primary: '#000e04', secondary: '#011408', bg: '#a8c0b0', cardBg: '#e5f1dc', border: '#005820', titleColor: '#000400', textColor: '#1a1a1a', descColor: '#333', emblem: '🏛️', tierLabel: '省团委书记', watermark: '团' },
  11: { primary: '#000800', secondary: '#000e04', bg: '#a0b8a8', cardBg: '#e0eed8', border: '#004810', titleColor: '#000000', textColor: '#1a1a1a', descColor: '#333', emblem: '⭐', tierLabel: '共青团省书记', watermark: '青' },
  12: { primary: '#d4ac0d', secondary: '#1a7a4a', bg: '#000e00', cardBg: '#001600', border: '#d4ac0d', titleColor: '#f5d60f', textColor: '#fff', descColor: '#c0ffdd', emblem: '🌟', tierLabel: '团中央委员', watermark: '共' },
  13: { primary: '#f1c40f', secondary: '#27ae60', bg: '#000800', cardBg: '#001000', border: '#f1c40f', titleColor: '#ffe066', textColor: '#fff', descColor: '#a0ffcc', emblem: '🏅', tierLabel: '团中央书记处', watermark: '青' },
  14: { primary: '#ffd700', secondary: '#00dd66', bg: '#000400', cardBg: '#000a00', border: '#ffd700', titleColor: '#fff0a0', textColor: '#fff', descColor: '#80ffbb', emblem: '🔑', tierLabel: '团中央第一书记', watermark: '团' },
  15: { primary: '#ffec00', secondary: '#00ff88', bg: '#000200', cardBg: '#000600', border: '#ffec00', titleColor: '#fff', textColor: '#fff', descColor: '#60ff99', emblem: '⭐', tierLabel: '团派总领袖', watermark: '★' },
};

const ALL_THEMES: Record<CareerLine, Record<number, LineTheme>> = {
  '党务线': PARTY_THEMES,
  '行政线': GOVT_THEMES,
  '纪检线': DISCIPLINE_THEMES,
  '团派线': LEAGUE_THEMES,
};

/** 获取指定路线+职级的 UI 主题 */
export function getLineTheme(line: CareerLine, rankLevel: number): LineTheme {
  const themes = ALL_THEMES[line] ?? GOVT_THEMES;
  return themes[Math.min(15, Math.max(1, rankLevel))] ?? themes[1];
}

/** 获取路线的基础主题色（用于导航栏/徽章等简单场景） */
export function getLineBaseColor(line: CareerLine): string {
  const base: Record<CareerLine, string> = {
    '党务线': '#c0392b',
    '行政线': '#1a5fa8',
    '纪检线': '#1a2a5e',
    '团派线': '#1a7a4a',
  };
  return base[line];
}

/** 路线 emoji 徽标 */
export const LINE_ICON: Record<CareerLine, string> = {
  '党务线': '🔴',
  '行政线': '🔵',
  '纪检线': '🟡',
  '团派线': '🟢',
};
