/**
 * 四条仕途路线专属职称体系
 * 每条线每个职级有独立称呼，替代通用职级名
 * v279：完善省部级以上(rank10-15)四路线专属职称
 */

export type CareerLineName = '党务线' | '行政线' | '纪检线' | '团派线' | '政法线';

/** 职称配置 */
export interface LineRankTitle {
  /** 正式职务称谓（主职） */
  title: string;
  /** 副职称谓 */
  deputyTitle: string;
  /** 所在单位类型 */
  unitType: string;
  /** 晋升历史显示的头衔 */
  historyLabel: string;
  /** 晋升通知标题 */
  promotionAnnouncement: string;
}

/** 行政线 15 职级称谓（严格对齐仕途晋升路径表，rank6/9/15 为收敛点） */
const ADMIN_TITLES: LineRankTitle[] = [
  // rank 1-3：科员→副乡镇长→乡镇长
  { title: '乡镇科员',          deputyTitle: '—',              unitType: '乡镇政府',    historyLabel: '乡镇科员',        promotionAnnouncement: '任命为乡镇政府科员' },
  { title: '副乡镇长',          deputyTitle: '—',              unitType: '乡镇政府',    historyLabel: '副乡镇长',        promotionAnnouncement: '任命为副乡镇长' },
  { title: '乡镇长',            deputyTitle: '副乡镇长',       unitType: '乡镇政府',    historyLabel: '乡镇长',          promotionAnnouncement: '任命为乡镇长' },
  // rank 4-5：行政线第一分叉段
  { title: '县委常委 / 副县长', deputyTitle: '县长助理',       unitType: '县政府',      historyLabel: '县委常委·副县长', promotionAnnouncement: '任命为县委常委、副县长' },
  { title: '县长 / 区长',       deputyTitle: '副县长',         unitType: '县政府',      historyLabel: '县长',            promotionAnnouncement: '任命为县长' },
  // rank 6：收敛点——县委书记（四路线汇聚）
  { title: '县委书记',          deputyTitle: '县委副书记',     unitType: '县委',        historyLabel: '县委书记',        promotionAnnouncement: '任命为县委书记' },
  // rank 7-8：行政线第二分叉段
  { title: '副市长',            deputyTitle: '市长助理',       unitType: '市政府',      historyLabel: '副市长',          promotionAnnouncement: '任命为副市长' },
  { title: '市长',              deputyTitle: '副市长',         unitType: '市政府',      historyLabel: '市长',            promotionAnnouncement: '任命为市长' },
  // rank 9：收敛点——市委书记（四路线汇聚）
  { title: '市委书记',          deputyTitle: '市委副书记',     unitType: '市委',        historyLabel: '市委书记',        promotionAnnouncement: '任命为市委书记' },
  // rank 10-11：行政线第三分叉段
  { title: '副省长',            deputyTitle: '省长助理',       unitType: '省政府',      historyLabel: '副省长',          promotionAnnouncement: '任命为副省长' },
  { title: '省长',              deputyTitle: '副省长',         unitType: '省政府',      historyLabel: '省长',            promotionAnnouncement: '任命为省长' },
  // rank 12-14：行政线部级+
  { title: '内阁部长 / 国务委员', deputyTitle: '常务副部长',    unitType: '联邦内阁各部', historyLabel: '内阁部长',       promotionAnnouncement: '任命为内阁部长' },
  { title: '内阁常务副总统',    deputyTitle: '国务委员',       unitType: '联邦内阁',    historyLabel: '内阁常务副总统',  promotionAnnouncement: '任命为内阁常务副总统' },
  { title: '联邦内阁总理',      deputyTitle: '常务副总统',     unitType: '联邦内阁',    historyLabel: '联邦内阁总理',    promotionAnnouncement: '当选联邦内阁总理' },
  // rank 15：收敛点——联邦最高领导人
  { title: '联邦总统 · 最高领导人', deputyTitle: '联邦副总统', unitType: '联邦最高权力机构', historyLabel: '联邦总统',   promotionAnnouncement: '当选联邦总统' },
];

