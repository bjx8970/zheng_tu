import type { Player, PlayerProfile, CareerState, Attributes, Resources, PoliticalState, GameTimeline, PlayerPatches } from '@/domains/shared/types';
import { PartySchoolCertificate, Tenure, KPIScore } from '@/domains/career/entities/PlayerCareer';

export interface PlayerSaveDTO {
  id: string;
  user_id: string;
  version: number;
  // profile
  player_name: string;
  avatar_id: number;
  avatar_url: string;
  gender: 'male' | 'female';
  birth_year: number;
  birth_province: string;
  birth_city: string;
  university_name: string;
  // career
  rank_level: number;
  rank_name: string;
  career_path: string;
  career_path_line: string;
  player_position: string;
  city_name: string;
  tenure_years: number;
  tenure_max_years: number;
  tenure_start_day: number;
  certificates: Array<{ party_school_level: number; required_level: number; obtained_at: number | null }>;
  is_promotion_available: boolean;
  preferred_career_line: string | null;
  // attributes
  ability_value: number;
  moral_value: number;
  health_value: number;
  merit_points: number;
  boss_favor: number;
  boss2_favor: number;
  boss3_favor: number;
  // resources
  personal_savings: number;
  provident_fund_balance: number;
  gray_income: number;
  city_gov_fund: number;
  fund_balance: number;
  tax_revenue: number;
  // political
  primary_faction: string | null;
  faction_internal_rank: string | null;
  faction_points: number;
  inspection_risk: number;
  bribery_accepted: number;
  exceptional_age_override_count: number;
  party_congress_vote: number;
  vote_support: number;
  // timeline
  game_days: number;
  last_month_day: number;
  last_salary_day: number;
  last_annual_bonus_day: number;
  retirement_age: number;
  is_retired: boolean;
  // metadata
  created_at: string;
  updated_at: string;
}

export class PlayerMapper {
  toDomain(dto: PlayerSaveDTO): Player {
    return {
      id: dto.id,
      userId: dto.user_id,
      version: dto.version,
      profile: {
        playerName: dto.player_name,
        avatarId: dto.avatar_id,
        avatarUrl: dto.avatar_url,
        gender: dto.gender,
        birthYear: dto.birth_year,
        birthProvince: dto.birth_province,
        birthCity: dto.birth_city,
        universityName: dto.university_name,
      },
      career: {
        rankLevel: dto.rank_level as any,
        rankName: dto.rank_name,
        careerPath: dto.career_path as any,
        careerPathLine: dto.career_path_line as any,
        playerPosition: dto.player_position,
        cityName: dto.city_name,
        tenure: Tenure.create(dto.tenure_years, dto.tenure_max_years, dto.tenure_start_day),
        certificates: dto.certificates.map(c => 
          PartySchoolCertificate.create(c.party_school_level, c.required_level, c.obtained_at)
        ),
        isPromotionAvailable: dto.is_promotion_available,
        preferredCareerLine: dto.preferred_career_line as any,
      },
      attributes: {
        abilityValue: dto.ability_value,
        moralValue: dto.moral_value,
        healthValue: dto.health_value,
        meritPoints: dto.merit_points,
        bossFavor: dto.boss_favor,
        boss2Favor: dto.boss2_favor,
        boss3Favor: dto.boss3_favor,
      },
      resources: {
        personalSavings: dto.personal_savings,
        providentFundBalance: dto.provident_fund_balance,
        grayIncome: dto.gray_income,
        cityGovFund: dto.city_gov_fund,
        fundBalance: dto.fund_balance,
        taxRevenue: dto.tax_revenue,
      },
      political: {
        primaryFaction: dto.primary_faction,
        factionInternalRank: dto.faction_internal_rank as any,
        factionPoints: dto.faction_points,
        inspectionRisk: dto.inspection_risk,
        briberyAccepted: dto.bribery_accepted,
        exceptionalAgeOverrideCount: dto.exceptional_age_override_count,
        partyCongressVote: dto.party_congress_vote,
        voteSupport: dto.vote_support,
      },
      timeline: {
        gameDays: dto.game_days,
        lastMonthDay: dto.last_month_day,
        lastSalaryDay: dto.last_salary_day,
        lastAnnualBonusDay: dto.last_annual_bonus_day,
        retirementAge: dto.retirement_age,
        isRetired: dto.is_retired,
      },
    };
  }

