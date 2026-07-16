// tests/factories/PlayerFactory.ts
import type { Player, RankLevel, CareerLine } from '@/domains/shared/types';
import { PartySchoolCertificate, Tenure, KPIScore } from '@/domains/career/entities/PlayerCareer';

let playerIdCounter = 1000;

export class PlayerFactory {
  private static generateId(): string {
    return `test-player-${playerIdCounter++}`;
  }

  static create(overrides: Partial<Player> = {}): Player {
    const id = this.generateId();
    const now = Date.now();

    return {
      id,
      userId: `test-user-${id}`,
      version: 1,
      profile: {
        playerName: '测试玩家',
        avatarId: 1,
        avatarUrl: '',
        gender: 'male',
        birthYear: 1995,
        birthProvince: '浙江',
        birthCity: '杭州',
        universityName: '浙江大学',
        ...overrides.profile,
      },
      career: {
        rankLevel: 1,
        rankName: '科员',
        careerPath: 'government',
        careerPathLine: '行政线',
        playerPosition: '科员',
        cityName: '某镇',
        tenure: Tenure.create(0, 3, now),
        certificates: [
          PartySchoolCertificate.create(1, 1, now - 86400000000),
        ],
        isPromotionAvailable: false,
        preferredCareerLine: '行政线',
        ...overrides.career,
      },
      attributes: {
        abilityValue: 40,
        moralValue: 50,
        healthValue: 100,
        meritPoints: 100,
        bossFavor: 60,
        boss2Favor: 55,
        boss3Favor: 50,
        ...overrides.attributes,
      },
      resources: {
        personalSavings: 50000,
        providentFundBalance: 20000,
        grayIncome: 0,
        cityGovFund: 1000,
        fundBalance: 100000,
        taxRevenue: 500000,
        ...overrides.resources,
      },
      political: {
        primaryFaction: null,
        factionInternalRank: null,
        factionPoints: 0,
        inspectionRisk: 10,
        briberyAccepted: 0,
        exceptionalAgeOverrideCount: 0,
        partyCongressVote: 0,
        voteSupport: 0,
        ...overrides.political,
      },
      timeline: {
        gameDays: 100,
        lastMonthDay: 90,
        lastSalaryDay: 100,
        lastAnnualBonusDay: 0,
        retirementAge: 60,
        isRetired: false,
        ...overrides.timeline,
      },
      ...overrides,
    };
  }

  static readyForPromotion(overrides: Partial<Player> = {}): Player {
    const player = this.create({
      career: {
        rankLevel: 4,
        rankName: '副科级',
        careerPath: 'government',
        careerPathLine: '行政线',
        playerPosition: '副科长',
        cityName: '某县',
        tenure: Tenure.create(5, 5, Date.now() - 365 * 5 * 86400000),
        certificates: [
          PartySchoolCertificate.create(2, 1, Date.now() - 86400000000),
        ],
        isPromotionAvailable: true,
        ...overrides.career,
      },
      attributes: {
        abilityValue: 50,
        moralValue: 60,
        healthValue: 100,
        meritPoints: 500,
        bossFavor: 70,
        boss2Favor: 65,
        boss3Favor: 60,
        ...overrides.attributes,
      },
      political: {
        voteSupport: 80,
        partyCongressVote: 85,
        ...overrides.political,
      },
      timeline: {
        gameDays: 365 * 5 + 100,
        massIncidentCount: 1,
        ...overrides.timeline,
      },
      ...overrides,
    });

    return player;
  }

  static atRank(rankLevel: RankLevel, overrides: Partial<Player> = {}): Player {
    const configs: Record<number, { name: string; minMerit: number; tenure: number; minAge: number }> = {
      1: { name: '科员', minMerit: 50, tenure: 3, minAge: 22 },
      2: { name: '办事员', minMerit: 80, tenure: 3, minAge: 22 },
      3: { name: '主任科员', minMerit: 120, tenure: 4, minAge: 25 },
      4: { name: '副科级', minMerit: 200, tenure: 5, minAge: 27 },
      5: { name: '正科级', minMerit: 350, tenure: 5, minAge: 30 },
      6: { name: '县委书记/县长', minMerit: 600, tenure: 5, minAge: 32 },
      7: { name: '副厅级', minMerit: 1000, tenure: 5, minAge: 35 },
      8: { name: '正厅级', minMerit: 1600, tenure: 5, minAge: 40 },
      9: { name: '市委书记/市长', minMerit: 2500, tenure: 5, minAge: 42 },
      10: { name: '副部级', minMerit: 4000, tenure: 5, minAge: 45 },
      11: { name: '正部级', minMerit: 6000, tenure: 5, minAge: 48 },
      12: { name: '副国级', minMerit: 9000, tenure: 5, minAge: 50 },
      13: { name: '正国级', minMerit: 13000, tenure: 5, minAge: 52 },
      14: { name: '副国家级', minMerit: 18000, tenure: 5, minAge: 55 },
      15: { name: '正国家级', minMerit: 25000, tenure: 5, minAge: 58 },
    };

    const cfg = configs[rankLevel] ?? configs[1];

    return this.create({
      career: {
        rankLevel,
        rankName: cfg.name,
        tenure: Tenure.create(cfg.tenure, cfg.tenure, Date.now() - 365 * cfg.tenure * 86400000),
        isPromotionAvailable: rankLevel < 15,
        ...overrides.career,
      },
      attributes: {
        abilityValue: cfg.minAge <= 30 ? 40 : cfg.minAge <= 45 ? 55 : 70,
        moralValue: 60,
        meritPoints: cfg.minMerit,
        ...overrides.attributes,
      },
      timeline: {
        gameDays: 365 * cfg.tenure + 100,
        massIncidentCount: rankLevel >= 9 ? rankLevel - 8 : 0,
        ...overrides.timeline,
      },
      ...overrides,
    });
  }

  static withLine(line: CareerLine, overrides: Partial<Player> = {}): Player {
    const base = this.readyForPromotion(overrides);
    base.career.careerPathLine = line;
    base.career.preferredCareerLine = line;
    return base;
  }

  static withFaction(faction: 'reform' | 'pragmatic' | 'league' | 'princeling', overrides: Partial<Player> = {}): Player {
    return this.create({
      political: {
        primaryFaction: faction,
        factionInternalRank: 'member',
        factionPoints: 10,
        ...overrides.political,
      },
      ...overrides,
    });
  }

  static youngPlayer(overrides: Partial<Player> = {}): Player {
    return this.create({
      profile: {
        birthYear: new Date().getFullYear() - 24,
        ...overrides.profile,
      },
      ...overrides,
    });
  }

  static nearRetirement(overrides: Partial<Player> = {}): Player {
    return this.create({
      profile: {
        birthYear: new Date().getFullYear() - 58,
        ...overrides.profile,
      },
      timeline: {
        isRetired: false,
        retirementAge: 60,
        ...overrides.timeline,
      },
      ...overrides,
    });
  }
}