/** 党务线 15 职级称谓（严格对齐仕途晋升路径表，rank6/9/15 为收敛点） */
const PARTY_TITLES: LineRankTitle[] = [
  // rank 1-3：科员→副乡镇长→乡镇党委书记
  { title: '乡镇科员',                    deputyTitle: '—',              unitType: '乡镇党委',   historyLabel: '乡镇科员',       promotionAnnouncement: '任命为乡镇党委科员' },
  { title: '副乡镇长',                    deputyTitle: '—',              unitType: '乡镇党委',   historyLabel: '副乡镇长',       promotionAnnouncement: '任命为副乡镇长' },
  { title: '乡镇党委书记',               deputyTitle: '党委副书记',     unitType: '乡镇党委',   historyLabel: '乡镇党委书记',   promotionAnnouncement: '任命为乡镇党委书记' },
  // rank 4-5：党务线第一分叉段
  { title: '县委常委（分管组织/宣传）',  deputyTitle: '纪委书记',       unitType: '县委',       historyLabel: '县委常委',       promotionAnnouncement: '任命为县委常委' },
  { title: '县委常委（分管组织·资深）',  deputyTitle: '县委副书记',     unitType: '县委',       historyLabel: '县委常委·资深',  promotionAnnouncement: '任命为县委常委（组织宣传分管）' },
  // rank 6：收敛点——县委书记
  { title: '县委书记',                   deputyTitle: '县委副书记',     unitType: '县委',       historyLabel: '县委书记',       promotionAnnouncement: '任命为县委书记' },
  // rank 7-8：党务线第二分叉段
  { title: '市委常委（分管组织/宣传/统战）', deputyTitle: '组织部长',   unitType: '市委',       historyLabel: '市委常委',       promotionAnnouncement: '任命为市委常委' },
  { title: '市委副书记（专职）',          deputyTitle: '市委常委',       unitType: '市委',       historyLabel: '市委副书记',     promotionAnnouncement: '任命为市委副书记' },
  // rank 9：收敛点——市委书记
  { title: '市委书记',                   deputyTitle: '市委副书记',     unitType: '市委',       historyLabel: '市委书记',       promotionAnnouncement: '任命为市委书记' },
  // rank 10-11：党务线第三分叉段
  { title: '省执政委常委（分管组织/宣传/政法）', deputyTitle: '组织部长', unitType: '省执政委', historyLabel: '省执政委常委',   promotionAnnouncement: '任命为省执政委常委' },
  { title: '省执政委书记',               deputyTitle: '省执政委副书记', unitType: '省执政委',   historyLabel: '省执政委书记',   promotionAnnouncement: '任命为省执政委书记' },
  // rank 12-14：党务线部级+
  { title: '联邦政务委员（分管党务/意识形态）', deputyTitle: '党政人事院副院长', unitType: '联邦政务院', historyLabel: '联邦政务委员', promotionAnnouncement: '任命为联邦政务委员' },
  { title: '联邦政务常委（分管党务）',   deputyTitle: '联邦政务委员',   unitType: '联邦政务院', historyLabel: '联邦政务常委',   promotionAnnouncement: '当选联邦政务常委' },
  { title: '执政党中央主席',             deputyTitle: '联邦政务常委',   unitType: '执政党中央', historyLabel: '执政党主席',     promotionAnnouncement: '当选执政党中央主席' },
  // rank 15：收敛点——联邦最高领导人
  { title: '联邦总统 · 最高领导人',     deputyTitle: '联邦副总统',     unitType: '联邦最高权力机构', historyLabel: '联邦总统', promotionAnnouncement: '当选联邦总统' },
];