  toDTO(player: Player): PlayerSaveDTO {
    return {
      id: player.id,
      user_id: player.userId,
      version: player.version,
      player_name: player.profile.playerName,
      avatar_id: player.profile.avatarId,
      avatar_url: player.profile.avatarUrl,
      gender: player.profile.gender,
      birth_year: player.profile.birthYear,
      birth_province: player.profile.birthProvince,
      birth_city: player.profile.birthCity,
      university_name: player.profile.universityName,
      rank_level: player.career.rankLevel,
      rank_name: player.career.rankName,
      career_path: player.career.careerPath,
      career_path_line: player.career.careerPathLine,
      player_position: player.career.playerPosition,
      city_name: player.career.cityName,
      tenure_years: player.career.tenure.years,
      tenure_max_years: player.career.tenure.maxYears,
      tenure_start_day: player.career.tenure.props.startDay,
      certificates: player.career.certificates.map(c => ({
        party_school_level: c.props.partySchoolLevel,
        required_level: c.props.requiredLevel,
        obtained_at: c.props.obtainedAt,
      })),
      is_promotion_available: player.career.isPromotionAvailable,
      preferred_career_line: player.career.preferredCareerLine,
      ability_value: player.attributes.abilityValue,
      moral_value: player.attributes.moralValue,
      health_value: player.attributes.healthValue,
      merit_points: player.attributes.meritPoints,
      boss_favor: player.attributes.bossFavor,
      boss2_favor: player.attributes.boss2Favor,
      boss3_favor: player.attributes.boss3Favor,
      personal_savings: player.resources.personalSavings,
      provident_fund_balance: player.resources.providentFundBalance,
      gray_income: player.resources.grayIncome,
      city_gov_fund: player.resources.cityGovFund,
      fund_balance: player.resources.fundBalance,
      tax_revenue: player.resources.taxRevenue,
      primary_faction: player.political.primaryFaction,
      faction_internal_rank: player.political.factionInternalRank,
      faction_points: player.political.factionPoints,
      inspection_risk: player.political.inspectionRisk,
      bribery_accepted: player.political.briberyAccepted,
      exceptional_age_override_count: player.political.exceptionalAgeOverrideCount,
      party_congress_vote: player.political.partyCongressVote,
      vote_support: player.political.voteSupport,
      game_days: player.timeline.gameDays,
      last_month_day: player.timeline.lastMonthDay,
      last_salary_day: player.timeline.lastSalaryDay,
      last_annual_bonus_day: player.timeline.lastAnnualBonusDay,
      retirement_age: player.timeline.retirementAge,
      is_retired: player.timeline.isRetired,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }

  patchesToDTO(patches: PlayerPatches): Partial<PlayerSaveDTO> {
    const dto: Partial<PlayerSaveDTO> = {};

    if (patches.career) {
      const c = patches.career;
      if (c.rankLevel !== undefined) dto.rank_level = c.rankLevel;
      if (c.rankName !== undefined) dto.rank_name = c.rankName;
      if (c.careerPath !== undefined) dto.career_path = c.careerPath;
      if (c.careerPathLine !== undefined) dto.career_path_line = c.careerPathLine;
      if (c.playerPosition !== undefined) dto.player_position = c.playerPosition;
      if (c.cityName !== undefined) dto.city_name = c.cityName;
      if (c.tenureYears !== undefined) dto.tenure_years = c.tenureYears;
      if (c.isPromotionAvailable !== undefined) dto.is_promotion_available = c.isPromotionAvailable;
      if (c.preferredCareerLine !== undefined) dto.preferred_career_line = c.preferredCareerLine;
      if (c.tenure) {
        dto.tenure_years = c.tenure.years;
        dto.tenure_max_years = c.tenure.maxYears;
        dto.tenure_start_day = c.tenure.props.startDay;
      }
      if (c.certificates) {
        dto.certificates = c.certificates.map(cert => ({
          party_school_level: cert.props.partySchoolLevel,
          required_level: cert.props.requiredLevel,
          obtained_at: cert.props.obtainedAt,
        }));
      }
    }

    if (patches.attributes) {
      const a = patches.attributes;
      if (a.abilityValue !== undefined) dto.ability_value = a.abilityValue;
      if (a.moralValue !== undefined) dto.moral_value = a.moralValue;
      if (a.healthValue !== undefined) dto.health_value = a.healthValue;
      if (a.meritPoints !== undefined) dto.merit_points = a.meritPoints;
      if (a.bossFavor !== undefined) dto.boss_favor = a.bossFavor;
      if (a.boss2Favor !== undefined) dto.boss2_favor = a.boss2Favor;
      if (a.boss3Favor !== undefined) dto.boss3_favor = a.boss3Favor;
    }

    if (patches.resources) {
      const r = patches.resources;
      if (r.personalSavings !== undefined) dto.personal_savings = r.personalSavings;
      if (r.providentFundBalance !== undefined) dto.provident_fund_balance = r.providentFundBalance;
      if (r.grayIncome !== undefined) dto.gray_income = r.grayIncome;
      if (r.cityGovFund !== undefined) dto.city_gov_fund = r.cityGovFund;
      if (r.fundBalance !== undefined) dto.fund_balance = r.fundBalance;
      if (r.taxRevenue !== undefined) dto.tax_revenue = r.taxRevenue;
      if (r.grayIncome !== undefined) dto.gray_income = r.grayIncome;
    }

    if (patches.political) {
      const p = patches.political;
      if (p.primaryFaction !== undefined) dto.primary_faction = p.primaryFaction;
      if (p.factionInternalRank !== undefined) dto.faction_internal_rank = p.factionInternalRank;
      if (p.factionPoints !== undefined) dto.faction_points = p.factionPoints;
      if (p.inspectionRisk !== undefined) dto.inspection_risk = p.inspectionRisk;
      if (p.briberyAccepted !== undefined) dto.bribery_accepted = p.briberyAccepted;
      if (p.exceptionalAgeOverrideCount !== undefined) dto.exceptional_age_override_count = p.exceptionalAgeOverrideCount;
      if (p.partyCongressVote !== undefined) dto.party_congress_vote = p.partyCongressVote;
      if (p.voteSupport !== undefined) dto.vote_support = p.voteSupport;
    }

    if (patches.timeline) {
      const t = patches.timeline;
      if (t.gameDays !== undefined) dto.game_days = t.gameDays;
      if (t.lastMonthDay !== undefined) dto.last_month_day = t.lastMonthDay;
      if (t.lastSalaryDay !== undefined) dto.last_salary_day = t.lastSalaryDay;
      if (t.lastAnnualBonusDay !== undefined) dto.last_annual_bonus_day = t.lastAnnualBonusDay;
      if (t.isRetired !== undefined) dto.is_retired = t.isRetired;
    }

    return dto;
  }
}