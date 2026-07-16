import type { Player, PlayerPatches } from '@/domains/shared/types';

export interface PlayerSaveDTO {
  [key: string]: any;
}

export class PlayerMapper {
  toDomain(dto: PlayerSaveDTO): Player {
    return {
      id: dto.id,
      userId: dto.user_id ?? '',
      version: dto.version ?? 1,
      profile: {
        playerName: dto.player_name ?? '',
        avatarId: dto.avatar_id ?? 1,
        avatarUrl: dto.avatar_url ?? '',
        gender: dto.gender ?? 'male',
        birthYear: dto.birth_year ?? 1990,
        birthProvince: dto.birth_province ?? '',
        birthCity: dto.birth_city ?? '',
        universityName: dto.university_name ?? '',
      },
      career: {
        rankLevel: dto.rank_level as any,
        rankName: dto.rank_name ?? '',
        careerPath: dto.career_path ?? 'government',
        careerPathLine: dto.career_path_line ?? '行政线',
        playerPosition: dto.player_position ?? '',
        cityName: dto.city_name ?? '',
        cityType: dto.city_type ?? '',
        tenureYears: dto.tenure_years ?? 0,
        tenureMaxYears: dto.tenure_max_years ?? 5,
        tenureStartDay: dto.tenure_start_day ?? 0,
        certificates: (dto.certificates ?? []) as any[],
        isPromotionAvailable: dto.is_promotion_available ?? false,
        promotionReadyAt: null,
        preferredCareerLine: dto.preferred_career_line ?? null,
      },
      attributes: {
        abilityValue: dto.ability_value ?? 40,
        moralValue: dto.moral_value ?? 50,
        healthValue: dto.health_value ?? 100,
        meritPoints: dto.merit_points ?? 0,
        bossFavor: dto.boss_favor ?? 50,
        boss2Favor: dto.boss2_favor ?? 45,
        boss3Favor: dto.boss3_favor ?? 40,
      },
      resources: {
        personalSavings: dto.personal_savings ?? 0,
        providentFundBalance: dto.provident_fund_balance ?? 0,
        grayIncome: dto.gray_income ?? 0,
        cityGovFund: dto.city_gov_fund ?? 0,
        fundBalance: dto.fund_balance ?? 0,
        taxRevenue: dto.tax_revenue ?? 0,
      },
      political: {
        primaryFaction: dto.primary_faction ?? null,
        factionInternalRank: dto.faction_internal_rank ?? null,
        factionPoints: dto.faction_points ?? 0,
        inspectionRisk: dto.inspection_risk ?? 10,
        briberyAccepted: dto.bribery_accepted ?? 0,
        exceptionalAgeOverrideCount: dto.exceptional_age_override_count ?? 0,
        partyCongressVote: dto.party_congress_vote ?? 0,
        voteSupport: dto.vote_support ?? 0,
      },
      timeline: {
        gameDays: dto.game_days ?? 0,
        lastMonthDay: dto.last_month_day ?? 0,
        lastSalaryDay: dto.last_salary_day ?? 0,
        lastAnnualBonusDay: dto.last_annual_bonus_day ?? 0,
        retirementAge: dto.retirement_age ?? 60,
        isRetired: dto.is_retired ?? false,
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
      tenure_years: player.career.tenureYears,
      tenure_max_years: player.career.tenureMaxYears,
      tenure_start_day: player.career.tenureStartDay,
      certificates: player.career.certificates,
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