/** 纪检线 15 职级称谓（严格对齐仕途晋升路径表，rank6/9/15 为收敛点） */
const DISCIPLINE_TITLES: LineRankTitle[] = [
  // rank 1-3：科员→副乡镇长→乡镇纪委委员
  { title: '乡镇科员',                    deputyTitle: '—',              unitType: '乡镇纪检组', historyLabel: '乡镇科员',         promotionAnnouncement: '任命为乡镇纪检科员' },
  { title: '副乡镇长',                    deputyTitle: '—',              unitType: '乡镇党委',   historyLabel: '副乡镇长',         promotionAnnouncement: '任命为副乡镇长' },
  { title: '乡镇纪检委员',               deputyTitle: '监察专员',       unitType: '乡镇纪委',   historyLabel: '乡镇纪检委员',     promotionAnnouncement: '任命为乡镇纪检委员' },
  // rank 4-5：纪检线第一分叉段
  { title: '县纪委副书记',               deputyTitle: '纪检委员',       unitType: '县纪委',     historyLabel: '县纪委副书记',     promotionAnnouncement: '任命为县纪委副书记' },
  { title: '县纪委书记',                 deputyTitle: '县纪委副书记',   unitType: '县纪委',     historyLabel: '县纪委书记',       promotionAnnouncement: '任命为县纪委书记' },
  // rank 6：收敛点——县委书记
  { title: '县委书记',                   deputyTitle: '县委副书记',     unitType: '县委',       historyLabel: '县委书记',         promotionAnnouncement: '任命为县委书记' },
  // rank 7-8：纪检线第二分叉段
  { title: '市纪委常委 / 监委委员',      deputyTitle: '监察专员',       unitType: '市纪委',     historyLabel: '市纪委常委',       promotionAnnouncement: '任命为市纪委常委' },
  { title: '市肃宪院长 / 市委常委',      deputyTitle: '市纪委副书记',   unitType: '市纪委·肃宪院', historyLabel: '市肃宪院长',    promotionAnnouncement: '任命为市肃宪院长' },
  // rank 9：收敛点——市委书记
  { title: '市委书记',                   deputyTitle: '市委副书记',     unitType: '市委',       historyLabel: '市委书记',         promotionAnnouncement: '任命为市委书记' },
  // rank 10-11：纪检线第三分叉段
  { title: '省肃宪院长 / 省执政委常委',  deputyTitle: '省纪委副书记',   unitType: '省肃宪院',   historyLabel: '省肃宪院长',       promotionAnnouncement: '任命为省肃宪院长' },
  { title: '肃宪督察院委员 / 省执政委常委', deputyTitle: '省肃宪院长', unitType: '肃宪督察院', historyLabel: '肃宪督察院委员',    promotionAnnouncement: '任命为肃宪督察院委员' },
  // rank 12-14：纪检线部级+
  { title: '肃宪督察院副书记（正部级）', deputyTitle: '肃宪督察院委员', unitType: '肃宪督察院', historyLabel: '肃宪督察院副书记', promotionAnnouncement: '任命为肃宪督察院副书记' },
  { title: '肃宪督察院书记（联邦政务常委）', deputyTitle: '肃宪督察院副书记', unitType: '肃宪督察院', historyLabel: '肃宪院书记', promotionAnnouncement: '当选肃宪督察院书记' },
  { title: '联邦政法委书记 · 联邦政务常委', deputyTitle: '肃宪院长',  unitType: '联邦政法委', historyLabel: '联邦政法委书记',    promotionAnnouncement: '当选联邦政法委书记' },
  // rank 15：收敛点——联邦最高领导人
  { title: '联邦总统 · 最高领导人',     deputyTitle: '联邦副总统',     unitType: '联邦最高权力机构', historyLabel: '联邦总统',   promotionAnnouncement: '当选联邦总统' },
];

