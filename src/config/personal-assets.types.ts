/**
 * 个人资产配置类型（对应 src/config/personal-assets.json）
 * 调整游戏数值只需编辑 personal-assets.json，无需改业务代码。
 */

/** 房产配置 */
interface HouseItemConfig {
  /** 资产唯一 key，存储在 save.personalAssets 数组中 */
  key: string;
  /** 显示名称 */
  name: string;
  /** 所在城市 */
  city: string;
  /** 建筑面积（㎡） */
  area: number;
  /** 购入总价（元） */
  price: number;
  /** 月租金（元） */
  monthlyRent: number;
  /** 年化升值率（0.03 = 3%/年） */
  appreciation: number;
  /** 最低职级要求 */
  minRank: number;
  /** 持有该资产增加的廉洁风险点数 */
  riskAdd: number;
  /** 简介 */
  desc: string;
}

/** 股权配置 */
interface StockItemConfig {
  key: string;
  name: string;
  /** 股权类型（固定收益/股票市场/非上市股权/间接持股） */
  type: string;
  /** 投入金额（元） */
  invest: number;
  /** 年化回报率（可为负） */
  annualReturn: number;
  /** 月度波动系数（±volatility 随机浮动） */
  volatility: number;
  minRank: number;
  riskAdd: number;
  desc: string;
}

/** 境外资产配置 */
interface OverseasItemConfig {
  key: string;
  name: string;
  /** 所在国家/地区 */
  country: string;
  /** 购入成本（元） */
  cost: number;
  /** 年化回报率 */
  annualReturn: number;
  minRank: number;
  /** 廉洁风险（境外资产敏感度高） */
  riskAdd: number;
  desc: string;
  /** 合规警告文字 */
  legalWarning: string;
}

interface PersonalAssetsConfig {
  HOUSES: HouseItemConfig[];
  STOCKS: StockItemConfig[];
  OVERSEAS: OverseasItemConfig[];
}
