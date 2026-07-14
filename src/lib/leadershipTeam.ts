// 领导班子配置——按职级分层定义班子成员职位
// 班子成员的姓名在游戏存档中动态生成并持久化

export interface TeamMember {
  position: string;   // 职位
  name: string;       // 姓名（运行时生成）
  favorability: number; // 好感度 0-100
}

export interface LeadershipConfig {
  size: number;
  positions: string[];
  levelName: string;  // 班子所属层级名称
}

// ─────────────────────────────────────────────
// 各职级班子配置（符合中国现实党政体制）
// ─────────────────────────────────────────────
const LEADERSHIP_CONFIGS: Record<string, LeadershipConfig> = {
  // 乡镇党委常委会（9人）
  town: {
    levelName: '镇党委常委会',
    size: 9,
    positions: [
      '党委书记',
      '党委副书记、镇长',
      '专职党委副书记',
      '肃宪院长',
      '组织委员',
      '宣传委员',
      '政法委员',
      '武装部长',
      '联邦国会主席',
    ],
  },
  // 县委常委会（11人）
  county: {
    levelName: '县委常委会',
    size: 11,
    positions: [
      '县委书记',
      '县委副书记、县长',
      '专职县委副书记',
      '县肃宪院长',
      '县委党政人事院院长',
      '县委宣传部长',
      '县委政法委书记',
      '县人武部部长',
      '常务副县长（县委常委）',
      '县委统战部长',
      '联邦国会主任',
    ],
  },
  // 市委常委会（13人）
  city: {
    levelName: '市委常委会',
    size: 13,
    positions: [
      '市委书记',
      '市委副书记、市长',
      '专职市委副书记',
      '市肃宪院长',
      '市委党政人事院院长',
      '市委宣传部长',
      '市委政法委书记',
      '常务副市长（市委常委）',
      '市委统战部长',
      '市人武部政委',
      '市委秘书长',
      '市委副书记（专职）',
      '联邦国会常委会主任',
    ],
  },
  // 省执政委常委会（13人）
  province: {
    levelName: '省执政委常委会',
    size: 13,
    positions: [
      '省执政委书记',
      '省执政委副书记、省长',
      '专职省执政委副书记',
      '省肃宪院长',
      '省执政委党政人事院院长',
      '省执政委宣传部长',
      '省执政委政法委书记',
      '常务副省长（省执政委常委）',
      '省执政委统战部长',
      '省执政委秘书长',
      '省军区政委',
      '省执政委副书记',
      '联邦国会常委会主任',
    ],
  },
  // 部党委常委会（9人）
  ministry: {
    levelName: '部党委常委会',
    size: 9,
    positions: [
      '部党委书记（部长）',
      '部党委副书记（常务副部长）',
      '副部长（党委委员）',
      '副部长（党委委员）',
      '纪检组长',
      '部长助理（党委委员）',
      '机关党委书记（党委委员）',
      '总工程师（党委委员）',
      '政策研究室主任（党委委员）',
    ],
  },
  // 联邦政务常委会（7人）
  national: {
    levelName: '联邦政务常委会',
    size: 7,
    positions: [
      '常委（执政党主席）',
      '常委（联邦内阁总理）',
      '常委（联邦国会议长）',
      '常委（国策协理堂主席）',
      '常委（肃宪院长）',
      '常委（内阁常务副总统）',
      '常委（党务总枢府书记）',
    ],
  },
};

/** 根据职级数值返回班子配置 */
export function getLeadershipConfig(rankLevel: number): LeadershipConfig {
  if (rankLevel <= 3) return LEADERSHIP_CONFIGS.town;
  if (rankLevel <= 6) return LEADERSHIP_CONFIGS.county;
  if (rankLevel <= 9) return LEADERSHIP_CONFIGS.city;
  if (rankLevel <= 11) return LEADERSHIP_CONFIGS.province;
  if (rankLevel <= 13) return LEADERSHIP_CONFIGS.ministry;
  return LEADERSHIP_CONFIGS.national;
}

// ─────────────────────────────────────────────
// 姓名生成工具
// ─────────────────────────────────────────────
const SURNAMES = ['王', '李', '张', '刘', '陈', '赵', '孙', '周', '吴', '郑', '冯', '许', '韩', '唐', '曹', '邓', '杨', '林', '黄', '胡'];
const GIVEN_NAMES = [
  '建国', '志远', '国华', '宏伟', '一凡', '明远', '明志', '国强', '兴华', '书平',
  '德胜', '正阳', '向阳', '全忠', '克强', '文斌', '大勇', '海峰', '志刚', '东升',
  '卫国', '思远', '长征', '继先', '光辉', '福生', '振兴', '承志', '永红', '民强',
];

function randomName(exclude: string[] = []): string {
  let name = '';
  let attempts = 0;
  do {
    const s = SURNAMES[Math.floor(Math.random() * SURNAMES.length)];
    const g = GIVEN_NAMES[Math.floor(Math.random() * GIVEN_NAMES.length)];
    name = s + g;
    attempts++;
  } while (exclude.includes(name) && attempts < 50);
  return name;
}

/** 生成一套完整的领导班子成员列表（玩家本人占第一位，其余为AI成员） */
export function generateTeamMembers(rankLevel: number, playerName: string): TeamMember[] {
  const config = getLeadershipConfig(rankLevel);
  const members: TeamMember[] = [];
  const usedNames: string[] = [playerName];

  for (let i = 0; i < config.size; i++) {
    if (i === 0) {
      // 第一位是玩家自己
      members.push({
        position: config.positions[0],
        name: playerName,
        favorability: 100, // 玩家自己好感度固定100（不参与AI投票）
      });
    } else {
      const name = randomName(usedNames);
      usedNames.push(name);
      members.push({
        position: config.positions[i] ?? `委员${i}`,
        name,
        favorability: 40 + Math.floor(Math.random() * 31), // 40-70随机好感度
      });
    }
  }
  return members;
}

// ─────────────────────────────────────────────
// AI 投票逻辑
// ─────────────────────────────────────────────
export type VoteResult = 'support' | 'oppose' | 'abstain';

/**
 * 根据好感度计算 AI 成员的投票结果
 * 好感度≥70：大概率支持（80%支持，15%弃权，5%反对）
 * 好感度40-69：中性判断（50%支持，30%弃权，20%反对）
 * 好感度<40：大概率反对（15%支持，15%弃权，70%反对）
 */
export function calcAiVote(favorability: number): VoteResult {
  const r = Math.random();
  if (favorability >= 70) {
    if (r < 0.80) return 'support';
    if (r < 0.95) return 'abstain';
    return 'oppose';
  }
  if (favorability >= 40) {
    if (r < 0.50) return 'support';
    if (r < 0.80) return 'abstain';
    return 'oppose';
  }
  if (r < 0.15) return 'support';
  if (r < 0.30) return 'abstain';
  return 'oppose';
}

/**
 * 计算投票通过后的效果倍率
 * 全票通过（100%支持）：1.2×
 * 绝对多数（≥80%）：1.1×
 * 简单多数（50-79%）：1.0×
 * 勉强过半（刚好过半，<55%）：0.9×
 * 未通过：0（否决，返回 null 表示使用否决逻辑）
 */
export function calcVoteMultiplier(supportCount: number, total: number): number | null {
  const ratio = supportCount / total;
  if (ratio < 0.5) return null; // 否决
  if (ratio === 1.0) return 1.2;
  if (ratio >= 0.8) return 1.1;
  if (ratio >= 0.55) return 1.0;
  return 0.9; // 勉强过半
}