/** 团派线 15 职级称谓（严格对齐仕途晋升路径表，rank6/9/15 为收敛点） */
const LEAGUE_TITLES: LineRankTitle[] = [
  // rank 1-3：科员→副乡镇长→乡镇团委书记
  { title: '乡镇科员',                    deputyTitle: '—',              unitType: '乡镇团委',   historyLabel: '乡镇科员',         promotionAnnouncement: '任命为乡镇团委科员' },
  { title: '副乡镇长',                    deputyTitle: '—',              unitType: '乡镇政府',   historyLabel: '副乡镇长',         promotionAnnouncement: '任命为副乡镇长' },
  { title: '乡镇团委书记',               deputyTitle: '副书记',         unitType: '乡镇团委',   historyLabel: '乡镇团委书记',     promotionAnnouncement: '任命为乡镇团委书记' },
  // rank 4-5：团派线第一分叉段
  { title: '团县委书记',                 deputyTitle: '县团委副书记',   unitType: '县团委',     historyLabel: '团县委书记',       promotionAnnouncement: '任命为团县委书记' },
  { title: '挂职副县长 / 团市委副书记',  deputyTitle: '团委副书记',     unitType: '县政府·市团委', historyLabel: '挂职副县长',     promotionAnnouncement: '任命为挂职副县长' },
  // rank 6：收敛点——县委书记
  { title: '县委书记',                   deputyTitle: '县委副书记',     unitType: '县委',       historyLabel: '县委书记',         promotionAnnouncement: '任命为县委书记' },
  // rank 7-8：团派线第二分叉段
  { title: '团省执政委副书记 / 省执政委青工部副部长', deputyTitle: '青工部长', unitType: '省团委', historyLabel: '省团委副书记', promotionAnnouncement: '任命为团省执政委副书记' },
  { title: '团省执政委书记 / 省执政委常委', deputyTitle: '省团委副书记', unitType: '省团委',   historyLabel: '团省执政委书记',   promotionAnnouncement: '任命为团省执政委书记' },
  // rank 9：收敛点——市委书记
  { title: '市委书记',                   deputyTitle: '市委副书记',     unitType: '市委',       historyLabel: '市委书记',         promotionAnnouncement: '任命为市委书记' },
  // rank 10-11：团派线第三分叉段
  { title: '省执政委副书记（分管青年/组织）', deputyTitle: '省执政委常委', unitType: '省执政委', historyLabel: '省执政委副书记',  promotionAnnouncement: '任命为省执政委副书记' },
  { title: '省执政委书记 / 团中央第一书记', deputyTitle: '省执政委副书记', unitType: '省执政委·团中央', historyLabel: '省执政委书记', promotionAnnouncement: '任命为省执政委书记' },
  // rank 12-14：团派线部级+
  { title: '联邦政务委员 / 党政人事院院长', deputyTitle: '联邦政务委员', unitType: '联邦政务院', historyLabel: '联邦政务委员',   promotionAnnouncement: '任命为联邦政务委员' },
  { title: '联邦国会副委员长（联邦政务委员）', deputyTitle: '国会委员', unitType: '联邦国会',  historyLabel: '联邦国会副委员长', promotionAnnouncement: '当选联邦国会副委员长' },
  { title: '联邦国会议长（联邦政务常委）', deputyTitle: '国会副委员长', unitType: '联邦国会',   historyLabel: '联邦国会议长',    promotionAnnouncement: '当选联邦国会议长' },
  // rank 15：收敛点——联邦最高领导人
  { title: '联邦总统 · 最高领导人',     deputyTitle: '联邦副总统',     unitType: '联邦最高权力机构', historyLabel: '联邦总统',   promotionAnnouncement: '当选联邦总统' },
];

/** 政法线 15 职级称谓 */
const POLITICS_LEGAL_TITLES: LineRankTitle[] = [
  { title: '司法所员',          deputyTitle: '—',            unitType: '乡镇司法所',   historyLabel: '司法所员',        promotionAnnouncement: '任命为乡镇司法所工作人员' },
  { title: '派出所副所长',      deputyTitle: '—',            unitType: '公安派出所',   historyLabel: '派出所副所长',    promotionAnnouncement: '任命为派出所副所长' },
  { title: '乡镇政法委员',      deputyTitle: '治安助理',     unitType: '乡镇党委',     historyLabel: '乡镇政法委员',    promotionAnnouncement: '任命为乡镇党委政法委员' },
  { title: '县委政法委副书记',  deputyTitle: '公安局副局长', unitType: '县委政法委',   historyLabel: '县委政法委副书记', promotionAnnouncement: '任命为县委政法委副书记' },
  { title: '县委政法委书记',    deputyTitle: '政法委副书记', unitType: '县委政法委',   historyLabel: '县委政法委书记',  promotionAnnouncement: '任命为县委政法委书记' },
  { title: '市委常委（政法委书记）', deputyTitle: '政法委副书记', unitType: '市委政法委', historyLabel: '市委常委·政法委书记', promotionAnnouncement: '任命为市委常委、政法委书记' },
  { title: '市委政法委书记',    deputyTitle: '公安局长',     unitType: '市委政法委',   historyLabel: '市委政法委书记',  promotionAnnouncement: '任命为市委政法委书记' },
  { title: '省委常委（政法委书记）', deputyTitle: '省高院院长', unitType: '省委政法委', historyLabel: '省委常委·政法委书记', promotionAnnouncement: '任命为省委常委、政法委书记' },
  { title: '省委政法委书记',    deputyTitle: '省检察院检察长', unitType: '省委政法委', historyLabel: '省委政法委书记',  promotionAnnouncement: '任命为省委政法委书记' },
  { title: '中央政法委委员',    deputyTitle: '候补委员',     unitType: '中央政法委',   historyLabel: '中央政法委委员',  promotionAnnouncement: '当选中央政法委委员' },
  { title: '中央政法委副书记',  deputyTitle: '政法委委员',   unitType: '中央政法委',   historyLabel: '中央政法委副书记', promotionAnnouncement: '任命为中央政法委副书记' },
  { title: '中央政法委书记',    deputyTitle: '政法委副书记', unitType: '中央政法委',   historyLabel: '中央政法委书记',  promotionAnnouncement: '当选中央政法委书记' },
  { title: '最高人民法院院长',  deputyTitle: '副院长',       unitType: '最高人民法院', historyLabel: '最高法院长',      promotionAnnouncement: '当选最高人民法院院长' },
  { title: '首席大法官',        deputyTitle: '副院长',       unitType: '最高司法机构', historyLabel: '首席大法官',      promotionAnnouncement: '出任首席大法官' },
  { title: '终身首席大法官 · 司法最高权威', deputyTitle: '最高法副院长', unitType: '最高司法体系', historyLabel: '终身首席大法官', promotionAnnouncement: '荣任终身首席大法官' },
];

const LINE_TITLE_MAP: Record<CareerLineName, LineRankTitle[]> = {
  '行政线': ADMIN_TITLES,
  '党务线': PARTY_TITLES,
  '纪检线': DISCIPLINE_TITLES,
  '团派线': LEAGUE_TITLES,
  '政法线': POLITICS_LEGAL_TITLES,
};

/**
 * 获取某条线某职级的称谓（rankLevel 1-based，最大15）
 */
export function getLineRankTitle(line: CareerLineName, rankLevel: number): LineRankTitle {
  const titles = LINE_TITLE_MAP[line];
  const idx = Math.max(0, Math.min(rankLevel - 1, titles.length - 1));
  return titles[idx];
}

/**
 * 按 careerPath 键名获取路线名
 */
export function getLineNameByPath(careerPath: string): CareerLineName {
  const map: Record<string, CareerLineName> = {
    government: '行政线', party: '党务线', discipline: '纪检线', league: '团派线',
  };
  return map[careerPath] ?? '行政线';
}
