// 游戏数据库操作API
import { supabase } from '@/client/supabase';
import type { PlayerSave, Subordinate, BossTask, EventRecord, PoliceCase, FamilyMember, DeptKey, MonthlyMeeting, MeetingTask, Secretary, CityFinance, LoanRecord, InvestmentRecord, RecruitCandidate, MonthlyReport, LeadershipMember, PetitionEvent, LeadershipBand, PlayerHealth, PartySchoolRecord, PartySchoolLevel, NationalPolicy, CityMetrics, CareerEntry } from '@/types/game';
import { RANK_CONFIG, DEFAULT_CITY_BY_LEVEL, SUB_TRAITS, DEPT_CONFIG, getDeptHeadTitle, getDeptDeputyTitle, getDeptNameByRank, getDeptPositionSubLevel, getDeptStaffRange, getZhongXuanDiaoStartRank, BAND_POSITIONS, GOVT_POSITIONS, NDA_POSITIONS, NPC_AGE_RANGE, RETIREMENT_AGE_MAP, PARTY_SCHOOL_CONFIG, NATIONAL_POLICY_POOL, randBirthPlace, pickUniversityName, npcSchoolTier, npcDegreeLabel, PROVINCE_LIST, PROVINCE_CITY_MAP, randRealStartTown, randRealStartTownByProvCity, RANK_INITIAL_FUND, RANK_MONTHLY_HEALTH_REGEN, RANK_DAILY_ENERGY_BONUS, ASSET_HEALTH_BONUS } from '@/types/game';

// 转换数据库行到PlayerSave
function rowToPlayerSave(row: Record<string, unknown>): PlayerSave {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    playerName: row.player_name as string,
    playerGender: (row.player_gender as string) ?? '男',
    playerAge: (row.player_age as number) ?? 22,
    playerBirthDay: (row.player_birth_day as number) ?? 0,
    avatarId: (row.avatar_id as number) ?? 0,
    school: (row.school as string) ?? '普通本科',
    needsCharacterCreation: (row.needs_character_creation as boolean) ?? true,
    // 个人档案
    birthYear:        (row.birth_year as number) ?? 0,
    birthProvince:    (row.birth_province as string) ?? '',
    birthCity:        (row.birth_city as string) ?? '',
    universityName:   (row.university_name as string) ?? '',
    rankLevel: row.rank_level as number,
    rankName: row.rank_name as string,
    meritPoints: row.merit_points as number,
    moralValue: row.moral_value as number,
    assessmentGrade: row.assessment_grade as PlayerSave['assessmentGrade'],
    tenureYears: row.tenure_years as number,
    tenureDays: row.tenure_days as number,
    maxTenureYears: row.max_tenure_years as number,
    gameDays: row.game_days as number,
    cityName: row.city_name as string,
    cityGdp: row.city_gdp as number,
    cityLivelihood: row.city_livelihood as number,
    cityEcology: row.city_ecology as number,
    cityBusiness: row.city_business as number,
    policeForce: row.police_force as number,
    securityIndex: row.security_index as number,
    policeChiefName: row.police_chief_name as string | null,
    reformFaction: row.reform_faction as number,
    pragmaticFaction: row.pragmatic_faction as number,
    cylRelation: (row.cyl_relation as number) ?? 30,
    technoRelation: (row.techno_relation as number) ?? 30,
    localRelation: (row.local_relation as number) ?? 30,
    primaryFaction: (row.primary_faction as string) ?? '',
    factionProvinceMap: (row.faction_province_map as Record<string, string>) ?? {},
    bossName: row.boss_name as string,
    bossFavor: row.boss_favor as number,
    requiredMerit: row.required_merit as number,
    requiredTenureYears: row.required_tenure_years as number,
    isPromotionAvailable: row.is_promotion_available as boolean,
    isEventPending: row.is_event_pending as boolean,
    lastCompetitionEventDay: (row.last_competition_event_day as number) ?? 0,
    familyHappiness: (row.family_happiness as number) ?? 50,
    marriageStatus: (row.marriage_status as PlayerSave['marriageStatus']) ?? 'single',
    eventsThisYear: (row.events_this_year as number) ?? 0,
    lastRankDay: (row.last_rank_day as number) ?? 0,
    annualRankPct: (row.annual_rank_pct as number) ?? 50,
    isExcellentRank: (row.is_excellent_rank as boolean) ?? false,
    cityPopulation: (row.city_population as number) ?? 50000,
    residentIncome: (row.resident_income as number) ?? 50,
    eduLevel: (row.edu_level as number) ?? 50,
    healthcareRate: (row.healthcare_rate as number) ?? 50,
    housingRate: (row.housing_rate as number) ?? 50,
    fundBalance: (row.fund_balance as number) ?? 0,
    boss2Name: (row.boss2_name as string) ?? '',
    boss2Favor: (row.boss2_favor as number) ?? 50,
    boss3Name: (row.boss3_name as string) ?? '',
    boss3Favor: (row.boss3_favor as number) ?? 50,
    lastRecruitYear: (row.last_recruit_year as number) ?? 0,
    lastRecruitQuarter: (row.last_recruit_quarter as number) ?? 0,
    cityTaxRate: (row.city_tax_rate as number) ?? 0.12,
    cityTaxIncome: (row.city_tax_income as number) ?? 0,
    taxRevenue: Number((row.tax_revenue as string | number) ?? 0),
    lastMonthDay: (row.last_month_day as number) ?? 0,
    kpiGdpTarget: (row.kpi_gdp_target as number) ?? 0,
    kpiLivelihoodTarget: (row.kpi_livelihood_target as number) ?? 0,
    kpiEcologyTarget: (row.kpi_ecology_target as number) ?? 0,
    kpiBusinessTarget: (row.kpi_business_target as number) ?? 0,
    kpiYear: (row.kpi_year as number) ?? 0,
    subVisitPending: (row.sub_visit_pending as boolean) ?? false,
    subVisitSubId: (row.sub_visit_sub_id as string) ?? null,
    subVisitSubName: (row.sub_visit_sub_name as string) ?? null,
    lastPersonnelYear: (row.last_personnel_year as number) ?? 0,
    deptReportDay: (row.dept_report_day as number) ?? 0,
    lastExchangeDay: (row.last_exchange_day as number) ?? 0,
    lastMinistryRotateDay: (row.last_ministry_rotate_day as number) ?? 0,
    spouseRelationValue: (row.spouse_relation_value as number) ?? 50,
    marriageDay: (row.marriage_day as number) ?? 0,
    playerPosition: (row.player_position as string) ?? (row.rank_name as string) ?? '',
    concurrentPosts: (row.concurrent_posts as string[]) ?? [],
    voteSupport: (row.vote_support as number) ?? 0,
    lastVoteDay: (row.last_vote_day as number) ?? 0,
    partyCongressVote: (row.party_congress_vote as number) ?? 0,
    lastPartyCongressDay: (row.last_party_congress_day as number) ?? 0,
    nationalTermsServed: (row.national_terms_served as number) ?? 0,
    careerPath: (row.career_path as string) ?? '',
    nationalGdp: (row.national_gdp as number) ?? 1200000,
    sciTechInvestTotal: (row.sci_tech_invest_total as number) ?? 0,
    sciTechResearchDir: (row.sci_tech_research_dir as string) ?? '',
    sciTechProgress: (row.sci_tech_progress as number) ?? 0,
    sciTechLastActDay: (row.sci_tech_last_act_day as number) ?? 0,
    disciplineLastActDay: (row.discipline_last_act_day as number) ?? 0,
    kpiRankingYear: (row.kpi_ranking_year as number) ?? 0,
    kpiRankingResult: (row.kpi_ranking_result as string) ?? '',
    lastAnnualPromoteYear: (row.last_annual_promote_year as number) ?? 0,
    personalSavings: Number((row.personal_savings as string | number) ?? 0),
    personalAssets: (row.personal_assets as string[]) ?? [],
    lastSalaryDay: (row.last_salary_day as number) ?? 0,
    providentFundBalance: Number((row.provident_fund_balance as string | number) ?? 0),
    lastAnnualBonusDay: (row.last_annual_bonus_day as number) ?? 0,
    retirementDelayYears: (row.retirement_delay_years as number) ?? 0,
    isRetired: (row.is_retired as boolean) ?? false,
    // 上司生命周期
    bossTenureStart: (row.boss_tenure_start as number) ?? 0,
    bossTenureDuration: (row.boss_tenure_duration as number) ?? 1460,
    boss2TenureStart: (row.boss2_tenure_start as number) ?? 0,
    boss2TenureDuration: (row.boss2_tenure_duration as number) ?? 1460,
    boss3TenureStart: (row.boss3_tenure_start as number) ?? 0,
    boss3TenureDuration: (row.boss3_tenure_duration as number) ?? 1460,
    // 纪委风险追踪
    lastDisciplineWarnDay: (row.last_discipline_warn_day as number) ?? 0,
    lastCaseCheckDay: (row.last_case_check_day as number) ?? 0,
    // 重大事故风险
    consecutiveFailEvents: (row.consecutive_fail_events as number) ?? 0,
    consecutiveExcellentYears: (row.consecutive_excellent_years as number) ?? 0,
    // Game Over
    gameOverType: (row.game_over_type as PlayerSave['gameOverType']) ?? null,
    // 代会换届
    lastCongressDay: (row.last_congress_day as number) ?? 0,
    // 关系积分
    alumniScore: (row.alumni_score as number) ?? 0,
    // 交流干部自动模式
    exchangeAutoMode: ((row.exchange_auto_mode as string) ?? 'manual') as 'manual' | 'auto-accept' | 'auto-decline',
    // 累计平调次数
    lateralCount: (row.lateral_count as number) ?? 0,
    // 任期KPI不及格次数
    kpiFailedTerms: (row.kpi_failed_terms as number) ?? 0,
    // 当前地方连续任期届数
    sameLocTerms: (row.same_loc_terms as number) ?? 0,
    // 上月事件连锁key
    lastEventChainKey: (row.last_event_chain_key as string) ?? '',
    // 人脉值
    networkValue: (row.network_value as number) ?? 0,
    // 相亲NPC列表
    blindDateNpcs: (row.blind_date_npcs as import('../types/game').BlindDateNpc[]) ?? [],
    // 怀孕起始天
    pregnantDay: (row.pregnant_day as number) ?? 0,
    // 民生历史快照
    livelihoodSnapshots: (row.livelihood_snapshots as import('../types/game').LivelihoodSnapshot[]) ?? [],
    // 任职途径
    careerLine: ((row.career_line as string) === '中央' ? '中央' : '地方') as '地方' | '中央',
    ministryName: (row.ministry_name as string) ?? '',
    lastStaffQuotaYear: (row.last_staff_quota_year as number) ?? 0,
    staffApplyBits: (row.staff_apply_bits as number) ?? 0,
    // 内阁分管线（rank13=四条线之一，rank14+=null全管）
    cabinetTrack: (row.cabinet_track as 'economy' | 'social' | 'hmt' | 'military' | null) ?? null,
    // rank15路线专权行动冷却记录
    r15ActionCooldowns: (row.r15_action_cooldowns as Record<string, number>) ?? {},
    supremeLeaderCooldowns: (row.supreme_leader_cooldowns as Record<string, number>) ?? {},
    // 待展示全国性舆情事件
    pendingOpinionEvent: (row.pending_opinion_event as { type: string; title: string; desc: string; gameDays: number } | null) ?? null,
    // 破格晋升错过任期次数 + 破格奖惩 + 述职核心指标
    exceptionalMissedTerms: (row.exceptional_missed_terms as number) ?? 0,
    exceptionalPromoBonus: (row.exceptional_promo_bonus as number) ?? 0,
    annualDebriefTargetKey: (row.annual_debrief_target_key as string) ?? '',
    annualDebriefTargetValue: (row.annual_debrief_target_value as number) ?? 0,
    // 上司施政风格派系
    bossFaction: ((row.boss_faction as string) ?? '实干派') as PlayerSave['bossFaction'],
    // 秘书连续自动施政月数
    secAutoConsecutiveMonths: (row.sec_auto_consecutive_months as number) ?? 0,
    secAutoGovEnabled: (row.sec_auto_gov_enabled as boolean) ?? false,
    secAutoRecruitEnabled: (row.sec_auto_recruit_enabled as boolean) ?? false,
    // 应急编制到期游戏天
    emergencyStaffExpiry: (row.emergency_staff_expiry as number) ?? 0,
    // 家庭背景、军转干部、能力值、健康值
    familyBackground: (row.family_background as string) ?? '普通家庭',
    isMilitaryTransfer: (row.is_military_transfer as boolean) ?? false,
    abilityValue: (row.ability_value as number) ?? 40,
    healthValue: (row.health_value as number) ?? 100,
    initFaction: (row.init_faction as string) ?? '',
    initialDeptKey: (row.initial_dept_key as DeptKey | null) ?? null,
    // ── v2.0 新系统字段 ──
    publicOpinionIndex:      (row.public_opinion_index as number)  ?? 60,
    inspectionRisk:          (row.inspection_risk as number)       ?? 0,
    lastInspectionDay:       (row.last_inspection_day as number)   ?? 0,
    isUnderInvestigation:    (row.is_under_investigation as boolean) ?? false,
    protectionUmbrellaLevel: (row.protection_umbrella_level as number) ?? 0,
    protectionUmbrellaName:  (row.protection_umbrella_name as string)  ?? '',
    landFinanceTotal:        (row.land_finance_total as number)    ?? 0,
    landParcelsSold:         (row.land_parcels_sold as number)     ?? 0,
    gdpPrimaryShare:         (row.gdp_primary_share as number)     ?? 10,
    gdpSecondaryShare:       (row.gdp_secondary_share as number)   ?? 45,
    gdpTertiaryShare:        (row.gdp_tertiary_share as number)    ?? 45,
    govDebtTotal:            (row.gov_debt_total as number)        ?? 0,
    massIncidentCount:       (row.mass_incident_count as number)   ?? 0,
    massIncidentPending:     (row.mass_incident_pending as number) ?? 0,
    factionInternalRank:     ((row.faction_internal_rank as string) ?? 'member') as 'member' | 'backbone' | 'leader',
    factionPoints:           (row.faction_points as number)        ?? 0,
    briberyAccepted:         (row.bribery_accepted as number)      ?? 0,
    briberyRejected:         (row.bribery_rejected as number)      ?? 0,
    inheritancePolitical:    (row.inheritance_political as number)  ?? 0,
    inheritanceNetwork:      (row.inheritance_network as number)    ?? 0,
    // v2.1 新增字段
    diplomacyPoints:              (row.diplomacy_points as number)          ?? 0,
    lastDiplomacyDay:             (row.last_diplomacy_day as number)        ?? 0,
    careerPathLine:               ((row.career_path_line as string) ?? '行政线') as '党务线' | '行政线' | '纪检线' | '团派线',
    preferredCareerLine:          ((row.preferred_career_line as string) ?? '行政线') as '党务线' | '行政线' | '纪检线' | '团派线',
    lineKpiScore:                 (row.line_kpi_score as number) ?? 0,
    careerPathCooldowns:          (() => { try { return JSON.parse((row.career_path_cooldowns as string) ?? '{}') as Record<string,number>; } catch { return {}; } })(),
    lineTaskState:                (() => { try { return JSON.parse((row.line_task_state as string) ?? '{}') as Record<string,{ startDay: number; completed: boolean }>; } catch { return {}; } })(),
    exceptionalAgeOverrideCount:  (row.exceptional_age_override_count as number) ?? 0,
    isDiplomacyActive:            (row.is_diplomacy_active as boolean)      ?? false,
    pendingBriberyEvent:          (() => { try { return JSON.parse((row.pending_bribery_event as string) ?? 'null') as { npcName: string; npcType: string; amount: number } | null; } catch { return null; } })(),
    // v2.6 新增字段
    grayIncomeTotal:              (row.gray_income_total as number)           ?? 0,
    investigationDay:             (row.investigation_day as number)           ?? 0,
    investigationEvidenceLevel:   (row.investigation_evidence_level as number) ?? 0,
    parentStatus:                 ((row.parent_status as string) ?? 'healthy') as 'healthy' | 'sick' | 'deceased',
    grayIncomeCooldowns:          (() => { try { return JSON.parse((row.gray_income_cooldowns as string) ?? '{}') as Record<string,number>; } catch { return {}; } })(),
    powerTradeCooldowns:          (() => { try { return JSON.parse((row.power_trade_cooldowns as string) ?? '{}') as Record<string,number>; } catch { return {}; } })(),
    personnelCooldowns:           (() => { try { return JSON.parse((row.personnel_cooldowns as string) ?? '{}') as Record<string,number>; } catch { return {}; } })(),
    npcVacancyNotices:            (() => { try { const v = row.npc_vacancy_notices; if (Array.isArray(v)) return v as string[]; return JSON.parse((v as string) ?? '[]') as string[]; } catch { return []; } })(),
    // v2.9 接班人系统
    gameOverVerdict:              (row.game_over_verdict as string | null) ?? null,
    lastInvestigationCheckDay:    (row.last_investigation_check_day as number) ?? 0,
    playerCareerHistory:          (() => { try { const v = row.player_career_history; if (Array.isArray(v)) return v; return JSON.parse((v as string) ?? '[]'); } catch { return []; } })() as { rankLevel: number; position: string; province: string; city: string; startDay: number; endDay: number | null }[],
    successorName:                (row.successor_name as string) ?? '',
    successorFaction:             (row.successor_faction as string) ?? '',
    successorSchool:              (row.successor_school as string) ?? '',
    successorRankLevel:           (row.successor_rank_level as number) ?? 0,
    successorAbility:             (row.successor_ability as number) ?? 0,
    successorLoyalty:             (row.successor_loyalty as number) ?? 0,
    successorInvestDays:          (row.successor_invest_days as number) ?? 0,
    successorLastActDay:          (row.successor_last_act_day as number) ?? 0,
    partyCongressAxis:            ((row.party_congress_axis as string) ?? '') as '经济优先' | '生态立国' | '安全强国' | '',
    partyCongressAxisDay:         (row.party_congress_axis_day as number) ?? 0,
    rankUnlockNotifiedLevel:      (row.rank_unlock_notified_level as number) ?? 0,
    partyMediaControlDay:         (row.party_media_control_day as number) ?? 0,
    mediaOvercontrolRisk:         (row.media_overcontrol_risk as number) ?? 0,
    orgDeptInsiderDay:            (row.org_dept_insider_day as number) ?? 0,
    orgInsiderTarget:             (row.org_insider_target as string) ?? '',
    orgInsiderTargets:            (row.org_insider_targets as string) ?? '[]',
    plenaryConferenceDay:         (row.plenary_conference_day as number) ?? 0,
    disciplineContractDay:        (row.discipline_contract_day as number) ?? 0,
    disciplineContractSigned:     (row.discipline_contract_signed as string) ?? '[]',
    // 政法线字段
    judicialStabilityIndex:       (row.judicial_stability_index as number) ?? 80,
    judicialPetitionBacklog:      (row.judicial_petition_backlog as number) ?? 0,
    judicialSweepCount:           (row.judicial_sweep_count as number) ?? 0,
    judicialSpeechControl:        (row.judicial_speech_control as number) ?? 0,
    judicialEvidenceLevel:        (row.judicial_evidence_level as number) ?? 0,
    judicialCoordCount:           (row.judicial_coord_count as number) ?? 0,
    informantCount:               (row.informant_count as number) ?? 0,
    lawEnforcePurgeCount:         (row.law_enforce_purge_count as number) ?? 0,
    deathReviewCount:             (row.death_review_count as number) ?? 0,
    judicialExtraCooldowns:       (row.judicial_extra_cooldowns as Record<string, number>) ?? {},
    cityGovFund:                (row.city_gov_fund as number) ?? 0,
    lineGrantLastYear:            (row.line_grant_last_year as number) ?? -1,
    grantApplicationLastYear:     (row.grant_application_last_year as number) ?? -1,
    performanceRewardLastYear:    (row.performance_reward_last_year as number) ?? -1,
    annualBudgetLastYear:         (row.annual_budget_last_year as number) ?? -1,
    lineKpiBonus:                 (row.line_kpi_bonus as number) ?? 0,
    cityGovFundAutoMonth:       (row.city_gov_fund_auto_month as number) ?? -1,
    secretaryCandidates:          (row.secretary_candidates as string) ?? '[]',
    secretaryCandidateRank:       (row.secretary_candidate_rank as number) ?? 0,
    corruptTotal:                 (row.corrupt_total as number) ?? 0,
    adminGovCooldowns:            (row.admin_gov_cooldowns as Record<string, number>) ?? {},
    discDeepCooldowns:            (row.disc_deep_cooldowns as Record<string, number>) ?? {},
    partyDeepCooldowns:           (row.party_deep_cooldowns as Record<string, number>) ?? {},
    leagueDeepCooldowns:          (row.league_deep_cooldowns as Record<string, number>) ?? {},
    discDeepResults:              (row.disc_deep_results as string) ?? '{}',
    partyDeepResults:             (row.party_deep_results as string) ?? '{}',
    leagueDeepResults:            (row.league_deep_results as string) ?? '{}',
    adminDeepCooldowns:           (row.admin_deep_cooldowns as Record<string, number>) ?? {},
    adminDeepResults:             (row.admin_deep_results as string) ?? '{}',
    actionResultsLog:             (row.action_results_log as string) ?? '{}',
    massIncidentResults:          (row.mass_incident_results as string) ?? '{}',
    policyPilotCount:             (row.policy_pilot_count as number) ?? 0,
    institutionReformCount:       (row.institution_reform_count as number) ?? 0,
    approvalRaceCount:            (row.approval_race_count as number) ?? 0,
    hallSatisfyCount:             (row.hall_satisfy_count as number) ?? 0,
    digitalGovBuilt:              (row.digital_gov_built as boolean) ?? false,
    digitalGovBuiltDay:           (row.digital_gov_built_day as number) ?? 0,
    infoPublicCount:              (row.info_public_count as number) ?? 0,
    adminLitigationCount:         (row.admin_litigation_count as number) ?? 0,
    inspectionCount:              (row.inspection_count as number) ?? 0,
    jointMeetingCount:            (row.joint_meeting_count as number) ?? 0,
    fiscalWarningCount:           (row.fiscal_warning_count as number) ?? 0,
    projectTypeCount:             (row.project_type_count as number) ?? 0,
    // 师承系统
    mentorName:                   (row.mentor_name as string) ?? '',
    mentorRankLevel:              (row.mentor_rank_level as number) ?? 0,
    mentorFaction:                (row.mentor_faction as string) ?? '',
    mentorAcquiredDay:            (row.mentor_acquired_day as number) ?? 0,
    mentorPromoted:               (row.mentor_promoted as boolean) ?? false,
    mentorRelation:               (row.mentor_relation as number) ?? 0,
    mentorLastContactDay:         (row.mentor_last_contact_day as number) ?? 0,
    // 门生系统
    protegeName:                  (row.protege_name as string) ?? '',
    protegeRankLevel:             (row.protege_rank_level as number) ?? 0,
    protegeAbility:               (row.protege_ability as number) ?? 0,
    protegeLoyalty:               (row.protege_loyalty as number) ?? 0,
    protegeInvestDays:            (row.protege_invest_days as number) ?? 0,
    protegeLastActDay:            (row.protege_last_act_day as number) ?? 0,
    protegePromotedDay:           (row.protege_promoted_day as number) ?? 0,
    // ── v2.10 政治局/常委/党代会 ──
    politburoSeat:                (row.politburo_seat as boolean) ?? false,
    lastPolitburoElectionYear:    (row.last_politburo_election_year as number) ?? -1,
    politburoVotes:               (row.politburo_votes as number) ?? 0,
    standingCommitteeRank:        (row.standing_committee_rank as number) ?? 0,
    lastStandingElectionYear:     (row.last_standing_election_year as number) ?? -1,
    standingRankDelta:            (row.standing_rank_delta as number) ?? 0,
    partyCongressYear:            (row.party_congress_year as number) ?? -1,
    partyCongressTopics:          (() => { try { const v = row.party_congress_topics; if (Array.isArray(v)) return v as string[]; return JSON.parse((v as string) ?? '[]') as string[]; } catch { return []; } })(),
    partyCongressEconBonus:       (row.party_congress_econ_bonus as number) ?? 0,
    partyCongressEcoBonus:        (row.party_congress_eco_bonus as number) ?? 0,
    partyCongressSecBonus:        (row.party_congress_sec_bonus as number) ?? 0,
    // ── v2.7 终局系统 ──
    politicalCapital:             (row.political_capital as number) ?? 0,
    majorProposals:               (row.major_proposals as string) ?? '[]',
    policyTools:                  (row.policy_tools as string) ?? '[]',
    policyFieldBonus:             (row.policy_field_bonus as string) ?? '{}',
    fiveYearPlanYear:             (row.five_year_plan_year as number) ?? -1,
    fiveYearPlanTopic:            (row.five_year_plan_topic as string) ?? '',
    fiveYearPlanPassed:           (row.five_year_plan_passed as boolean) ?? false,
    planProjectBonus:             (row.plan_project_bonus as string) ?? '{}',
    historicalEconScore:          (row.historical_econ_score as number) ?? 0,
    historicalLivelihoodScore:    (row.historical_livelihood_score as number) ?? 0,
    historicalIntegrityScore:     (row.historical_integrity_score as number) ?? 0,
    historicalReformScore:        (row.historical_reform_score as number) ?? 0,
    historicalLabel:              (row.historical_label as string) ?? '',
    legacyBonus:                  (row.legacy_bonus as number) ?? 0,
    retirementForced:             (row.retirement_forced as boolean) ?? false,
    retiredVoluntarily:           (row.retired_voluntarily as boolean) ?? false,
    namedLandmarks:               (row.named_landmarks as string) ?? '[]',
    routeVoteResult:              (row.route_vote_result as '' | 'economy' | 'balanced' | 'ecology' | 'security') ?? '',
    routeVoteDay:                 (row.route_vote_day as number) ?? 0,
    honorLevel:                   (row.honor_level as number) ?? 0,
    honorDay:                     (row.honor_day as number) ?? 0,
    memoirWritten:                (row.memoir_written as boolean) ?? false,
    memoirStyle:                  (row.memoir_style as '' | 'conservative' | 'moderate' | 'bold') ?? '',
    memoirInfluence:              (row.memoir_influence as number) ?? 0,
    professionalRankLevel:        (row.professional_rank_level as number) ?? 1,
    grassrootsExpYears:           (row.grassroots_exp_years as number) ?? 0,
    specialAssessScore:           (row.special_assess_score as number) ?? 0,
    democraticEvalScore:          (row.democratic_eval_score as number) ?? 0,
    slotWaitYears:                (row.slot_wait_years as number) ?? 0,
    // ── 家族系统 ──
    clanPrestige:        (row.clan_prestige as number)       ?? 0,
    clanHeritage:        (row.clan_heritage as number)       ?? 0,
    clanFund:            (row.clan_fund as number)           ?? 0,
    clanElderFavor:      (row.clan_elder_favor as number)    ?? 50,
    clanMemberCount:     (row.clan_member_count as number)   ?? 1,
    clanEventsLog:       (() => { try { const v = row.clan_events_log; if (Array.isArray(v)) return v as string[]; return JSON.parse((v as string) ?? '[]') as string[]; } catch { return []; } })(),
    clanIndustryLevel:   (row.clan_industry_level as number)  ?? 0,
    clanIndustryType:    (row.clan_industry_type as string)   ?? '',
    clanLastRitualDay:   (row.clan_last_ritual_day as number) ?? 0,
    clanLastMeetingDay:  (row.clan_last_meeting_day as number) ?? 0,
    lastDemoEvalDay:              (row.last_demo_eval_day as number) ?? 0,
    lastSpecialAssessDay:         (row.last_special_assess_day as number) ?? 0,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

function rowToSubordinate(row: Record<string, unknown>): Subordinate {
  // 从名字哈希推算特长（如未入库则动态派生）
  const derivedSpecialty = (() => {
    const name = (row.name as string) ?? '';
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) & 0xffff;
    const pool: import('@/types/game').CadreSpecialty[] = ['economy','social','legal','agriculture','tech','party','finance','military'];
    return pool[hash % pool.length];
  })();
  return {
    id: row.id as string,
    saveId: row.save_id as string,
    userId: row.user_id as string,
    name: row.name as string,
    position: row.position as string,
    role: row.role as string,
    avatarId: (row.avatar_id as number) ?? 0,
    gender: (row.gender as string) ?? '男',
    ability: row.ability as number,
    loyalty: row.loyalty as number,
    integrity: row.integrity as number,
    experience: row.experience as number,
    faction: ((row.faction as string) ?? 'reform') as import('@/types/game').Faction,
    subLevel: (row.sub_level as number) ?? 1,
    isAppointed: row.is_appointed as boolean,
    appointedRole: row.appointed_role as string | null,
    appointedDept: row.appointed_dept as DeptKey | null,
    deptPosition: ((row.dept_position as string) ?? 'head') as 'head' | 'deputy',
    transferredCity: (row.transferred_city as string) ?? null,
    lastAssessedDay: (row.last_assessed_day as number) ?? 0,
    createdAt: row.created_at as string,
    // ── 新增字段 ────────────────────────────────────────────────────────────
    specialty: ((row.specialty as string) ?? derivedSpecialty) as import('@/types/game').CadreSpecialty,
    isReserve: (row.is_reserve as boolean) ?? false,
    nominationStatus: ((row.nomination_status as string) ?? 'idle') as import('@/types/game').NominationStatus,
    nominationDept: (row.nomination_dept as DeptKey) ?? null,
    nominationPosition: (row.nomination_position as 'head' | 'deputy') ?? null,
    nominationStartDay: (row.nomination_start_day as number) ?? null,
    eventType: (row.event_type as import('@/types/game').SubEventType) ?? null,
    eventDay: (row.event_day as number) ?? null,
    eventHandled: (row.event_handled as boolean) ?? true,
    satisfaction: (row.satisfaction as number) ?? 60,
    lastReviewScores: (row.last_review_scores as string) ?? null,
    cadreAge: (row.cadre_age as number) ?? null,
    borrowedTo: (row.borrowed_to as string) ?? null,
    // ── 个人档案 ────────────────────────────────────────────────────────────
    birthYear: (row.birth_year as number) ?? null,
    university: (row.university as string) ?? null,
    major: (row.major as string) ?? null,
    hometown: (row.hometown as string) ?? null,
  };
}

function rowToBossTask(row: Record<string, unknown>): BossTask {
  return {
    id: row.id as string,
    saveId: row.save_id as string,
    userId: row.user_id as string,
    title: row.title as string,
    description: row.description as string,
    taskType: row.task_type as string,
    targetValue: row.target_value as number,
    currentValue: row.current_value as number,
    rewardMerit: row.reward_merit as number,
    rewardFavor: row.reward_favor as number,
    status: row.status as BossTask['status'],
    deadlineDays: row.deadline_days as number,
    createdDay: row.created_day as number,
    bossLevel: (row.boss_level as number) ?? 1,
    isPostponed: (row.is_postponed as boolean) ?? false,
    createdAt: row.created_at as string,
    urgency: (row.urgency as BossTask['urgency']) ?? 'normal',
    penaltyMerit: (row.penalty_merit as number) ?? 0,
    penaltyFavor: (row.penalty_favor as number) ?? 0,
  };
}

function rowToPoliceCase(row: Record<string, unknown>): PoliceCase {
  return {
    id: row.id as string,
    saveId: row.save_id as string,
    userId: row.user_id as string,
    title: row.title as string,
    description: row.description as string,
    caseType: row.case_type as PoliceCase['caseType'],
    difficulty: row.difficulty as number,
    requiredPolice: row.required_police as number,
    rewardMerit: row.reward_merit as number,
    securityChange: row.security_change as number,
    status: row.status as PoliceCase['status'],
    createdDay: row.created_day as number,
    solvedDay: row.solved_day as number | null,
    createdAt: row.created_at as string,
  };
}

// ============ 存档操作 ============

export async function getOrCreateSave(): Promise<PlayerSave | null> {
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) return null;

  const { data, error } = await supabase
    .from('player_saves')
    .select('*')
    .eq('user_id', user.user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) return null;
  if (data) return rowToPlayerSave(data as Record<string, unknown>);

  // 创建新存档（needsCharacterCreation = true，等待角色创建）
  const config = RANK_CONFIG[1];
  const cityName = randRealStartTown();
  const { data: newSave, error: createError } = await supabase
    .from('player_saves')
    .insert({
      user_id: user.user.id,
      player_name: '新官员',
      player_gender: '男',
      player_age: 22,
      player_birth_day: 0,
      avatar_id: 0,
      school: '普通本科',
      needs_character_creation: true,
      rank_level: 1,
      rank_name: config.name,
      player_position: config.name,
      merit_points: 0,
      moral_value: 80,
      assessment_grade: '合格',
      tenure_years: 0,
      tenure_days: 0,
      max_tenure_years: config.maxTenureYears,
      game_days: 0,
      city_name: cityName,
      city_gdp: 50,
      city_livelihood: 50,
      city_ecology: 50,
      city_business: 50,
      police_force: 100,
      security_index: 50,
      police_chief_name: null,
      reform_faction: 50,
      pragmatic_faction: 50,
      cyl_relation: 30,
      techno_relation: 30,
      local_relation: 30,
      primary_faction: '',
      boss_name: config.bossTitle,
      boss_favor: 50,
      boss2_name: config.bossTitle2,
      boss2_favor: 50,
      boss3_name: config.bossTitle3,
      boss3_favor: 50,
      required_merit: config.requiredMerit,
      required_tenure_years: config.requiredTenureYears,
      is_promotion_available: false,
      is_event_pending: false,
      family_happiness: 50,
      marriage_status: 'single',
      fund_balance: RANK_INITIAL_FUND[1] ?? 30,
      city_tax_rate: 0.12,
      city_tax_income: 0,
      city_gov_fund: 100,
    })
    .select('*')
    .single();

  if (createError || !newSave) return null;

  // 初始化下属（传入起始职级，生成匹配层级的称谓和职级）
  await initSubordinates(newSave.id, user.user.id, (newSave as Record<string, unknown>).rank_level as number ?? 1);
  // 初始化任务
  await initBossTasks(newSave.id, user.user.id);
  // 初始化案件
  await initPoliceCases(newSave.id, user.user.id, 0);
  // 初始化城市财政（记录初始值，月度结算以 player_saves.fund_balance 为准）
  await supabase.from('city_finance').insert({
    save_id: newSave.id, user_id: user.user.id,
    fund_balance: RANK_INITIAL_FUND[1] ?? 30, debt_total: 0, loans: [], investments: [],
  });

  return rowToPlayerSave(newSave as Record<string, unknown>);
}

export async function completeCharacterCreation(saveId: string, opts: {
  playerName: string;
  playerGender: string;
  playerAge: number;
  avatarId: number;
  school: string;
  isZhongXuanDiao?: boolean;
  degree?: string;
  birthYear?: number;
  birthProvince?: string;
  birthCity?: string;
  universityName?: string;
  careerLine?: '地方' | '中央';
  ministryName?: string;
  familyBackground?: string;
  isMilitaryTransfer?: boolean;
  initFaction?: string;
}): Promise<PlayerSave | null> {
  const isZhongXuan = opts.isZhongXuanDiao === true || opts.school === '985院校（选调生）';
  const isMilitary = opts.isMilitaryTransfer === true;
  const schoolValue = isZhongXuan ? '985院校（选调生）' : opts.school;
  const abilityBonus = isZhongXuan ? 20 : schoolValue === '985院校' ? 10 : schoolValue === '211院校' ? 5 : schoolValue === '大专院校' ? -5 : 0;
  // 军转干部不享受选调加成，但学历随机按211/985给予学历加成
  const militaryAbilityBonus = isMilitary ? (schoolValue === '985院校' ? 10 : 5) : 0;
  const finalAbility = Math.min(100, 40 + (isMilitary ? militaryAbilityBonus : abilityBonus));

  // 家庭背景人脉加成
  const familyBg = opts.familyBackground ?? '普通家庭';
  const FAMILY_MORAL_BONUS: Record<string, number> = {
    '普通家庭': 5, '干部家庭': 0, '军人家庭': 8, '商人家庭': -8,
  };
  const FAMILY_CONNECTION_BONUS: Record<string, number> = {
    '普通家庭': 0, '干部家庭': 15, '军人家庭': 10, '商人家庭': 20,
  };
  const familyMoralBonus = FAMILY_MORAL_BONUS[familyBg] ?? 0;
  const familyConnectionBonus = FAMILY_CONNECTION_BONUS[familyBg] ?? 0;

  // 初始政治倾向加成
  const initFactionKey = opts.initFaction ?? '';
  const FACTION_FIELD: Record<string, string> = {
    '改革派': 'reform_faction',
    '实干派': 'pragmatic_faction',
    '共青团系': 'cyl_relation',
    '技术官僚系': 'techno_relation',
    '地方实力派': 'local_relation',
  };
  const FACTION_BONUS: Record<string, number> = {
    '改革派': 20, '实干派': 20, '共青团系': 25, '技术官僚系': 25, '地方实力派': 25,
  };
  const FACTION_PRIMARY: Record<string, string> = {
    '改革派': 'reform', '实干派': 'pragmatic', '共青团系': 'cyl', '技术官僚系': 'techno', '地方实力派': 'local',
  };

  // 中央选调生：硕士→副乡镇长(rank2/副科)，博士→乡镇长(rank3/正科)
  const degreeVal = (opts.degree as '本科' | '硕士' | '博士') ?? '本科';
  const startRank = isZhongXuan ? getZhongXuanDiaoStartRank(degreeVal) : 1;
  const rankCfg = RANK_CONFIG[startRank];





  const baseMoral = Math.min(100, (isMilitary ? 85 : 80) + Math.floor(abilityBonus / 2) + familyMoralBonus);

  const updatePayload: Record<string, unknown> = {
    player_name:    opts.playerName,
    player_gender:  opts.playerGender,
    player_age:     opts.playerAge,
    player_birth_day: 0,
    avatar_id:      opts.avatarId,
    school:         schoolValue,
    needs_character_creation: false,
    moral_value:    Math.min(100, baseMoral),
    updated_at:     new Date().toISOString(),
    // 个人档案
    birth_year:       opts.birthYear ?? 0,
    birth_province:   opts.birthProvince ?? '',
    birth_city:       opts.birthCity ?? '',
    university_name:  opts.universityName ?? '',
    // 开局城市纯随机，与出生地无关；中央线则以部委名代替城市
    city_name: opts.careerLine === '中央' ? (opts.ministryName ?? '发展改革委') : randRealStartTown(),
    career_line: opts.careerLine ?? '地方',
    ministry_name: opts.careerLine === '中央' ? (opts.ministryName ?? '发展改革委') : '',
    // 家庭背景、军转干部、能力值、健康值
    family_background: familyBg,
    is_military_transfer: isMilitary,
    ability_value: finalAbility,
    health_value: 100,
    init_faction: initFactionKey,
    // 人脉初始值：军转+15，选调生+10，其他根据家庭背景
    network_value: isMilitary ? 15 : isZhongXuan ? 10 : 0,
    // 人脉加成：家庭背景影响初始双派系值（各半）
    reform_faction:    Math.min(100, 50 + Math.floor(familyConnectionBonus / 2) + (familyBg === '干部家庭' ? 5 : 0)),
    pragmatic_faction: Math.min(100, 50 + Math.floor(familyConnectionBonus / 2) + (familyBg === '干部家庭' ? 5 : 0)),
    // 初始政治倾向派系加成
    primary_faction: initFactionKey ? (FACTION_PRIMARY[initFactionKey] ?? '') : '',
    ...(initFactionKey && FACTION_FIELD[initFactionKey] ? {
      [FACTION_FIELD[initFactionKey]]: Math.min(100, 50 + (FACTION_BONUS[initFactionKey] ?? 0)),
    } : {}),
    // 部门玩法已取消，initial_dept_key 固定为 null
    initial_dept_key: null,
  };

  if (isZhongXuan) {
    // 博士选调：正科，硕士选调：副科
    // 中央线：部委科员/副主任科员；地方线：副乡镇长/乡镇长
    const isMaster = degreeVal === '硕士';
    const isCentral = opts.careerLine === '中央';
    const positionName = isCentral
      ? (isMaster ? '科员' : '副主任科员')          // 中央线：硕士→副科科员，博士→正科副主任科员
      : rankCfg.name;                                // 地方线：副乡镇长/乡镇长
    updatePayload.rank_level = startRank;
    updatePayload.rank_name = positionName;
    updatePayload.player_position = positionName;
    updatePayload.merit_points = isMaster ? 30 : 50;
    updatePayload.boss_favor = isMaster ? 65 : 70;
    updatePayload.boss_name = rankCfg.bossTitle;
    updatePayload.boss2_name = rankCfg.bossTitle2;
    updatePayload.boss3_name = rankCfg.bossTitle3;
    updatePayload.required_merit = rankCfg.requiredMerit;
    updatePayload.required_tenure_years = rankCfg.requiredTenureYears;
    updatePayload.max_tenure_years = rankCfg.maxTenureYears;
  }

  const { data, error } = await supabase
    .from('player_saves')
    .update(updatePayload)
    .eq('id', saveId)
    .select('*')
    .single();
  if (error || !data) return null;
  return rowToPlayerSave(data as Record<string, unknown>);
}

export async function updateSave(saveId: string, updates: Partial<{
  meritPoints: number;
  moralValue: number;
  assessmentGrade: string;
  tenureYears: number;
  tenureDays: number;
  gameDays: number;
  cityGdp: number;
  cityLivelihood: number;
  cityEcology: number;
  cityBusiness: number;
  policeForce: number;
  securityIndex: number;
  policeChiefName: string | null;
  reformFaction: number;
  pragmaticFaction: number;
  cylRelation: number;
  technoRelation: number;
  localRelation: number;
  primaryFaction: string;
  bossFavor: number;
  isPromotionAvailable: boolean;
  isEventPending: boolean;
  rankLevel: number;
  rankName: string;
  cityName: string;
  maxTenureYears: number;
  requiredMerit: number;
  requiredTenureYears: number;
  bossName: string;
  playerName: string;
  familyHappiness: number;
  marriageStatus: string;
  playerAge: number;
  eventsThisYear: number;
  lastRankDay: number;
  annualRankPct: number;
  isExcellentRank: boolean;
  cityPopulation: number;
  residentIncome: number;
  eduLevel: number;
  healthcareRate: number;
  housingRate: number;
  fundBalance: number;
  boss2Name: string;
  boss2Favor: number;
  boss3Name: string;
  boss3Favor: number;
  lastRecruitYear: number;
  lastRecruitQuarter: number;
  cityTaxRate: number;
  cityTaxIncome: number;
  taxRevenue: number;
  lastMonthDay: number;
  kpiGdpTarget: number;
  kpiLivelihoodTarget: number;
  kpiEcologyTarget: number;
  kpiBusinessTarget: number;
  kpiYear: number;
  subVisitPending: boolean;
  subVisitSubId: string | null;
  subVisitSubName: string | null;
  lastPersonnelYear: number;
  deptReportDay: number;
  lastExchangeDay: number;
  lastMinistryRotateDay: number;
  spouseRelationValue: number;
  marriageDay: number;
  playerPosition: string;
  concurrentPosts: string[];
  voteSupport: number;
  lastVoteDay: number;
  partyCongressVote: number;
  lastPartyCongressDay: number;
  nationalTermsServed: number;
  careerPath: string;
  nationalGdp: number;
  sciTechInvestTotal: number;
  sciTechResearchDir: string;
  sciTechProgress: number;
  sciTechLastActDay: number;
  disciplineLastActDay: number;
  kpiRankingYear: number;
  kpiRankingResult: string;
  lastAnnualPromoteYear: number;
  personalSavings: number;
  personalAssets: string[];
  lastSalaryDay: number;
  providentFundBalance: number;
  lastAnnualBonusDay: number;
  retirementDelayYears: number;
  isRetired: boolean;
  lastCompetitionEventDay: number;
  // 上司生命周期
  bossTenureStart: number;
  bossTenureDuration: number;
  boss2TenureStart: number;
  boss2TenureDuration: number;
  boss3TenureStart: number;
  boss3TenureDuration: number;
  // 纪委风险追踪
  lastDisciplineWarnDay: number;
  lastCaseCheckDay: number;
  // 重大事故风险
  consecutiveFailEvents: number;
  // 连续优秀/特等加速晋升
  consecutiveExcellentYears: number;
  // Game Over
  gameOverType: 'corruption' | 'accident' | 'purge' | null;
  // 代会换届追踪
  lastCongressDay: number;
  // 关系积分
  alumniScore: number;
  // 交流干部自动模式
  exchangeAutoMode: 'manual' | 'auto-accept' | 'auto-decline';
  // 累计平调次数
  lateralCount: number;
  // 任期KPI不及格次数（连续，晋升后清零）
  kpiFailedTerms: number;
  // 当前地方连续任期届数（达2届且rank<12则强制平调）
  sameLocTerms: number;
  // 上月部门事件连锁key（空串=无连锁）
  lastEventChainKey: string;
  // 人脉值（0-100）
  networkValue: number;
  // 相亲NPC列表
  blindDateNpcs: import('../types/game').BlindDateNpc[];
  // 怀孕起始天
  pregnantDay: number;
  // 民生历史快照
  livelihoodSnapshots: import('../types/game').LivelihoodSnapshot[];
  // 任职途径
  careerLine: '地方' | '中央';
  ministryName: string;
  // 编制年度追踪
  lastStaffQuotaYear: number;
  staffApplyBits: number;
  /** 内阁分管线 */
  cabinetTrack: 'economy' | 'social' | 'hmt' | 'military' | null;
  /** rank15 路线专权行动冷却追踪 */
  r15ActionCooldowns: Record<string, number>;
  supremeLeaderCooldowns: Record<string, number>;
  /** 待展示的全国性舆情事件 */
  pendingOpinionEvent: { type: string; title: string; desc: string; gameDays: number } | null;
  /** 破格晋升已错过的任期次数 */
  exceptionalMissedTerms: number;
  /** 破格晋升概率累计奖惩 */
  exceptionalPromoBonus: number;
  /** 年度述职核心指标 key */
  annualDebriefTargetKey: string;
  /** 年度述职核心指标目标值 */
  annualDebriefTargetValue: number;
  /** 上司施政风格派系 */
  bossFaction: '改革派' | '实干派' | '保守派';
  /** 秘书连续自动施政月数 */
  secAutoConsecutiveMonths: number;
  /** 秘书自动施政开关 */
  secAutoGovEnabled: boolean;
  /** 秘书自动招募开关 */
  secAutoRecruitEnabled: boolean;
  /** 应急编制到期游戏天（0=无） */
  emergencyStaffExpiry: number;
  /** 个人能力值 */
  abilityValue: number;
  /** 健康值 */
  healthValue: number;
  // ── v2.0 新系统字段 ──
  publicOpinionIndex: number;
  inspectionRisk: number;
  lastInspectionDay: number;
  isUnderInvestigation: boolean;
  protectionUmbrellaLevel: number;
  protectionUmbrellaName: string;
  landFinanceTotal: number;
  landParcelsSold: number;
  gdpPrimaryShare: number;
  gdpSecondaryShare: number;
  gdpTertiaryShare: number;
  govDebtTotal: number;
  massIncidentCount: number;
  massIncidentPending: number;
  factionInternalRank: string;
  factionPoints: number;
  briberyAccepted: number;
  briberyRejected: number;
  inheritancePolitical: number;
  inheritanceNetwork: number;
  // v2.1
  diplomacyPoints?: number;
  lastDiplomacyDay?: number;
  careerPathLine?: '党务线' | '行政线' | '纪检线' | '团派线';
  preferredCareerLine?: '党务线' | '行政线' | '纪检线' | '团派线';
  lineKpiScore?: number;
  careerPathCooldowns?: Record<string, number>;
  lineTaskState?: Record<string, { startDay: number; completed: boolean }>;
  exceptionalAgeOverrideCount?: number;
  isDiplomacyActive?: boolean;
  pendingBriberyEvent?: { npcName: string; npcType: string; amount: number } | null;
  // v2.6 新增
  grayIncomeTotal?: number;
  investigationDay?: number;
  investigationEvidenceLevel?: number;
  parentStatus?: 'healthy' | 'sick' | 'deceased';
  grayIncomeCooldowns?: Record<string, number>;
  // v2.9 接班人系统
  gameOverVerdict?: string | null;
  lastInvestigationCheckDay?: number;
  playerCareerHistory?: { rankLevel: number; position: string; province: string; city: string; startDay: number; endDay: number | null }[];
  successorName?: string;
  successorFaction?: string;
  successorSchool?: string;
  successorRankLevel?: number;
  successorAbility?: number;
  successorLoyalty?: number;
  successorInvestDays?: number;
  successorLastActDay?: number;
  partyCongressAxis?: '经济优先' | '生态立国' | '安全强国' | '';
  partyCongressAxisDay?: number;
  rankUnlockNotifiedLevel?: number;
  // 党委高阶 v2
  partyMediaControlDay?: number;
  mediaOvercontrolRisk?: number;
  orgDeptInsiderDay?: number;
  orgInsiderTarget?: string;
  orgInsiderTargets?: string;
  plenaryConferenceDay?: number;
  disciplineContractDay?: number;
  disciplineContractSigned?: string;
  // 师承系统
  mentorName?: string;
  mentorRankLevel?: number;
  mentorFaction?: string;
  mentorAcquiredDay?: number;
  mentorPromoted?: boolean;
  mentorRelation?: number;
  mentorLastContactDay?: number;
  // 门生系统
  protegeName?: string;
  protegeRankLevel?: number;
  protegeAbility?: number;
  protegeLoyalty?: number;
  protegeInvestDays?: number;
  protegeLastActDay?: number;
  protegePromotedDay?: number;
  // 政法线字段
  judicialStabilityIndex?: number;
  judicialPetitionBacklog?: number;
  judicialSweepCount?: number;
  judicialSpeechControl?: number;
  judicialEvidenceLevel?: number;
  judicialCoordCount?: number;
  informantCount?: number;
  lawEnforcePurgeCount?: number;
  deathReviewCount?: number;
  judicialExtraCooldowns?: Record<string, number>;
  cityGovFund?: number;
  lineGrantLastYear?: number;
  grantApplicationLastYear?: number;
  performanceRewardLastYear?: number;
  annualBudgetLastYear?: number;
  lineKpiBonus?: number;
  cityGovFundAutoMonth?: number;
  secretaryCandidates?: string;
  secretaryCandidateRank?: number;
  corruptTotal?: number;
  // 行政线治理字段
  adminGovCooldowns?: Record<string, number>;
  discDeepCooldowns?: Record<string, number>;
  partyDeepCooldowns?: Record<string, number>;
  leagueDeepCooldowns?: Record<string, number>;
  adminDeepCooldowns?: Record<string, number>;
  discDeepResults?: string;
  partyDeepResults?: string;
  leagueDeepResults?: string;
  adminDeepResults?: string;
  actionResultsLog?: string;
  massIncidentResults?: string;
  policyPilotCount?: number;
  institutionReformCount?: number;
  approvalRaceCount?: number;
  hallSatisfyCount?: number;
  digitalGovBuilt?: boolean;
  digitalGovBuiltDay?: number;
  infoPublicCount?: number;
  adminLitigationCount?: number;
  inspectionCount?: number;
  jointMeetingCount?: number;
  fiscalWarningCount?: number;
  projectTypeCount?: number;
  factionProvinceMap?: Record<string, string>;
  // v266 权色/权钱交易 & 人事干预
  powerTradeCooldowns?: Record<string, number>;
  personnelCooldowns?: Record<string, number>;
  npcVacancyNotices?: string[];
  // v2.10 政治局/常委/党代会
  politburoSeat?: boolean;
  lastPolitburoElectionYear?: number;
  politburoVotes?: number;
  standingCommitteeRank?: number;
  lastStandingElectionYear?: number;
  standingRankDelta?: number;
  partyCongressYear?: number;
  partyCongressTopics?: string[];
  partyCongressEconBonus?: number;
  partyCongressEcoBonus?: number;
  partyCongressSecBonus?: number;
  // v2.7 终局系统
  politicalCapital?: number;
  majorProposals?: string;
  policyTools?: string;
  policyFieldBonus?: string;
  fiveYearPlanYear?: number;
  fiveYearPlanTopic?: string;
  fiveYearPlanPassed?: boolean;
  planProjectBonus?: string;
  historicalEconScore?: number;
  historicalLivelihoodScore?: number;
  historicalIntegrityScore?: number;
  historicalReformScore?: number;
  historicalLabel?: string;
  legacyBonus?: number;
  retirementForced?: boolean;
  retiredVoluntarily?: boolean;
  namedLandmarks?: string;
  routeVoteResult?: '' | 'economy' | 'balanced' | 'ecology' | 'security';
  routeVoteDay?: number;
  honorLevel?: number;
  honorDay?: number;
  memoirWritten?: boolean;
  memoirStyle?: '' | 'conservative' | 'moderate' | 'bold';
  memoirInfluence?: number;
  professionalRankLevel?: number;
  grassrootsExpYears?: number;
  specialAssessScore?: number;
  democraticEvalScore?: number;
  slotWaitYears?: number;
  lastDemoEvalDay?: number;
  lastSpecialAssessDay?: number;
  // ── 家族系统 ──
  clanPrestige?: number;
  clanHeritage?: number;
  clanFund?: number;
  clanElderFavor?: number;
  clanMemberCount?: number;
  clanEventsLog?: string[];
  clanIndustryLevel?: number;
  clanIndustryType?: string;
  clanLastRitualDay?: number;
  clanLastMeetingDay?: number;
}>): Promise<PlayerSave | null> {
  const dbUpdates: Record<string, unknown> = { updated_at: new Date().toISOString() };

  if (updates.meritPoints !== undefined) dbUpdates.merit_points = Math.round(updates.meritPoints);
  if (updates.moralValue !== undefined) dbUpdates.moral_value = Math.round(updates.moralValue);
  if (updates.abilityValue !== undefined) dbUpdates.ability_value = Math.min(100, Math.max(0, Math.round(updates.abilityValue)));
  if (updates.healthValue !== undefined) dbUpdates.health_value = Math.min(100, Math.max(0, Math.round(updates.healthValue)));
  if (updates.assessmentGrade !== undefined) dbUpdates.assessment_grade = updates.assessmentGrade;
  if (updates.tenureYears !== undefined) dbUpdates.tenure_years = Math.round(updates.tenureYears);
  if (updates.tenureDays !== undefined) dbUpdates.tenure_days = Math.round(updates.tenureDays);
  if (updates.gameDays !== undefined) dbUpdates.game_days = Math.round(updates.gameDays);
  if (updates.cityGdp !== undefined) dbUpdates.city_gdp = Math.round(updates.cityGdp);
  if (updates.cityLivelihood !== undefined) dbUpdates.city_livelihood = Math.round(updates.cityLivelihood);
  if (updates.cityEcology !== undefined) dbUpdates.city_ecology = Math.round(updates.cityEcology);
  if (updates.cityBusiness !== undefined) dbUpdates.city_business = Math.round(updates.cityBusiness);
  if (updates.policeForce !== undefined) dbUpdates.police_force = Math.round(updates.policeForce);
  if (updates.securityIndex !== undefined) dbUpdates.security_index = Math.round(updates.securityIndex);
  if (updates.policeChiefName !== undefined) dbUpdates.police_chief_name = updates.policeChiefName;
  if (updates.reformFaction !== undefined) dbUpdates.reform_faction = Math.round(updates.reformFaction);
  if (updates.pragmaticFaction !== undefined) dbUpdates.pragmatic_faction = Math.round(updates.pragmaticFaction);
  if (updates.cylRelation !== undefined) dbUpdates.cyl_relation = Math.round(updates.cylRelation);
  if (updates.technoRelation !== undefined) dbUpdates.techno_relation = Math.round(updates.technoRelation);
  if (updates.localRelation !== undefined) dbUpdates.local_relation = Math.round(updates.localRelation);
  if (updates.primaryFaction !== undefined) dbUpdates.primary_faction = updates.primaryFaction;
  if (updates.factionProvinceMap !== undefined) dbUpdates.faction_province_map = updates.factionProvinceMap;
  if (updates.bossFavor !== undefined) dbUpdates.boss_favor = Math.round(updates.bossFavor);
  if (updates.isPromotionAvailable !== undefined) dbUpdates.is_promotion_available = updates.isPromotionAvailable;
  if (updates.isEventPending !== undefined) dbUpdates.is_event_pending = updates.isEventPending;
  if (updates.lastCompetitionEventDay !== undefined) dbUpdates.last_competition_event_day = updates.lastCompetitionEventDay;
  if (updates.rankLevel !== undefined) dbUpdates.rank_level = updates.rankLevel;
  if (updates.rankName !== undefined) dbUpdates.rank_name = updates.rankName;
  if (updates.cityName !== undefined) dbUpdates.city_name = updates.cityName;
  if (updates.maxTenureYears !== undefined) dbUpdates.max_tenure_years = updates.maxTenureYears;
  if (updates.requiredMerit !== undefined) dbUpdates.required_merit = updates.requiredMerit;
  if (updates.requiredTenureYears !== undefined) dbUpdates.required_tenure_years = updates.requiredTenureYears;
  if (updates.bossName !== undefined) dbUpdates.boss_name = updates.bossName;
  if (updates.playerName !== undefined) dbUpdates.player_name = updates.playerName;
  if (updates.familyHappiness !== undefined) dbUpdates.family_happiness = updates.familyHappiness;
  if (updates.marriageStatus !== undefined) dbUpdates.marriage_status = updates.marriageStatus;
  if (updates.playerAge !== undefined) dbUpdates.player_age = updates.playerAge;
  if (updates.eventsThisYear !== undefined) dbUpdates.events_this_year = updates.eventsThisYear;
  if (updates.lastRankDay !== undefined) dbUpdates.last_rank_day = updates.lastRankDay;
  if (updates.annualRankPct !== undefined) dbUpdates.annual_rank_pct = updates.annualRankPct;
  if (updates.isExcellentRank !== undefined) dbUpdates.is_excellent_rank = updates.isExcellentRank;
  if (updates.cityPopulation !== undefined) dbUpdates.city_population = updates.cityPopulation;
  if (updates.residentIncome !== undefined) dbUpdates.resident_income = updates.residentIncome;
  if (updates.eduLevel !== undefined) dbUpdates.edu_level = updates.eduLevel;
  if (updates.healthcareRate !== undefined) dbUpdates.healthcare_rate = updates.healthcareRate;
  if (updates.housingRate !== undefined) dbUpdates.housing_rate = updates.housingRate;
  if (updates.fundBalance !== undefined) dbUpdates.fund_balance = updates.fundBalance;
  if (updates.boss2Name !== undefined) dbUpdates.boss2_name = updates.boss2Name;
  if (updates.boss2Favor !== undefined) dbUpdates.boss2_favor = Math.round(updates.boss2Favor);
  if (updates.boss3Name !== undefined) dbUpdates.boss3_name = updates.boss3Name;
  if (updates.boss3Favor !== undefined) dbUpdates.boss3_favor = Math.round(updates.boss3Favor);
  if (updates.lastRecruitYear !== undefined) dbUpdates.last_recruit_year = updates.lastRecruitYear;
  if (updates.lastRecruitQuarter !== undefined) dbUpdates.last_recruit_quarter = updates.lastRecruitQuarter;
  if (updates.cityTaxRate !== undefined) dbUpdates.city_tax_rate = updates.cityTaxRate;
  if (updates.cityTaxIncome !== undefined) dbUpdates.city_tax_income = updates.cityTaxIncome;
  if (updates.taxRevenue !== undefined) dbUpdates.tax_revenue = updates.taxRevenue;
  if (updates.lastMonthDay !== undefined) dbUpdates.last_month_day = updates.lastMonthDay;
  if (updates.kpiGdpTarget !== undefined) dbUpdates.kpi_gdp_target = updates.kpiGdpTarget;
  if (updates.kpiLivelihoodTarget !== undefined) dbUpdates.kpi_livelihood_target = updates.kpiLivelihoodTarget;
  if (updates.kpiEcologyTarget !== undefined) dbUpdates.kpi_ecology_target = updates.kpiEcologyTarget;
  if (updates.kpiBusinessTarget !== undefined) dbUpdates.kpi_business_target = updates.kpiBusinessTarget;
  if (updates.kpiYear !== undefined) dbUpdates.kpi_year = updates.kpiYear;
  if (updates.subVisitPending !== undefined) dbUpdates.sub_visit_pending = updates.subVisitPending;
  if (updates.subVisitSubId !== undefined) dbUpdates.sub_visit_sub_id = updates.subVisitSubId;
  if (updates.subVisitSubName !== undefined) dbUpdates.sub_visit_sub_name = updates.subVisitSubName;
  if (updates.lastPersonnelYear !== undefined) dbUpdates.last_personnel_year = updates.lastPersonnelYear;
  if (updates.deptReportDay !== undefined) dbUpdates.dept_report_day = updates.deptReportDay;
  if (updates.lastExchangeDay !== undefined) dbUpdates.last_exchange_day = updates.lastExchangeDay;
  if (updates.lastMinistryRotateDay !== undefined) dbUpdates.last_ministry_rotate_day = updates.lastMinistryRotateDay;
  if (updates.spouseRelationValue !== undefined) dbUpdates.spouse_relation_value = updates.spouseRelationValue;
  if (updates.marriageDay !== undefined) dbUpdates.marriage_day = updates.marriageDay;
  if (updates.playerPosition !== undefined) dbUpdates.player_position = updates.playerPosition;
  if (updates.concurrentPosts !== undefined) dbUpdates.concurrent_posts = updates.concurrentPosts;
  if (updates.voteSupport !== undefined) dbUpdates.vote_support = Math.round(updates.voteSupport);
  if (updates.lastVoteDay !== undefined) dbUpdates.last_vote_day = updates.lastVoteDay;
  if (updates.partyCongressVote !== undefined) dbUpdates.party_congress_vote = Math.round(updates.partyCongressVote);
  if (updates.lastPartyCongressDay !== undefined) dbUpdates.last_party_congress_day = updates.lastPartyCongressDay;
  if (updates.nationalTermsServed !== undefined) dbUpdates.national_terms_served = updates.nationalTermsServed;
  if (updates.careerPath !== undefined) dbUpdates.career_path = updates.careerPath;
  if (updates.nationalGdp !== undefined) dbUpdates.national_gdp = Math.round(updates.nationalGdp);
  if (updates.sciTechInvestTotal !== undefined) dbUpdates.sci_tech_invest_total = Math.round(updates.sciTechInvestTotal);
  if (updates.sciTechResearchDir !== undefined) dbUpdates.sci_tech_research_dir = updates.sciTechResearchDir;
  if (updates.sciTechProgress !== undefined) dbUpdates.sci_tech_progress = Math.round(updates.sciTechProgress);
  if (updates.sciTechLastActDay !== undefined) dbUpdates.sci_tech_last_act_day = updates.sciTechLastActDay;
  if (updates.disciplineLastActDay !== undefined) dbUpdates.discipline_last_act_day = updates.disciplineLastActDay;
  if (updates.kpiRankingYear !== undefined) dbUpdates.kpi_ranking_year = updates.kpiRankingYear;
  if (updates.kpiRankingResult !== undefined) dbUpdates.kpi_ranking_result = updates.kpiRankingResult;
  if (updates.lastAnnualPromoteYear !== undefined) dbUpdates.last_annual_promote_year = updates.lastAnnualPromoteYear;
  if (updates.personalSavings !== undefined) dbUpdates.personal_savings = Math.round(updates.personalSavings);
  if (updates.personalAssets !== undefined) dbUpdates.personal_assets = updates.personalAssets;
  if (updates.lastSalaryDay !== undefined) dbUpdates.last_salary_day = updates.lastSalaryDay;
  if (updates.providentFundBalance !== undefined) dbUpdates.provident_fund_balance = Math.round(updates.providentFundBalance);
  if (updates.lastAnnualBonusDay !== undefined) dbUpdates.last_annual_bonus_day = updates.lastAnnualBonusDay;
  if (updates.retirementDelayYears !== undefined) dbUpdates.retirement_delay_years = updates.retirementDelayYears;
  if (updates.isRetired !== undefined) dbUpdates.is_retired = updates.isRetired;
  // 上司生命周期
  if (updates.bossTenureStart !== undefined) dbUpdates.boss_tenure_start = updates.bossTenureStart;
  if (updates.bossTenureDuration !== undefined) dbUpdates.boss_tenure_duration = updates.bossTenureDuration;
  if (updates.boss2TenureStart !== undefined) dbUpdates.boss2_tenure_start = updates.boss2TenureStart;
  if (updates.boss2TenureDuration !== undefined) dbUpdates.boss2_tenure_duration = updates.boss2TenureDuration;
  if (updates.boss3TenureStart !== undefined) dbUpdates.boss3_tenure_start = updates.boss3TenureStart;
  if (updates.boss3TenureDuration !== undefined) dbUpdates.boss3_tenure_duration = updates.boss3TenureDuration;
  // 纪委风险
  if (updates.lastDisciplineWarnDay !== undefined) dbUpdates.last_discipline_warn_day = updates.lastDisciplineWarnDay;
  if (updates.lastCaseCheckDay !== undefined) dbUpdates.last_case_check_day = updates.lastCaseCheckDay;
  // 重大事故风险
  if (updates.consecutiveFailEvents !== undefined) dbUpdates.consecutive_fail_events = updates.consecutiveFailEvents;
  if (updates.consecutiveExcellentYears !== undefined) dbUpdates.consecutive_excellent_years = updates.consecutiveExcellentYears;
  // Game Over
  if (updates.gameOverType !== undefined) dbUpdates.game_over_type = updates.gameOverType;
  // 代会换届
  if (updates.lastCongressDay !== undefined) dbUpdates.last_congress_day = updates.lastCongressDay;
  // 关系积分
  if (updates.alumniScore !== undefined) dbUpdates.alumni_score = updates.alumniScore;
  // 交流干部自动模式
  if (updates.exchangeAutoMode !== undefined) dbUpdates.exchange_auto_mode = updates.exchangeAutoMode;
  // 累计平调次数
  if (updates.lateralCount !== undefined) dbUpdates.lateral_count = updates.lateralCount;
  // 任期KPI不及格次数
  if (updates.kpiFailedTerms !== undefined) dbUpdates.kpi_failed_terms = updates.kpiFailedTerms;
  // 当前地方连续任期届数
  if (updates.sameLocTerms !== undefined) dbUpdates.same_loc_terms = updates.sameLocTerms;
  // 上月事件连锁key
  if (updates.lastEventChainKey !== undefined) dbUpdates.last_event_chain_key = updates.lastEventChainKey;
  // 人脉值
  if (updates.networkValue !== undefined) dbUpdates.network_value = updates.networkValue;
  // 相亲NPC列表
  if (updates.blindDateNpcs !== undefined) dbUpdates.blind_date_npcs = updates.blindDateNpcs;
  // 怀孕起始天
  if (updates.pregnantDay !== undefined) dbUpdates.pregnant_day = updates.pregnantDay;
  // 民生历史快照
  if (updates.livelihoodSnapshots !== undefined) dbUpdates.livelihood_snapshots = updates.livelihoodSnapshots;
  if (updates.careerLine !== undefined) dbUpdates.career_line = updates.careerLine;
  if (updates.ministryName !== undefined) dbUpdates.ministry_name = updates.ministryName;
  if (updates.lastStaffQuotaYear !== undefined) dbUpdates.last_staff_quota_year = updates.lastStaffQuotaYear;
  if (updates.staffApplyBits !== undefined) dbUpdates.staff_apply_bits = updates.staffApplyBits;
  if (updates.cabinetTrack !== undefined) dbUpdates.cabinet_track = updates.cabinetTrack;
  if (updates.r15ActionCooldowns !== undefined) dbUpdates.r15_action_cooldowns = updates.r15ActionCooldowns;
  if (updates.supremeLeaderCooldowns !== undefined) dbUpdates.supreme_leader_cooldowns = updates.supremeLeaderCooldowns;
  if (updates.pendingOpinionEvent !== undefined) dbUpdates.pending_opinion_event = updates.pendingOpinionEvent;
  if (updates.exceptionalMissedTerms !== undefined) dbUpdates.exceptional_missed_terms = updates.exceptionalMissedTerms;
  if (updates.exceptionalPromoBonus !== undefined) dbUpdates.exceptional_promo_bonus = updates.exceptionalPromoBonus;
  if (updates.annualDebriefTargetKey !== undefined) dbUpdates.annual_debrief_target_key = updates.annualDebriefTargetKey;
  if (updates.annualDebriefTargetValue !== undefined) dbUpdates.annual_debrief_target_value = updates.annualDebriefTargetValue;
  if (updates.bossFaction !== undefined) dbUpdates.boss_faction = updates.bossFaction;
  if (updates.secAutoConsecutiveMonths !== undefined) dbUpdates.sec_auto_consecutive_months = updates.secAutoConsecutiveMonths;
  if (updates.secAutoGovEnabled !== undefined) dbUpdates.sec_auto_gov_enabled = updates.secAutoGovEnabled;
  if (updates.secAutoRecruitEnabled !== undefined) dbUpdates.sec_auto_recruit_enabled = updates.secAutoRecruitEnabled;
  if (updates.emergencyStaffExpiry !== undefined) dbUpdates.emergency_staff_expiry = updates.emergencyStaffExpiry;
  // ── v2.0 新系统字段 ──
  if (updates.publicOpinionIndex !== undefined)      dbUpdates.public_opinion_index      = Math.min(100, Math.max(0, Math.round(updates.publicOpinionIndex)));
  if (updates.inspectionRisk !== undefined)          dbUpdates.inspection_risk           = Math.min(100, Math.max(0, Math.round(updates.inspectionRisk)));
  if (updates.lastInspectionDay !== undefined)       dbUpdates.last_inspection_day       = Math.round(updates.lastInspectionDay);
  if (updates.isUnderInvestigation !== undefined)    dbUpdates.is_under_investigation    = updates.isUnderInvestigation;
  if (updates.protectionUmbrellaLevel !== undefined) dbUpdates.protection_umbrella_level = updates.protectionUmbrellaLevel;
  if (updates.protectionUmbrellaName !== undefined)  dbUpdates.protection_umbrella_name  = updates.protectionUmbrellaName;
  if (updates.landFinanceTotal !== undefined)        dbUpdates.land_finance_total        = Math.max(0, Math.round(updates.landFinanceTotal));
  if (updates.landParcelsSold !== undefined)         dbUpdates.land_parcels_sold         = Math.max(0, Math.round(updates.landParcelsSold));
  if (updates.gdpPrimaryShare !== undefined)         dbUpdates.gdp_primary_share         = Math.round(updates.gdpPrimaryShare);
  if (updates.gdpSecondaryShare !== undefined)       dbUpdates.gdp_secondary_share       = Math.round(updates.gdpSecondaryShare);
  if (updates.gdpTertiaryShare !== undefined)        dbUpdates.gdp_tertiary_share        = Math.round(updates.gdpTertiaryShare);
  if (updates.govDebtTotal !== undefined)            dbUpdates.gov_debt_total            = Math.max(0, Math.round(updates.govDebtTotal));
  if (updates.massIncidentCount !== undefined)       dbUpdates.mass_incident_count       = Math.max(0, Math.round(updates.massIncidentCount));
  if (updates.massIncidentPending !== undefined)     dbUpdates.mass_incident_pending     = Math.max(0, Math.round(updates.massIncidentPending));
  if (updates.factionInternalRank !== undefined)     dbUpdates.faction_internal_rank     = updates.factionInternalRank;
  if (updates.factionPoints !== undefined)           dbUpdates.faction_points            = Math.max(0, Math.round(updates.factionPoints));
  if (updates.briberyAccepted !== undefined)         dbUpdates.bribery_accepted          = Math.max(0, Math.round(updates.briberyAccepted));
  if (updates.briberyRejected !== undefined)         dbUpdates.bribery_rejected          = Math.max(0, Math.round(updates.briberyRejected));
  if (updates.inheritancePolitical !== undefined)    dbUpdates.inheritance_political     = Math.max(0, Math.round(updates.inheritancePolitical));
  if (updates.inheritanceNetwork !== undefined)      dbUpdates.inheritance_network       = Math.max(0, Math.round(updates.inheritanceNetwork));
  // v2.1
  if (updates.diplomacyPoints !== undefined)              dbUpdates.diplomacy_points              = Math.max(0, Math.round(updates.diplomacyPoints));
  if (updates.lastDiplomacyDay !== undefined)             dbUpdates.last_diplomacy_day            = Math.round(updates.lastDiplomacyDay);
  if (updates.careerPathLine !== undefined)               dbUpdates.career_path_line              = updates.careerPathLine;
  if (updates.preferredCareerLine !== undefined)          dbUpdates.preferred_career_line         = updates.preferredCareerLine;
  if (updates.lineKpiScore !== undefined)                 dbUpdates.line_kpi_score                = Math.max(0, Math.round(updates.lineKpiScore));
  if (updates.careerPathCooldowns !== undefined)          dbUpdates.career_path_cooldowns         = JSON.stringify(updates.careerPathCooldowns);
  if (updates.lineTaskState !== undefined)                dbUpdates.line_task_state               = JSON.stringify(updates.lineTaskState);
  if (updates.exceptionalAgeOverrideCount !== undefined)  dbUpdates.exceptional_age_override_count = Math.max(0, Math.round(updates.exceptionalAgeOverrideCount));
  if (updates.isDiplomacyActive !== undefined)            dbUpdates.is_diplomacy_active           = updates.isDiplomacyActive;
  if ('pendingBriberyEvent' in updates)                   dbUpdates.pending_bribery_event         = updates.pendingBriberyEvent === null ? null : JSON.stringify(updates.pendingBriberyEvent);
  // v2.6 新增字段
  if (updates.grayIncomeTotal !== undefined)              dbUpdates.gray_income_total             = Math.max(0, Math.round(updates.grayIncomeTotal));
  if (updates.investigationDay !== undefined)             dbUpdates.investigation_day             = Math.round(updates.investigationDay);
  if (updates.investigationEvidenceLevel !== undefined)   dbUpdates.investigation_evidence_level  = Math.min(5, Math.max(0, Math.round(updates.investigationEvidenceLevel)));
  if (updates.parentStatus !== undefined)                 dbUpdates.parent_status                 = updates.parentStatus;
  if (updates.grayIncomeCooldowns !== undefined)          dbUpdates.gray_income_cooldowns         = JSON.stringify(updates.grayIncomeCooldowns);
  if (updates.powerTradeCooldowns !== undefined)          dbUpdates.power_trade_cooldowns         = JSON.stringify(updates.powerTradeCooldowns);
  if (updates.personnelCooldowns !== undefined)           dbUpdates.personnel_cooldowns           = JSON.stringify(updates.personnelCooldowns);
  if (updates.npcVacancyNotices !== undefined)            dbUpdates.npc_vacancy_notices           = updates.npcVacancyNotices;
  // v2.9
  if ('gameOverVerdict' in updates)                       dbUpdates.game_over_verdict             = updates.gameOverVerdict ?? null;
  if (updates.lastInvestigationCheckDay !== undefined)    dbUpdates.last_investigation_check_day  = Math.max(0, Math.round(updates.lastInvestigationCheckDay));
  if (updates.playerCareerHistory !== undefined)          dbUpdates.player_career_history         = JSON.stringify(updates.playerCareerHistory);
  if (updates.successorName !== undefined)                dbUpdates.successor_name                = updates.successorName;
  if (updates.successorFaction !== undefined)             dbUpdates.successor_faction             = updates.successorFaction;
  if (updates.successorSchool !== undefined)              dbUpdates.successor_school              = updates.successorSchool;
  if (updates.successorRankLevel !== undefined)           dbUpdates.successor_rank_level          = Math.max(0, Math.round(updates.successorRankLevel));
  if (updates.successorAbility !== undefined)             dbUpdates.successor_ability             = Math.min(100, Math.max(0, Math.round(updates.successorAbility)));
  if (updates.successorLoyalty !== undefined)             dbUpdates.successor_loyalty             = Math.min(100, Math.max(0, Math.round(updates.successorLoyalty)));
  if (updates.successorInvestDays !== undefined)          dbUpdates.successor_invest_days         = Math.round(updates.successorInvestDays);
  if (updates.successorLastActDay !== undefined)          dbUpdates.successor_last_act_day        = Math.round(updates.successorLastActDay);
  if (updates.partyCongressAxis !== undefined)            dbUpdates.party_congress_axis           = updates.partyCongressAxis;
  if (updates.partyCongressAxisDay !== undefined)         dbUpdates.party_congress_axis_day       = Math.round(updates.partyCongressAxisDay);
  if (updates.rankUnlockNotifiedLevel !== undefined)      dbUpdates.rank_unlock_notified_level    = Math.round(updates.rankUnlockNotifiedLevel);
  if (updates.partyMediaControlDay !== undefined)         dbUpdates.party_media_control_day       = Math.round(updates.partyMediaControlDay);
  if (updates.mediaOvercontrolRisk !== undefined)         dbUpdates.media_overcontrol_risk        = Math.round(updates.mediaOvercontrolRisk);
  if (updates.orgDeptInsiderDay !== undefined)            dbUpdates.org_dept_insider_day          = Math.round(updates.orgDeptInsiderDay);
  if (updates.orgInsiderTarget !== undefined)             dbUpdates.org_insider_target            = updates.orgInsiderTarget;
  if (updates.orgInsiderTargets !== undefined)            dbUpdates.org_insider_targets           = updates.orgInsiderTargets;
  if (updates.plenaryConferenceDay !== undefined)         dbUpdates.plenary_conference_day        = Math.round(updates.plenaryConferenceDay);
  if (updates.disciplineContractDay !== undefined)        dbUpdates.discipline_contract_day       = Math.round(updates.disciplineContractDay);
  if (updates.disciplineContractSigned !== undefined)     dbUpdates.discipline_contract_signed    = updates.disciplineContractSigned;
  // 师承系统
  if (updates.mentorName !== undefined)                   dbUpdates.mentor_name                   = updates.mentorName;
  if (updates.mentorRankLevel !== undefined)              dbUpdates.mentor_rank_level             = Math.round(updates.mentorRankLevel);
  if (updates.mentorFaction !== undefined)                dbUpdates.mentor_faction                = updates.mentorFaction;
  if (updates.mentorAcquiredDay !== undefined)            dbUpdates.mentor_acquired_day           = Math.round(updates.mentorAcquiredDay);
  if (updates.mentorPromoted !== undefined)               dbUpdates.mentor_promoted               = updates.mentorPromoted;
  if (updates.mentorRelation !== undefined)               dbUpdates.mentor_relation               = Math.round(updates.mentorRelation);
  if (updates.mentorLastContactDay !== undefined)         dbUpdates.mentor_last_contact_day       = Math.round(updates.mentorLastContactDay);
  // 门生系统
  if (updates.protegeName !== undefined)                  dbUpdates.protege_name                  = updates.protegeName;
  if (updates.protegeRankLevel !== undefined)             dbUpdates.protege_rank_level            = Math.round(updates.protegeRankLevel);
  if (updates.protegeAbility !== undefined)               dbUpdates.protege_ability               = Math.round(updates.protegeAbility);
  if (updates.protegeLoyalty !== undefined)               dbUpdates.protege_loyalty               = Math.round(updates.protegeLoyalty);
  if (updates.protegeInvestDays !== undefined)            dbUpdates.protege_invest_days           = Math.round(updates.protegeInvestDays);
  if (updates.protegeLastActDay !== undefined)            dbUpdates.protege_last_act_day          = Math.round(updates.protegeLastActDay);
  if (updates.protegePromotedDay !== undefined)           dbUpdates.protege_promoted_day          = Math.round(updates.protegePromotedDay);
  // 政法线字段
  if (updates.judicialStabilityIndex !== undefined)       dbUpdates.judicial_stability_index      = Math.round(updates.judicialStabilityIndex);
  if (updates.judicialPetitionBacklog !== undefined)      dbUpdates.judicial_petition_backlog     = Math.round(updates.judicialPetitionBacklog);
  if (updates.judicialSweepCount !== undefined)           dbUpdates.judicial_sweep_count          = Math.round(updates.judicialSweepCount);
  if (updates.judicialSpeechControl !== undefined)        dbUpdates.judicial_speech_control       = Math.round(updates.judicialSpeechControl);
  if (updates.judicialEvidenceLevel !== undefined)        dbUpdates.judicial_evidence_level       = Math.round(updates.judicialEvidenceLevel);
  if (updates.judicialCoordCount !== undefined)           dbUpdates.judicial_coord_count          = Math.round(updates.judicialCoordCount);
  if (updates.informantCount !== undefined)               dbUpdates.informant_count               = Math.max(0, Math.round(updates.informantCount));
  if (updates.lawEnforcePurgeCount !== undefined)         dbUpdates.law_enforce_purge_count       = Math.round(updates.lawEnforcePurgeCount);
  if (updates.deathReviewCount !== undefined)             dbUpdates.death_review_count            = Math.round(updates.deathReviewCount);
  if (updates.judicialExtraCooldowns !== undefined)       dbUpdates.judicial_extra_cooldowns      = updates.judicialExtraCooldowns;
  if (updates.cityGovFund !== undefined)                dbUpdates.city_gov_fund               = Math.max(0, Math.round(updates.cityGovFund));
  if (updates.cityGovFundAutoMonth !== undefined)       dbUpdates.city_gov_fund_auto_month    = updates.cityGovFundAutoMonth;
  if (updates.secretaryCandidates !== undefined)          dbUpdates.secretary_candidates          = updates.secretaryCandidates;
  if (updates.secretaryCandidateRank !== undefined)       dbUpdates.secretary_candidate_rank      = updates.secretaryCandidateRank;
  if (updates.lineGrantLastYear !== undefined)            dbUpdates.line_grant_last_year          = updates.lineGrantLastYear;
  if (updates.grantApplicationLastYear !== undefined)    dbUpdates.grant_application_last_year   = updates.grantApplicationLastYear;
  if (updates.performanceRewardLastYear !== undefined)   dbUpdates.performance_reward_last_year  = updates.performanceRewardLastYear;
  if (updates.annualBudgetLastYear !== undefined)        dbUpdates.annual_budget_last_year       = updates.annualBudgetLastYear;
  if (updates.lineKpiBonus !== undefined)                dbUpdates.line_kpi_bonus                = Math.min(100, Math.max(0, Math.round(updates.lineKpiBonus)));
  if (updates.corruptTotal !== undefined)                 dbUpdates.corrupt_total                 = Math.max(0, Math.round(updates.corruptTotal));
  // 行政线治理字段
  if (updates.adminGovCooldowns !== undefined)            dbUpdates.admin_gov_cooldowns           = updates.adminGovCooldowns;
  if (updates.discDeepCooldowns !== undefined)            dbUpdates.disc_deep_cooldowns           = updates.discDeepCooldowns;
  if (updates.partyDeepCooldowns !== undefined)           dbUpdates.party_deep_cooldowns          = updates.partyDeepCooldowns;
  if (updates.leagueDeepCooldowns !== undefined)          dbUpdates.league_deep_cooldowns         = updates.leagueDeepCooldowns;
  if (updates.discDeepResults !== undefined)              dbUpdates.disc_deep_results             = updates.discDeepResults;
  if (updates.partyDeepResults !== undefined)             dbUpdates.party_deep_results            = updates.partyDeepResults;
  if (updates.leagueDeepResults !== undefined)            dbUpdates.league_deep_results           = updates.leagueDeepResults;
  if (updates.adminDeepCooldowns !== undefined)          dbUpdates.admin_deep_cooldowns          = updates.adminDeepCooldowns;
  if (updates.adminDeepResults !== undefined)             dbUpdates.admin_deep_results            = updates.adminDeepResults;
  if (updates.actionResultsLog !== undefined)             dbUpdates.action_results_log            = updates.actionResultsLog;
  if (updates.massIncidentResults !== undefined)          dbUpdates.mass_incident_results         = updates.massIncidentResults;
  if (updates.policyPilotCount !== undefined)             dbUpdates.policy_pilot_count            = Math.round(updates.policyPilotCount);
  if (updates.institutionReformCount !== undefined)       dbUpdates.institution_reform_count      = Math.round(updates.institutionReformCount);
  if (updates.approvalRaceCount !== undefined)            dbUpdates.approval_race_count           = Math.round(updates.approvalRaceCount);
  if (updates.hallSatisfyCount !== undefined)             dbUpdates.hall_satisfy_count            = Math.round(updates.hallSatisfyCount);
  if (updates.digitalGovBuilt !== undefined)              dbUpdates.digital_gov_built             = updates.digitalGovBuilt;
  if (updates.digitalGovBuiltDay !== undefined)           dbUpdates.digital_gov_built_day         = Math.round(updates.digitalGovBuiltDay);
  if (updates.infoPublicCount !== undefined)              dbUpdates.info_public_count             = Math.round(updates.infoPublicCount);
  if (updates.adminLitigationCount !== undefined)         dbUpdates.admin_litigation_count        = Math.round(updates.adminLitigationCount);
  if (updates.inspectionCount !== undefined)              dbUpdates.inspection_count              = Math.round(updates.inspectionCount);
  if (updates.jointMeetingCount !== undefined)            dbUpdates.joint_meeting_count           = Math.round(updates.jointMeetingCount);
  if (updates.fiscalWarningCount !== undefined)           dbUpdates.fiscal_warning_count          = Math.round(updates.fiscalWarningCount);
  if (updates.projectTypeCount !== undefined)             dbUpdates.project_type_count            = Math.round(updates.projectTypeCount);
  if (updates.factionProvinceMap !== undefined)           dbUpdates.faction_province_map          = updates.factionProvinceMap;
  // ── v2.10 政治局/常委/党代会 ──
  if (updates.politburoSeat !== undefined)                dbUpdates.politburo_seat                = updates.politburoSeat;
  if (updates.lastPolitburoElectionYear !== undefined)    dbUpdates.last_politburo_election_year  = updates.lastPolitburoElectionYear;
  if (updates.politburoVotes !== undefined)               dbUpdates.politburo_votes               = Math.round(updates.politburoVotes);
  if (updates.standingCommitteeRank !== undefined)        dbUpdates.standing_committee_rank       = Math.round(updates.standingCommitteeRank);
  if (updates.lastStandingElectionYear !== undefined)     dbUpdates.last_standing_election_year   = updates.lastStandingElectionYear;
  if (updates.standingRankDelta !== undefined)            dbUpdates.standing_rank_delta           = Math.round(updates.standingRankDelta);
  if (updates.partyCongressYear !== undefined)            dbUpdates.party_congress_year           = updates.partyCongressYear;
  if (updates.partyCongressTopics !== undefined)          dbUpdates.party_congress_topics         = JSON.stringify(updates.partyCongressTopics);
  if (updates.partyCongressEconBonus !== undefined)       dbUpdates.party_congress_econ_bonus     = Math.round(updates.partyCongressEconBonus);
  if (updates.partyCongressEcoBonus !== undefined)        dbUpdates.party_congress_eco_bonus      = Math.round(updates.partyCongressEcoBonus);
  if (updates.partyCongressSecBonus !== undefined)        dbUpdates.party_congress_sec_bonus      = Math.round(updates.partyCongressSecBonus);
  // ── v2.7 终局系统 ──
  if (updates.politicalCapital !== undefined)             dbUpdates.political_capital             = Math.round(updates.politicalCapital);
  if (updates.majorProposals !== undefined)               dbUpdates.major_proposals               = updates.majorProposals;
  if (updates.policyTools !== undefined)                  dbUpdates.policy_tools                  = updates.policyTools;
  if (updates.policyFieldBonus !== undefined)             dbUpdates.policy_field_bonus            = updates.policyFieldBonus;
  if (updates.fiveYearPlanYear !== undefined)             dbUpdates.five_year_plan_year           = Math.round(updates.fiveYearPlanYear);
  if (updates.fiveYearPlanTopic !== undefined)            dbUpdates.five_year_plan_topic          = updates.fiveYearPlanTopic;
  if (updates.fiveYearPlanPassed !== undefined)           dbUpdates.five_year_plan_passed         = updates.fiveYearPlanPassed;
  if (updates.planProjectBonus !== undefined)             dbUpdates.plan_project_bonus            = updates.planProjectBonus;
  if (updates.historicalEconScore !== undefined)          dbUpdates.historical_econ_score         = Math.round(updates.historicalEconScore);
  if (updates.historicalLivelihoodScore !== undefined)    dbUpdates.historical_livelihood_score   = Math.round(updates.historicalLivelihoodScore);
  if (updates.historicalIntegrityScore !== undefined)     dbUpdates.historical_integrity_score    = Math.round(updates.historicalIntegrityScore);
  if (updates.historicalReformScore !== undefined)        dbUpdates.historical_reform_score       = Math.round(updates.historicalReformScore);
  if (updates.historicalLabel !== undefined)              dbUpdates.historical_label              = updates.historicalLabel;
  if (updates.legacyBonus !== undefined)                  dbUpdates.legacy_bonus                  = Math.round(updates.legacyBonus);
  if (updates.retirementForced !== undefined)             dbUpdates.retirement_forced             = updates.retirementForced;
  if (updates.retiredVoluntarily !== undefined)           dbUpdates.retired_voluntarily           = updates.retiredVoluntarily;
  if (updates.namedLandmarks !== undefined)               dbUpdates.named_landmarks               = updates.namedLandmarks;
  if (updates.routeVoteResult !== undefined)              dbUpdates.route_vote_result             = updates.routeVoteResult;
  if (updates.routeVoteDay !== undefined)                 dbUpdates.route_vote_day                = Math.round(updates.routeVoteDay);
  if (updates.honorLevel !== undefined)                   dbUpdates.honor_level                   = Math.round(updates.honorLevel);
  if (updates.honorDay !== undefined)                     dbUpdates.honor_day                     = Math.round(updates.honorDay);
  if (updates.memoirWritten !== undefined)                dbUpdates.memoir_written                = updates.memoirWritten;
  if (updates.memoirStyle !== undefined)                  dbUpdates.memoir_style                  = updates.memoirStyle;
  if (updates.memoirInfluence !== undefined)              dbUpdates.memoir_influence              = Math.round(updates.memoirInfluence);
  if (updates.professionalRankLevel !== undefined)        dbUpdates.professional_rank_level       = Math.round(updates.professionalRankLevel);
  if (updates.grassrootsExpYears !== undefined)           dbUpdates.grassroots_exp_years          = Math.round(updates.grassrootsExpYears);
  if (updates.specialAssessScore !== undefined)           dbUpdates.special_assess_score          = Math.round(updates.specialAssessScore);
  if (updates.democraticEvalScore !== undefined)          dbUpdates.democratic_eval_score         = Math.round(updates.democraticEvalScore);
  if (updates.slotWaitYears !== undefined)                dbUpdates.slot_wait_years               = Math.round(updates.slotWaitYears);
  if (updates.lastDemoEvalDay !== undefined)              dbUpdates.last_demo_eval_day            = Math.round(updates.lastDemoEvalDay);
  if (updates.lastSpecialAssessDay !== undefined)         dbUpdates.last_special_assess_day       = Math.round(updates.lastSpecialAssessDay);
  // ── 家族系统 ──
  if (updates.clanPrestige !== undefined)      dbUpdates.clan_prestige         = Math.max(0, Math.round(updates.clanPrestige));
  if (updates.clanHeritage !== undefined)      dbUpdates.clan_heritage         = Math.max(0, Math.round(updates.clanHeritage));
  if (updates.clanFund !== undefined)          dbUpdates.clan_fund             = Math.max(0, Math.round(updates.clanFund));
  if (updates.clanElderFavor !== undefined)    dbUpdates.clan_elder_favor      = Math.min(100, Math.max(0, Math.round(updates.clanElderFavor)));
  if (updates.clanMemberCount !== undefined)   dbUpdates.clan_member_count     = Math.max(1, Math.round(updates.clanMemberCount));
  if (updates.clanEventsLog !== undefined)     dbUpdates.clan_events_log       = updates.clanEventsLog;
  if (updates.clanIndustryLevel !== undefined) dbUpdates.clan_industry_level   = Math.max(0, Math.round(updates.clanIndustryLevel));
  if (updates.clanIndustryType !== undefined)  dbUpdates.clan_industry_type    = updates.clanIndustryType;
  if (updates.clanLastRitualDay !== undefined) dbUpdates.clan_last_ritual_day  = Math.round(updates.clanLastRitualDay);
  if (updates.clanLastMeetingDay !== undefined) dbUpdates.clan_last_meeting_day = Math.round(updates.clanLastMeetingDay);

  const { data, error } = await supabase
    .from('player_saves')
    .update(dbUpdates)
    .eq('id', saveId)
    .select('*')
    .single();

  if (error || !data) return null;
  return rowToPlayerSave(data as Record<string, unknown>);
}

// ============ 下属操作 ============

const SUBORDINATE_NAMES_MALE = [
  '张伟', '王磊', '李强', '刘洋', '孙辉', '吴刚', '郑博', '韩杰', '冯刚', '陈勇',
  '周毅', '林峰', '黄浩', '马超', '何勇', '谢文', '罗刚', '曹磊', '唐杰', '邓强',
  '杨明', '胡博', '徐辉', '朱建', '苏远', '章伟', '潘磊', '史峰', '余刚', '傅强',
  '贾鸿', '叶锋', '秦磊', '尹博', '翟明', '龚伟', '魏远', '许建', '方磊', '白鹏',
];
const SUBORDINATE_NAMES_FEMALE = [
  '王芳', '陈敏', '周娟', '冯霞', '李静', '张丽', '刘云', '赵雪', '孙梅', '吴萍',
  '林慧', '黄婷', '马晓', '何敏', '谢霞', '罗丽', '曹燕', '唐娜', '邓雪', '杨云',
  '胡静', '徐梅', '朱红', '苏慧', '章芳', '潘丽', '史敏', '余霞', '傅婷', '贾雪',
];
const POSITIONS = ['副科长', '科员', '主任科员', '副主任', '主任', '办公室主任', '专员'];

export async function initSubordinates(saveId: string, userId: string, rankLevel = 3) {
  // 12个部门每个分配正职+副职，共24人 + 2名待命下属
  // 正副职 sub_level 按现实职级体系计算（公安等强力部门高配）

  const DEPT_KEYS: DeptKey[] = ['police', 'ndrc', 'finance', 'urban', 'education', 'health', 'ecology', 'market', 'agriculture', 'personnel', 'invest', 'tax'];
  const FACTIONS: import('@/types/game').Faction[] = ['reform', 'pragmatic', 'neutral', 'economy', 'discipline'];
  const subs = [];
  // 跟踪已用名字，防止同批次重复
  const _usedSubNames = new Set<string>();

  const makeSub = (deptKey: DeptKey | null, isAppointed: boolean, deptPosition: 'head' | 'deputy') => {
    const isFemale = Math.random() < 0.35;
    const gender = isFemale ? '女' : '男';
    const namePool = isFemale ? SUBORDINATE_NAMES_FEMALE : SUBORDINATE_NAMES_MALE;
    let name = namePool[Math.floor(Math.random() * namePool.length)];
    // 去重：最多重试60次
    for (let _r = 0; _r < 60 && _usedSubNames.has(name); _r++) {
      name = namePool[Math.floor(Math.random() * namePool.length)];
    }
    _usedSubNames.add(name);
    // 动态生成职务称谓（随rankLevel适配乡镇/县/市/省/国层级）
    const roleLabel = deptKey
      ? (deptPosition === 'head' ? getDeptHeadTitle(deptKey, rankLevel) : getDeptDeputyTitle(deptKey, rankLevel))
      : null;
    // 按现实职级体系计算 sub_level（公安/税务/组织等高配部门正职高一级）
    const subLevel = deptKey
      ? getDeptPositionSubLevel(deptKey, rankLevel, deptPosition)
      : Math.max(1, rankLevel - 2);
    const faction = FACTIONS[Math.floor(Math.random() * FACTIONS.length)];
    // position 字段显示实际职务（与 roleLabel 一致）
    const position = roleLabel ?? (deptPosition === 'head' ? '负责人' : '工作人员');
    return {
      save_id: saveId,
      user_id: userId,
      name,
      gender,
      position,
      role: 'regular',
      avatar_id: Math.floor(Math.random() * 8),
      ability: 45 + Math.floor(Math.random() * 30),
      loyalty: 50 + Math.floor(Math.random() * 30),
      integrity: 50 + Math.floor(Math.random() * 30),
      experience: 30 + Math.floor(Math.random() * 30),
      faction,
      sub_level: subLevel,
      is_appointed: isAppointed,
      appointed_role: roleLabel,
      appointed_dept: deptKey,
      dept_position: deptPosition,
      transferred_city: null,
      last_assessed_day: 0,
    };
  };

  // 12 正职
  for (const dk of DEPT_KEYS) subs.push(makeSub(dk, true, 'head'));
  // 12 副职
  for (const dk of DEPT_KEYS) subs.push(makeSub(dk, true, 'deputy'));
  // 额外2名待命下属
  subs.push(makeSub(null, false, 'head'));
  subs.push(makeSub(null, false, 'head'));

  await supabase.from('subordinates').insert(subs);
}

export async function getSubordinates(saveId: string): Promise<Subordinate[]> {
  const { data, error } = await supabase
    .from('subordinates')
    .select('*')
    .eq('save_id', saveId)
    .order('created_at', { ascending: true });

  if (error || !data) return [];
  return (data as Record<string, unknown>[]).map(rowToSubordinate);
}

/**
 * 按玩家当前职级过滤下属：
 * rankLevel R 的玩家只能管理 subLevel 在 [R-3, R-1] 范围内的直属下属
 * （例如内阁部长12级只看9-11级下属，省执政委书记11级只看8-10级）
 */
export async function getSubordinatesByRank(saveId: string, rankLevel: number): Promise<Subordinate[]> {
  // 总理（rank14+）：展示所有部级委员/省执政委书记及以上（subLevel 9+，涵盖内阁部长/副部/省执政委书记/副书记等）
  // 副总理（rank13）：展示省级及以上人员（subLevel >= 9）
  // 其他高层：根据 rankLevel 计算范围
  const minSub = rankLevel >= 13 ? 9 : Math.max(1, rankLevel - 3);
  const maxSub = rankLevel >= 14 ? 13 : Math.max(1, rankLevel - 1);
  const { data, error } = await supabase
    .from('subordinates')
    .select('*')
    .eq('save_id', saveId)
    .gte('sub_level', minSub)
    .lte('sub_level', maxSub)
    .order('sub_level', { ascending: false });

  if (error || !data) return [];
  return (data as Record<string, unknown>[]).map(rowToSubordinate);
}

/** 获取某存档下所有下属（不过滤职级，供KPI排名等全量场景使用） */
export async function getAllSubordinates(saveId: string): Promise<Subordinate[]> {
  const { data, error } = await supabase
    .from('subordinates')
    .select('*')
    .eq('save_id', saveId)
    .is('transferred_city', null)
    .order('sub_level', { ascending: false })
    .limit(200);
  if (error || !data) return [];
  return (data as Record<string, unknown>[]).map(rowToSubordinate);
}

export async function appointSubordinate(
  subId: string,
  role: string | null,
  roleLabel: string | null,
  deptKey: DeptKey | null,
  deptPosition: 'head' | 'deputy' | 'staff' = 'head',
  rankLevel = 3,
): Promise<boolean> {
  // 写入时同步更新 sub_level（按职级体系）和 position（显示实际职务名称）
  const subLevel = deptKey
    ? getDeptPositionSubLevel(deptKey, rankLevel, deptPosition === 'staff' ? 'deputy' : deptPosition)
    : undefined;
  const { error } = await supabase
    .from('subordinates')
    .update({
      is_appointed: !!role,
      appointed_role: roleLabel,
      appointed_dept: deptKey,
      dept_position: deptPosition,
      ...(subLevel !== undefined ? { sub_level: subLevel } : {}),
      ...(roleLabel ? { position: roleLabel } : {}),
    })
    .eq('id', subId);
  return !error;
}

export async function transferSubordinate(subId: string, targetCity: string): Promise<boolean> {
  const { error } = await supabase
    .from('subordinates')
    .update({ transferred_city: targetCity, is_appointed: false, appointed_role: null, appointed_dept: null })
    .eq('id', subId);
  return !error;
}

/** 获取所有已调任的历史下属 */
export async function getTransferredSubordinates(saveId: string): Promise<Subordinate[]> {
  const { data, error } = await supabase
    .from('subordinates')
    .select('*')
    .eq('save_id', saveId)
    .not('transferred_city', 'is', null)
    .order('sub_level', { ascending: false });
  if (error || !data) return [];
  return (data as Record<string, unknown>[]).map(rowToSubordinate);
}

/** 召回历史调任下属到当前队伍（清除 transferred_city） */
export async function recallSubordinate(subId: string): Promise<boolean> {
  const { error } = await supabase
    .from('subordinates')
    .update({ transferred_city: null, is_appointed: false, appointed_role: null, appointed_dept: null })
    .eq('id', subId);
  return !error;
}

export async function assessSubordinate(subId: string, currentDay: number, abilityDelta: number, loyaltyDelta: number, integrityDelta: number, expDelta: number): Promise<boolean> {
  const { data } = await supabase.from('subordinates').select('ability, loyalty, integrity, experience').eq('id', subId).single();
  if (!data) return false;
  const row = data as Record<string, unknown>;
  const { error } = await supabase.from('subordinates').update({
    ability: Math.max(0, Math.min(100, (row.ability as number) + abilityDelta)),
    loyalty: Math.max(0, Math.min(100, (row.loyalty as number) + loyaltyDelta)),
    integrity: Math.max(0, Math.min(100, (row.integrity as number) + integrityDelta)),
    experience: Math.max(0, Math.min(100, (row.experience as number) + expDelta)),
    last_assessed_day: currentDay,
  }).eq('id', subId);
  return !error;
}

// ============ 任务操作 ============

type TaskUrgency = 'normal' | 'important' | 'urgent';

interface TaskTemplate {
  title: string;
  description: string;
  taskType: string;
  category: string; // 'economic'|'livelihood'|'security'|'reception'|'petition'|'opinion'|'project'|'inspection'|'merit'
  targetValue: number;
  rewardMerit: number;
  rewardFavor: number;
  penaltyMerit: number;
  penaltyFavor: number;
  deadlineDays: number; // 相对天数
  urgency: TaskUrgency;
}

const TASK_TEMPLATES: TaskTemplate[] = [
  // ── 经济指标类 (economic) ──
  {
    title: 'GDP增长指标完成',
    description: '省执政委年度经济工作会议要求本辖区GDP指数达到60以上。增长不达标将影响年终考核评优，请统筹安排招商引资与项目推进工作。',
    taskType: 'city', category: 'economic', targetValue: 60,
    rewardMerit: 30, rewardFavor: 15, penaltyMerit: 20, penaltyFavor: 10,
    deadlineDays: 365, urgency: 'normal',
  },
  {
    title: '营商环境专项提升',
    description: '省营商环境督导组将于近期来访，要求营商环境指数提升至65以上。请尽快落实"放管服"改革举措，减少审批环节。',
    taskType: 'city', category: 'economic', targetValue: 65,
    rewardMerit: 28, rewardFavor: 14, penaltyMerit: 18, penaltyFavor: 8,
    deadlineDays: 270, urgency: 'important',
  },
  {
    title: '财政收入目标',
    description: '年度预算编制显示财政收入缺口较大，需通过强化税收征管、规范非税收入完成财政目标。请督促财政和税务部门落实。',
    taskType: 'city', category: 'economic', targetValue: 58,
    rewardMerit: 25, rewardFavor: 12, penaltyMerit: 15, penaltyFavor: 7,
    deadlineDays: 365, urgency: 'normal',
  },
  // ── 民生工程类 (livelihood) ──
  {
    title: '民生满意度提升',
    description: '第三方机构民意调查显示民生指数偏低，位列全省后三分之一。上级明确要求限期整改，重点在教育、医疗、住房保障方面发力。',
    taskType: 'city', category: 'livelihood', targetValue: 60,
    rewardMerit: 25, rewardFavor: 12, penaltyMerit: 15, penaltyFavor: 8,
    deadlineDays: 365, urgency: 'normal',
  },
  {
    title: '老旧小区改造工程',
    description: '住建部门将城区老旧小区列为民生重点项目，要求在年底前完成改造并达到宜居标准，改善居民生活条件，提升民生满意度至62以上。',
    taskType: 'city', category: 'livelihood', targetValue: 62,
    rewardMerit: 22, rewardFavor: 10, penaltyMerit: 12, penaltyFavor: 6,
    deadlineDays: 300, urgency: 'important',
  },
  // ── 治安维稳类 (security) ──
  {
    title: '治安专项整治',
    description: '连续发生多起入室盗窃和街面寻衅滋事事件，群众安全感下降。上级部署专项整治，要求治安指数在90天内恢复至65以上。',
    taskType: 'security', category: 'security', targetValue: 65,
    rewardMerit: 20, rewardFavor: 10, penaltyMerit: 15, penaltyFavor: 8,
    deadlineDays: 90, urgency: 'urgent',
  },
  {
    title: '扫黑除恶专项行动',
    description: '中央部署扫黑除恶专项行动，要求各地清除黑恶势力，摧毁地下势力保护伞，治安指数需提升至68以上，并提交专项报告。',
    taskType: 'security', category: 'security', targetValue: 68,
    rewardMerit: 30, rewardFavor: 15, penaltyMerit: 25, penaltyFavor: 12,
    deadlineDays: 180, urgency: 'important',
  },
  // ── 接待调研类 (reception) ──
  {
    title: '迎接省级调研组',
    description: '省执政委调研组定于下月初莅临检查，重点考察经济发展和营商环境。请做好汇报材料准备，确保重点指标达标，营造良好接待氛围。累计政绩须达50分。',
    taskType: 'merit', category: 'reception', targetValue: 50,
    rewardMerit: 35, rewardFavor: 20, penaltyMerit: 10, penaltyFavor: 15,
    deadlineDays: 90, urgency: 'important',
  },
  {
    title: '全国现场会承办',
    description: '本辖区被确定为全国典型经验现场交流会举办地，需确保各项指标全面达标、接待工作万无一失。这是难得的亮相机会，政绩须达60分。',
    taskType: 'merit', category: 'reception', targetValue: 60,
    rewardMerit: 45, rewardFavor: 22, penaltyMerit: 20, penaltyFavor: 18,
    deadlineDays: 120, urgency: 'urgent',
  },
  // ── 信访处置类 (petition) ──
  {
    title: '重点信访积案化解',
    description: '信访局上报多起跨越三年以上的积案，上级已将其列为重点督查事项。要求在180天内将治安指数提升至62以上，从根源上减少信访产生。',
    taskType: 'security', category: 'petition', targetValue: 62,
    rewardMerit: 18, rewardFavor: 10, penaltyMerit: 20, penaltyFavor: 12,
    deadlineDays: 180, urgency: 'important',
  },
  // ── 舆情管控类 (opinion) ──
  {
    title: '负面舆情应对处置',
    description: '辖区一工厂排污事件被网络曝光，引发大量负面舆情，新闻媒体持续追踪。上级要求立即处置，限期治理，民生指数须恢复至58以上以平息民意。',
    taskType: 'city', category: 'opinion', targetValue: 58,
    rewardMerit: 20, rewardFavor: 12, penaltyMerit: 25, penaltyFavor: 15,
    deadlineDays: 60, urgency: 'urgent',
  },
  // ── 项目推进类 (project) ──
  {
    title: '重点项目年底开工',
    description: '纳入省重点项目名单的基础设施工程须在年底前开工建设，请协调国土、住建、环保等部门加快审批，推进征地拆迁工作，确保GDP增长目标。',
    taskType: 'city', category: 'project', targetValue: 63,
    rewardMerit: 32, rewardFavor: 16, penaltyMerit: 20, penaltyFavor: 10,
    deadlineDays: 330, urgency: 'normal',
  },
  {
    title: '产业园区招商引资',
    description: '开发区管委会完成基础设施建设，现阶段核心任务是招商引资。上级要求在年内引进有效项目，推动园区GDP指数提升至65以上。',
    taskType: 'city', category: 'project', targetValue: 65,
    rewardMerit: 28, rewardFavor: 14, penaltyMerit: 15, penaltyFavor: 8,
    deadlineDays: 365, urgency: 'normal',
  },
  // ── 巡视配合类 (inspection) ──
  {
    title: '配合中央巡视组工作',
    description: '中央巡视组已进驻，要求领导干部如实提供材料并接受约谈。这是政治上的重要考验，须保持高政绩分值展示执政成效，政绩须达55分。',
    taskType: 'merit', category: 'inspection', targetValue: 55,
    rewardMerit: 40, rewardFavor: 18, penaltyMerit: 30, penaltyFavor: 20,
    deadlineDays: 90, urgency: 'urgent',
  },
  {
    title: '年度政绩综合考核',
    description: '年度领导干部综合考核即将启动，组织部门将全面评估政绩。须积累足够的政绩值（≥50）以获得优秀评级，进入晋升考察序列。',
    taskType: 'merit', category: 'merit', targetValue: 50,
    rewardMerit: 35, rewardFavor: 18, penaltyMerit: 15, penaltyFavor: 10,
    deadlineDays: 365, urgency: 'normal',
  },
  {
    title: '环保督察整改落实',
    description: '省环保督察组反馈整改意见，要求在120天内完成涉及大气、水质、土壤污染的整改任务，并提交书面整改报告。城市综合指数须提升至62。',
    taskType: 'city', category: 'inspection', targetValue: 62,
    rewardMerit: 25, rewardFavor: 13, penaltyMerit: 30, penaltyFavor: 18,
    deadlineDays: 120, urgency: 'urgent',
  },
];

export async function initBossTasks(saveId: string, userId: string, careerPathLine?: string, gameDays = 0) {
  // 新游戏创建时不发任务（第二个月才发）；晋升/平调时 gameDays > 0 正常下发
  if (gameDays === 0) return;

  const lineKey = careerPathLine ?? '行政线';
  const pool = LINE_TASK_POOLS[lineKey] ?? LINE_TASK_POOLS['行政线'];
  // 按上司级别各随机抽取，共 4 个任务
  const pickedIndices = new Set<number>();
  const getUnique = (): TaskTemplate => {
    let idx = 0;
    let attempts = 0;
    do { idx = Math.floor(Math.random() * pool.length); attempts++; } while (pickedIndices.has(idx) && attempts < 20);
    pickedIndices.add(idx);
    return pool[idx];
  };
  const templates = [
    { t: getUnique(), bossLevel: 1 },
    { t: getUnique(), bossLevel: 1 },
    { t: getUnique(), bossLevel: 2 },
    { t: getUnique(), bossLevel: 3 },
  ];
  const tasks = templates.map(({ t, bossLevel }) => ({
    save_id: saveId,
    user_id: userId,
    title: t.title,
    description: t.description,
    task_type: t.taskType,
    target_value: t.targetValue,
    current_value: 0,
    reward_merit: t.rewardMerit,
    reward_favor: t.rewardFavor,
    penalty_merit: t.penaltyMerit,
    penalty_favor: t.penaltyFavor,
    status: 'active',
    deadline_days: gameDays + t.deadlineDays,
    created_day: gameDays,
    boss_level: bossLevel,
    is_postponed: false,
    urgency: t.urgency,
  }));
  await supabase.from('boss_tasks').insert(tasks);
}

export async function getBossTasks(saveId: string): Promise<BossTask[]> {
  const { data, error } = await supabase
    .from('boss_tasks')
    .select('*')
    .eq('save_id', saveId)
    .order('created_at', { ascending: true });

  if (error || !data) return [];
  return (data as Record<string, unknown>[]).map(rowToBossTask);
}

export async function completeTask(taskId: string): Promise<boolean> {
  const { error } = await supabase.from('boss_tasks').update({ status: 'completed' }).eq('id', taskId);
  return !error;
}

// 申请减负：延期30天，标记已申请
export async function postponeTask(taskId: string, extraDays: number): Promise<boolean> {
  const { data: row } = await supabase.from('boss_tasks').select('deadline_days').eq('id', taskId).single();
  if (!row) return false;
  const newDeadline = (row.deadline_days as number) + extraDays;
  const { error } = await supabase.from('boss_tasks').update({
    deadline_days: newDeadline,
    is_postponed: true,
  }).eq('id', taskId);
  return !error;
}

// ── 四大系统·按所属站所分组的上级任务池 ──────────────────────────────────────
// 格式：title 以 [站所名] 开头，方便 UI 截取显示来源部门
const LINE_TASK_POOLS: Record<string, TaskTemplate[]> = {

  // ════════════════════════════════════════════════════════════
  //  党委工作系统 → 党务线
  // ════════════════════════════════════════════════════════════
  '党务线': [
    // ── 党务办 ──
    { title: '[党务办]基层党建标准化达标', description: '党务办通知：上级党委要求年底前所有基层党组织完成标准化建设验收，党建综合评分须达60分，请督促各支部落实。', taskType: 'city', category: 'party', targetValue: 60, rewardMerit: 30, rewardFavor: 15, penaltyMerit: 20, penaltyFavor: 10, deadlineDays: 300, urgency: 'normal' },
    { title: '[党务办]年度党建述职考核', description: '党务办转发：组织部门启动年度党建述职考核，要求辖区党建评分≥62，班子成员全程配合述职。', taskType: 'city', category: 'party', targetValue: 62, rewardMerit: 35, rewardFavor: 18, penaltyMerit: 22, penaltyFavor: 12, deadlineDays: 180, urgency: 'important' },
    { title: '[党务办]软弱涣散党支部整顿', description: '党务办督办：上级党委挂牌督办辖区软弱涣散村党支部整顿工作，要求在120天内提升党建评分至61以上。', taskType: 'city', category: 'party', targetValue: 61, rewardMerit: 25, rewardFavor: 12, penaltyMerit: 18, penaltyFavor: 10, deadlineDays: 120, urgency: 'important' },
    { title: '[党务办]发展党员年度计划', description: '党务办下达年度发展党员指标，要求严格落实积极分子培养程序，完成计划发展目标，提升党员队伍质量。', taskType: 'merit', category: 'party', targetValue: 50, rewardMerit: 22, rewardFavor: 10, penaltyMerit: 15, penaltyFavor: 8, deadlineDays: 365, urgency: 'normal' },
    { title: '[党务办]后备干部梯队建设', description: '党务办要求建立后备干部动态台账，配强基层党支部班子，年底前后备干部储备须达标，政绩≥52分。', taskType: 'merit', category: 'party', targetValue: 52, rewardMerit: 28, rewardFavor: 13, penaltyMerit: 16, penaltyFavor: 9, deadlineDays: 240, urgency: 'normal' },
    { title: '[党务办]党员教育培训全覆盖', description: '党务办通知：上级要求完成辖区党员年度培训任务，覆盖率须达100%，考核不合格党员须补训，政绩≥48分。', taskType: 'merit', category: 'party', targetValue: 48, rewardMerit: 20, rewardFavor: 10, penaltyMerit: 12, penaltyFavor: 7, deadlineDays: 270, urgency: 'normal' },
    { title: '[党务办]党建引领基层治理示范', description: '党务办争取试点：省委推进党建引领基层治理试点，要求打造示范点，党建评分须突破65，形成可推广经验。', taskType: 'city', category: 'party', targetValue: 65, rewardMerit: 40, rewardFavor: 20, penaltyMerit: 25, penaltyFavor: 15, deadlineDays: 180, urgency: 'important' },
    { title: '[党务办]两新组织党建攻坚', description: '党务办要求非公企业和社会组织党组织应建尽建，覆盖率须提升，党建评分达63以上。', taskType: 'city', category: 'party', targetValue: 63, rewardMerit: 26, rewardFavor: 12, penaltyMerit: 15, penaltyFavor: 9, deadlineDays: 200, urgency: 'normal' },
    { title: '[党务办]迎接上级党建督查', description: '党务办通报：省委组织部党建督查组下月来访，须提前完成党建重点工作，政绩须达55分备查，请做好材料准备。', taskType: 'merit', category: 'reception', targetValue: 55, rewardMerit: 35, rewardFavor: 20, penaltyMerit: 15, penaltyFavor: 15, deadlineDays: 90, urgency: 'urgent' },
    { title: '[党务办]廉政教育专项部署', description: '党务办配合纪委：要求全员廉政警示教育覆盖，公众舆情须保持在63以上，配合廉洁文化建设工作。', taskType: 'city', category: 'opinion', targetValue: 63, rewardMerit: 24, rewardFavor: 12, penaltyMerit: 20, penaltyFavor: 12, deadlineDays: 150, urgency: 'normal' },
    { title: '[党务办]配合巡察组进驻', description: '党务办协调：上级巡察组进驻辖区，须如实提供党建档案材料，政绩须达56分以展示党建工作实绩。', taskType: 'merit', category: 'inspection', targetValue: 56, rewardMerit: 38, rewardFavor: 18, penaltyMerit: 28, penaltyFavor: 18, deadlineDays: 90, urgency: 'urgent' },
    { title: '[党务办]党史学习教育深化', description: '党务办推进：上级要求深化党史学习教育成果转化，舆情指数须维持在62以上，形成学习成果汇报。', taskType: 'city', category: 'opinion', targetValue: 62, rewardMerit: 22, rewardFavor: 11, penaltyMerit: 13, penaltyFavor: 8, deadlineDays: 180, urgency: 'normal' },
    { title: '[党务办]干部作风专项整治', description: '党务办督促：上级开展干部作风问题集中整治，要求无违规行为发生，政绩须保持在52分以上。', taskType: 'merit', category: 'merit', targetValue: 52, rewardMerit: 30, rewardFavor: 15, penaltyMerit: 25, penaltyFavor: 15, deadlineDays: 120, urgency: 'important' },
    { title: '[党务办]全年党建工作考核优秀', description: '党务办年终目标：年度党建工作综合考核启动，争取优秀等次，须在多项党建指标全面达标，政绩≥54分。', taskType: 'merit', category: 'merit', targetValue: 54, rewardMerit: 40, rewardFavor: 20, penaltyMerit: 20, penaltyFavor: 12, deadlineDays: 365, urgency: 'normal' },
    { title: '[党务办]意识形态安全专项检查', description: '党务办协同宣传部：开展意识形态专项巡查，要求公众舆情指数保持在65以上，确保意识形态阵地安全。', taskType: 'city', category: 'opinion', targetValue: 65, rewardMerit: 28, rewardFavor: 14, penaltyMerit: 25, penaltyFavor: 15, deadlineDays: 90, urgency: 'urgent' },
  ],

  // ════════════════════════════════════════════════════════════
  //  政法综治系统 → 纪检线（派出所 + 信访室）
  // ════════════════════════════════════════════════════════════
  '纪检线': [
    // ── 派出所 ──
    { title: '[派出所]治安专项整治行动', description: '派出所接上级指令：要求治安指数在90天内恢复至65以上，集中打击街面违法犯罪，减少案件发生率。', taskType: 'security', category: 'security', targetValue: 65, rewardMerit: 20, rewardFavor: 10, penaltyMerit: 15, penaltyFavor: 8, deadlineDays: 90, urgency: 'urgent' },
    { title: '[派出所]扫黑除恶专项行动', description: '派出所贯彻中央部署：开展扫黑除恶专项行动，要求清除黑恶势力，治安指数须提升至68以上并提交专项报告。', taskType: 'security', category: 'security', targetValue: 68, rewardMerit: 30, rewardFavor: 15, penaltyMerit: 25, penaltyFavor: 12, deadlineDays: 180, urgency: 'important' },
    { title: '[派出所]社区警务建设达标', description: '派出所落实省公安厅要求：完成辖区社区警务室配套建设，推行一村一警制度，治安指数须稳定在64以上。', taskType: 'security', category: 'security', targetValue: 64, rewardMerit: 22, rewardFavor: 11, penaltyMerit: 14, penaltyFavor: 8, deadlineDays: 180, urgency: 'normal' },
    { title: '[派出所]平安建设综合考核', description: '派出所年度考核：平安建设考核启动，治安指数须保持在65以上，并完成迎检材料准备，确保达到上级标准。', taskType: 'security', category: 'security', targetValue: 65, rewardMerit: 28, rewardFavor: 14, penaltyMerit: 20, penaltyFavor: 10, deadlineDays: 300, urgency: 'normal' },
    { title: '[派出所]反诈宣传全覆盖', description: '派出所部署：完成辖区反诈宣传全面覆盖，推动公众舆情指数维持在62以上，降低电信网络诈骗发生率。', taskType: 'city', category: 'opinion', targetValue: 62, rewardMerit: 18, rewardFavor: 9, penaltyMerit: 12, penaltyFavor: 7, deadlineDays: 180, urgency: 'normal' },
    { title: '[派出所]禁毒宣传整治行动', description: '派出所配合禁毒委员会：开展全域禁毒宣传整治，治安指数须提升至66以上，并提交禁毒工作专项报告。', taskType: 'security', category: 'security', targetValue: 66, rewardMerit: 24, rewardFavor: 12, penaltyMerit: 16, penaltyFavor: 9, deadlineDays: 150, urgency: 'important' },
    { title: '[派出所]重大维稳期间保障', description: '派出所重大任务：重大节庆期间要求零信访、零事故，治安指数须稳定在67以上，落实全员维稳值守工作。', taskType: 'security', category: 'security', targetValue: 67, rewardMerit: 30, rewardFavor: 15, penaltyMerit: 25, penaltyFavor: 14, deadlineDays: 60, urgency: 'urgent' },
    { title: '[派出所]安全生产隐患排查', description: '派出所协同应急管理：开展安全生产全域检查，重大隐患须整改销号，民生指数须达60以上。', taskType: 'city', category: 'livelihood', targetValue: 60, rewardMerit: 20, rewardFavor: 10, penaltyMerit: 15, penaltyFavor: 9, deadlineDays: 120, urgency: 'normal' },
    // ── 信访室 ──
    { title: '[信访室]重点信访积案集中化解', description: '信访室上报多起跨越三年以上积案，上级已列为重点督查，要求180天内将治安指数提升至62以上。', taskType: 'security', category: 'petition', targetValue: 62, rewardMerit: 18, rewardFavor: 10, penaltyMerit: 20, penaltyFavor: 12, deadlineDays: 180, urgency: 'important' },
    { title: '[信访室]矛盾纠纷全域摸排', description: '信访室部署：开展社会矛盾全域摸排，重点时期前须将信访风险隐患降至可控水平，治安指数须达64。', taskType: 'security', category: 'petition', targetValue: 64, rewardMerit: 24, rewardFavor: 12, penaltyMerit: 16, penaltyFavor: 9, deadlineDays: 120, urgency: 'normal' },
    { title: '[信访室]舆情管控专项处置', description: '信访室协同网信：辖区发生网络负面舆情，要求72小时内启动处置机制，公众舆情指数须恢复至60以上。', taskType: 'city', category: 'opinion', targetValue: 60, rewardMerit: 22, rewardFavor: 12, penaltyMerit: 28, penaltyFavor: 16, deadlineDays: 60, urgency: 'urgent' },
    { title: '[信访室]迎接政法巡查考核', description: '信访室协调：省政法委巡查组下月来访，须提前完成综治重点工作，政绩须达52分以展示政法工作实绩。', taskType: 'merit', category: 'reception', targetValue: 52, rewardMerit: 35, rewardFavor: 18, penaltyMerit: 18, penaltyFavor: 14, deadlineDays: 90, urgency: 'urgent' },
    { title: '[信访室]年度综治工作考核优秀', description: '信访室年终冲刺：年度综治平安建设考核，须在治安、信访、舆情多项指标全面达标，政绩≥50分。', taskType: 'merit', category: 'merit', targetValue: 50, rewardMerit: 35, rewardFavor: 16, penaltyMerit: 20, penaltyFavor: 12, deadlineDays: 365, urgency: 'normal' },
    { title: '[信访室]配合巡视组廉洁核查', description: '信访室转达：中央巡视组进驻，须配合廉洁工作核查，保持政绩55分以上，提供真实完整的廉政材料。', taskType: 'merit', category: 'inspection', targetValue: 55, rewardMerit: 40, rewardFavor: 18, penaltyMerit: 30, penaltyFavor: 20, deadlineDays: 90, urgency: 'urgent' },
    { title: '[信访室]食药安全专项整治', description: '信访室联合市场监管：开展食品药品安全专项整治，排查重大隐患，民生指数须提升至61以上。', taskType: 'city', category: 'livelihood', targetValue: 61, rewardMerit: 20, rewardFavor: 10, penaltyMerit: 14, penaltyFavor: 8, deadlineDays: 120, urgency: 'normal' },
  ],

  // ════════════════════════════════════════════════════════════
  //  政府职能系统 → 行政线（11个站所轮转）
  // ════════════════════════════════════════════════════════════
  '行政线': [
    // ── 发改站 ──
    { title: '[发改站]年度GDP增长指标', description: '发改站下达：省执政委年度经济工作会议要求本辖区GDP指数达到60以上，请统筹招商引资与项目推进。', taskType: 'city', category: 'economic', targetValue: 60, rewardMerit: 30, rewardFavor: 15, penaltyMerit: 20, penaltyFavor: 10, deadlineDays: 365, urgency: 'normal' },
    { title: '[发改站]重点项目年底开工', description: '发改站督促：纳入省重点项目须在年底前开工建设，请协调国土、住建、环保等部门加快审批，确保GDP增长目标。', taskType: 'city', category: 'project', targetValue: 63, rewardMerit: 32, rewardFavor: 16, penaltyMerit: 20, penaltyFavor: 10, deadlineDays: 330, urgency: 'normal' },
    { title: '[发改站]产业园区招商引资', description: '发改站安排：开发区管委会完成基础设施建设，核心任务是招商引资，推动园区GDP指数提升至65以上。', taskType: 'city', category: 'project', targetValue: 65, rewardMerit: 28, rewardFavor: 14, penaltyMerit: 15, penaltyFavor: 8, deadlineDays: 365, urgency: 'normal' },
    // ── 财政所 ──
    { title: '[财政所]年度财政收入目标', description: '财政所通报：年度财政收入缺口较大，需通过强化税收征管、规范非税收入完成财政目标，请协调税务部门落实。', taskType: 'city', category: 'economic', targetValue: 58, rewardMerit: 25, rewardFavor: 12, penaltyMerit: 15, penaltyFavor: 7, deadlineDays: 365, urgency: 'normal' },
    { title: '[财政所]迎接财政专项审计', description: '财政所紧急：省财政厅专项审计组下月来访，须完成重点支出合规整改，政绩须保持50分以上。', taskType: 'merit', category: 'inspection', targetValue: 50, rewardMerit: 32, rewardFavor: 16, penaltyMerit: 22, penaltyFavor: 14, deadlineDays: 90, urgency: 'urgent' },
    // ── 建设站 ──
    { title: '[建设站]老旧小区改造工程', description: '建设站部署：住建部门要求年底前完成城区老旧小区改造，改善居民居住条件，民生满意度须达62以上。', taskType: 'city', category: 'livelihood', targetValue: 62, rewardMerit: 22, rewardFavor: 10, penaltyMerit: 12, penaltyFavor: 6, deadlineDays: 300, urgency: 'important' },
    { title: '[建设站]基础设施年度计划', description: '建设站要求：年度道路、管网、公共设施维修改造须按计划推进，城市综合指数须提升至62以上。', taskType: 'city', category: 'project', targetValue: 62, rewardMerit: 26, rewardFavor: 12, penaltyMerit: 16, penaltyFavor: 8, deadlineDays: 300, urgency: 'normal' },
    // ── 教育办 ──
    { title: '[教育办]义务教育均衡达标', description: '教育办转达：省教育厅要求推进义务教育均衡发展，补齐薄弱学校短板，民生满意度须提升至63以上。', taskType: 'city', category: 'livelihood', targetValue: 63, rewardMerit: 28, rewardFavor: 13, penaltyMerit: 18, penaltyFavor: 10, deadlineDays: 240, urgency: 'important' },
    { title: '[教育办]中高考成绩提升专项', description: '教育办安排：本辖区中高考升学率需提升，重点学校师资力量须补充，民生指数须保持在61以上。', taskType: 'city', category: 'livelihood', targetValue: 61, rewardMerit: 22, rewardFavor: 10, penaltyMerit: 14, penaltyFavor: 7, deadlineDays: 365, urgency: 'normal' },
    // ── 卫生站 ──
    { title: '[卫生站]基层医疗能力提升', description: '卫生站要求：推进基层卫生院服务能力建设，家庭医生签约率须提升，民生满意度须达60以上。', taskType: 'city', category: 'livelihood', targetValue: 60, rewardMerit: 24, rewardFavor: 11, penaltyMerit: 15, penaltyFavor: 8, deadlineDays: 240, urgency: 'normal' },
    { title: '[卫生站]公共卫生应急演练', description: '卫生站部署：开展突发公共卫生事件应急演练，完善预案体系，民生指数须维持在62以上。', taskType: 'city', category: 'livelihood', targetValue: 62, rewardMerit: 20, rewardFavor: 10, penaltyMerit: 13, penaltyFavor: 7, deadlineDays: 180, urgency: 'normal' },
    // ── 环保站 ──
    { title: '[环保站]环保督察整改落实', description: '环保站接省督察组反馈：要求120天内完成大气、水质、土壤污染整改，城市综合指数须提升至62以上。', taskType: 'city', category: 'inspection', targetValue: 62, rewardMerit: 25, rewardFavor: 13, penaltyMerit: 30, penaltyFavor: 18, deadlineDays: 120, urgency: 'urgent' },
    { title: '[环保站]负面舆情应对处置', description: '环保站紧急处置：辖区排污事件被网络曝光，上级要求立即处置，民生指数须恢复至58以上。', taskType: 'city', category: 'opinion', targetValue: 58, rewardMerit: 20, rewardFavor: 12, penaltyMerit: 25, penaltyFavor: 15, deadlineDays: 60, urgency: 'urgent' },
    // ── 市监所 ──
    { title: '[市监所]食品安全专项整治', description: '市监所部署：开展食品药品安全专项检查，重点排查学校、养老院等重点场所，民生指数须达61以上。', taskType: 'city', category: 'livelihood', targetValue: 61, rewardMerit: 20, rewardFavor: 10, penaltyMerit: 14, penaltyFavor: 8, deadlineDays: 120, urgency: 'normal' },
    { title: '[市监所]营商环境专项提升', description: '市监所推进"放管服"：省营商环境督导组将来访，要求营商环境指数提升至65以上，减少审批环节。', taskType: 'city', category: 'economic', targetValue: 65, rewardMerit: 28, rewardFavor: 14, penaltyMerit: 18, penaltyFavor: 8, deadlineDays: 270, urgency: 'important' },
    // ── 农业站 ──
    { title: '[农业站]高标准农田建设', description: '农业站传达：上级下达高标准农田建设任务，要求年底前完成改造，提升耕地生产能力，推动农业总产值增长。', taskType: 'city', category: 'project', targetValue: 61, rewardMerit: 28, rewardFavor: 13, penaltyMerit: 16, penaltyFavor: 9, deadlineDays: 300, urgency: 'normal' },
    { title: '[农业站]乡村振兴示范点打造', description: '农业站牵头：省农业农村部门要求打造乡村振兴示范村，推动民生指数突破63，形成可推广经验。', taskType: 'city', category: 'livelihood', targetValue: 63, rewardMerit: 30, rewardFavor: 15, penaltyMerit: 18, penaltyFavor: 10, deadlineDays: 240, urgency: 'important' },
    // ── 人事办 ──
    { title: '[人事办]年度政绩综合考核', description: '人事办启动年度领导干部综合考核，须积累足够政绩值（≥50）获得优秀评级，进入晋升考察序列。', taskType: 'merit', category: 'merit', targetValue: 50, rewardMerit: 35, rewardFavor: 18, penaltyMerit: 15, penaltyFavor: 10, deadlineDays: 365, urgency: 'normal' },
    { title: '[人事办]干部考核台账完善', description: '人事办要求：完善领导干部工作台账，强化绩效管理，政绩须保持在52分以上展示执政能力。', taskType: 'merit', category: 'merit', targetValue: 52, rewardMerit: 25, rewardFavor: 12, penaltyMerit: 18, penaltyFavor: 10, deadlineDays: 200, urgency: 'normal' },
    // ── 招商办 ──
    { title: '[招商办]重大项目引资攻坚', description: '招商办安排：承接省重大项目招商推介，要求年内完成签约落地，推动GDP指数提升至65以上。', taskType: 'city', category: 'economic', targetValue: 65, rewardMerit: 35, rewardFavor: 17, penaltyMerit: 22, penaltyFavor: 12, deadlineDays: 240, urgency: 'important' },
    { title: '[招商办]迎接省级调研组', description: '招商办协调接待：省执政委调研组定于下月初莅临，重点考察经济发展和营商环境，政绩须达50分。', taskType: 'merit', category: 'reception', targetValue: 50, rewardMerit: 35, rewardFavor: 20, penaltyMerit: 10, penaltyFavor: 15, deadlineDays: 90, urgency: 'important' },
    { title: '[招商办]全国现场会承办', description: '招商办牵头：本辖区被确定为全国典型经验现场会举办地，政绩须达60分，确保接待工作万无一失。', taskType: 'merit', category: 'reception', targetValue: 60, rewardMerit: 45, rewardFavor: 22, penaltyMerit: 20, penaltyFavor: 18, deadlineDays: 120, urgency: 'urgent' },
    // ── 税务所 ──
    { title: '[税务所]年度税收征管强化', description: '税务所要求：强化税收专项稽查，规范纳税秩序，GDP指数须稳步提升至62以上，完成年度税收任务。', taskType: 'city', category: 'economic', targetValue: 62, rewardMerit: 25, rewardFavor: 12, penaltyMerit: 16, penaltyFavor: 8, deadlineDays: 365, urgency: 'normal' },
    { title: '[税务所]配合中央巡视组工作', description: '税务所配合中央巡视：须保持高政绩分值展示执政成效，提供真实税收数据，政绩须达55分。', taskType: 'merit', category: 'inspection', targetValue: 55, rewardMerit: 40, rewardFavor: 18, penaltyMerit: 30, penaltyFavor: 20, deadlineDays: 90, urgency: 'urgent' },
  ],

  // ════════════════════════════════════════════════════════════
  //  团派系统 → 团派线
  // ════════════════════════════════════════════════════════════
  '团派线': [
    { title: '[团委]青年志愿服务品牌打造', description: '团委安排：团市委要求打造辖区青年志愿服务品牌，公众舆情指数须提升至63以上，形成可推广经验。', taskType: 'city', category: 'youth', targetValue: 63, rewardMerit: 25, rewardFavor: 12, penaltyMerit: 16, penaltyFavor: 9, deadlineDays: 240, urgency: 'normal' },
    { title: '[团委]青年就业创业服务', description: '团委联合人社：扩大青年就业帮扶覆盖面，民生指数须提升至62以上，解决青年就业困难群体需求。', taskType: 'city', category: 'youth', targetValue: 62, rewardMerit: 28, rewardFavor: 13, penaltyMerit: 18, penaltyFavor: 10, deadlineDays: 270, urgency: 'normal' },
    { title: '[团委]五四主题系列活动', description: '团委部署：上级团委要求覆盖辖区全部青年群体开展五四主题活动，公众舆情指数须达62以上。', taskType: 'city', category: 'youth', targetValue: 62, rewardMerit: 22, rewardFavor: 11, penaltyMerit: 13, penaltyFavor: 7, deadlineDays: 90, urgency: 'important' },
    { title: '[团委]团员发展年度指标', description: '团委下达指标：规范入团程序，完成年度团员发展计划，壮大团的组织队伍，政绩≥48分。', taskType: 'merit', category: 'youth', targetValue: 48, rewardMerit: 20, rewardFavor: 10, penaltyMerit: 13, penaltyFavor: 7, deadlineDays: 365, urgency: 'normal' },
    { title: '[团委]困难青少年帮扶行动', description: '团委联合民政：部署困难青少年帮扶行动，民生指数须提升至61以上，建立帮扶台账并跟踪落实。', taskType: 'city', category: 'youth', targetValue: 61, rewardMerit: 24, rewardFavor: 12, penaltyMerit: 15, penaltyFavor: 8, deadlineDays: 180, urgency: 'normal' },
    { title: '[团委]迎接团委工作督查', description: '团委协调：省团委督查组下月来访，须提前完成青年工作重点任务，政绩须达50分以备查。', taskType: 'merit', category: 'reception', targetValue: 50, rewardMerit: 32, rewardFavor: 16, penaltyMerit: 15, penaltyFavor: 12, deadlineDays: 90, urgency: 'urgent' },
    { title: '[团委]青年人才储备库建设', description: '团委联合组织部：建立青年人才储备库，营商环境指数须提升至63以上，吸引青年人才回流创业。', taskType: 'city', category: 'youth', targetValue: 63, rewardMerit: 30, rewardFavor: 14, penaltyMerit: 18, penaltyFavor: 10, deadlineDays: 200, urgency: 'normal' },
    { title: '[团委]志愿者队伍扩规提质', description: '团委要求：青年志愿者注册人数持续扩大，公众舆情指数须达64以上，完善志愿服务积分制度。', taskType: 'city', category: 'youth', targetValue: 64, rewardMerit: 22, rewardFavor: 11, penaltyMerit: 13, penaltyFavor: 7, deadlineDays: 240, urgency: 'normal' },
    { title: '[团委]青年法治教育全覆盖', description: '团委联合司法局：完成辖区青少年法治教育全覆盖工作，民生指数须维持在60以上。', taskType: 'city', category: 'youth', targetValue: 60, rewardMerit: 18, rewardFavor: 9, penaltyMerit: 11, penaltyFavor: 6, deadlineDays: 180, urgency: 'normal' },
    { title: '[团委]青年返乡创业扶持', description: '团委推动：出台青年返乡创业政策包，营商指数须提升至62以上，推动青年创业主体数量增长。', taskType: 'city', category: 'youth', targetValue: 62, rewardMerit: 28, rewardFavor: 13, penaltyMerit: 17, penaltyFavor: 9, deadlineDays: 240, urgency: 'important' },
    { title: '[团委]年度青年工作综合考核', description: '团委年终目标：年度青年工作综合考核，须在志愿服务、团员发展、青年帮扶多项指标全面达标，政绩≥48分。', taskType: 'merit', category: 'merit', targetValue: 48, rewardMerit: 32, rewardFavor: 15, penaltyMerit: 18, penaltyFavor: 10, deadlineDays: 365, urgency: 'normal' },
    { title: '[团委]青年节文体系列活动', description: '团委部署：要求覆盖面广、参与度高地开展青年节系列文体活动，公众舆情指数须达63以上。', taskType: 'city', category: 'youth', targetValue: 63, rewardMerit: 20, rewardFavor: 10, penaltyMerit: 12, penaltyFavor: 7, deadlineDays: 120, urgency: 'normal' },
    { title: '[团委]寒暑假青少年托管服务', description: '团委联合民政教育：建设困境青少年公益托管服务站点，民生指数须提升至62以上。', taskType: 'city', category: 'youth', targetValue: 62, rewardMerit: 24, rewardFavor: 12, penaltyMerit: 14, penaltyFavor: 8, deadlineDays: 150, urgency: 'important' },
    { title: '[团委]青年网络文明素养提升', description: '团委联合网信：开展青年网络文明素养提升行动，舆情指数须维持在63以上。', taskType: 'city', category: 'opinion', targetValue: 63, rewardMerit: 18, rewardFavor: 9, penaltyMerit: 11, penaltyFavor: 6, deadlineDays: 180, urgency: 'normal' },
    { title: '[团委]配合团省委专项调研', description: '团委协调：团省委调研组莅临，须全面展示青年工作实绩，政绩须达52分，准备详细工作汇报材料。', taskType: 'merit', category: 'reception', targetValue: 52, rewardMerit: 36, rewardFavor: 18, penaltyMerit: 16, penaltyFavor: 13, deadlineDays: 90, urgency: 'urgent' },
  ],
};

export async function addNewTask(saveId: string, userId: string, gameDays: number, careerPathLine?: string): Promise<void> {
  const lineKey = careerPathLine ?? '行政线';
  const pool = LINE_TASK_POOLS[lineKey] ?? LINE_TASK_POOLS['行政线'];
  const tpl = pool[Math.floor(Math.random() * pool.length)];
  const bossLevel = Math.ceil(Math.random() * 3);
  await supabase.from('boss_tasks').insert({
    save_id: saveId,
    user_id: userId,
    title: tpl.title,
    description: tpl.description,
    task_type: tpl.taskType,
    target_value: tpl.targetValue,
    current_value: 0,
    reward_merit: tpl.rewardMerit,
    reward_favor: tpl.rewardFavor,
    penalty_merit: tpl.penaltyMerit,
    penalty_favor: tpl.penaltyFavor,
    status: 'active',
    deadline_days: gameDays + tpl.deadlineDays,
    created_day: gameDays,
    boss_level: bossLevel,
    is_postponed: false,
    urgency: tpl.urgency,
  });
}

// ============ 上司关系互动 ============

export interface BossInteraction {
  id: string;
  saveId: string;
  bossLevel: number;
  actionType: string; // 'report'|'consult'|'greet'
  gameDay: number;
  favorDelta: number;
  createdAt: string;
}

/** 获取指定存档的上司互动记录（最近100条） */
export async function getBossInteractions(saveId: string): Promise<BossInteraction[]> {
  const { data, error } = await supabase
    .from('boss_interactions')
    .select('*')
    .eq('save_id', saveId)
    .order('game_day', { ascending: false })
    .limit(100);
  if (error || !data) return [];
  return (data as Record<string, unknown>[]).map(r => ({
    id: r.id as string,
    saveId: r.save_id as string,
    bossLevel: r.boss_level as number,
    actionType: r.action_type as string,
    gameDay: r.game_day as number,
    favorDelta: r.favor_delta as number,
    createdAt: r.created_at as string,
  }));
}

/** 执行上司关系操作，返回实际好感度增量（0表示冷却中或精力不足） */
export async function performBossAction(
  saveId: string,
  bossLevel: number,
  actionType: 'report' | 'consult' | 'greet',
  currentGameDay: number,
  interactions: BossInteraction[],
): Promise<number> {
  const COOLDOWN = 30; // 冷却天数
  const lastSame = interactions
    .filter(i => i.bossLevel === bossLevel && i.actionType === actionType)
    .sort((a, b) => b.gameDay - a.gameDay)[0];
  if (lastSame && currentGameDay - lastSame.gameDay < COOLDOWN) return 0;

  const BASE_FAVOR: Record<string, number> = { report: 5, consult: 8, greet: 3 };
  const delta = BASE_FAVOR[actionType] ?? 3;

  await supabase.from('boss_interactions').insert({
    save_id: saveId,
    boss_level: bossLevel,
    action_type: actionType,
    game_day: currentGameDay,
    favor_delta: delta,
  });
  return delta;
}

// ============ 案件操作 ============

const CASE_TEMPLATES = [
  { title: '连环入室盗窃案', description: '城区多处居民楼发生入室盗窃，嫌疑人惯用相同手法，有组织作案迹象。居民恐慌，媒体关注。', caseType: 'criminal' as const, difficulty: 40, requiredPolice: 15, rewardMerit: 12, securityChange: 8 },
  { title: '涉黄赌场端掉', description: '线报显示辖区某地下室长期经营赌场，参与人员众多，涉案金额较大。', caseType: 'criminal' as const, difficulty: 50, requiredPolice: 20, rewardMerit: 15, securityChange: 10 },
  { title: '官员腐败举报查处', description: '纪委转来群众举报，某科级干部涉嫌收受贿赂，需配合调查。', caseType: 'corruption' as const, difficulty: 60, requiredPolice: 10, rewardMerit: 20, securityChange: 5 },
  { title: '贩毒团伙打击', description: '情报部门掌握一处中转毒品的窝点线索，需要组织精干力量实施抓捕。', caseType: 'drug' as const, difficulty: 70, requiredPolice: 30, rewardMerit: 25, securityChange: 15 },
  { title: '电信诈骗团伙侦破', description: '多名群众报案称遭受网络电信诈骗，受骗金额巨大，犯罪团伙藏匿于辖区。', caseType: 'fraud' as const, difficulty: 55, requiredPolice: 20, rewardMerit: 18, securityChange: 12 },
  { title: '寻衅滋事团伙处置', description: '辖区内一帮社会闲散人员多次寻衅滋事，严重影响社会秩序。', caseType: 'criminal' as const, difficulty: 35, requiredPolice: 12, rewardMerit: 10, securityChange: 7 },
];

export async function initPoliceCases(saveId: string, userId: string, gameDays: number) {
  const cases = CASE_TEMPLATES.slice(0, 4).map(c => ({
    save_id: saveId,
    user_id: userId,
    title: c.title,
    description: c.description,
    case_type: c.caseType,
    difficulty: c.difficulty,
    required_police: c.requiredPolice,
    reward_merit: c.rewardMerit,
    security_change: c.securityChange,
    status: 'pending',
    created_day: gameDays,
  }));
  await supabase.from('police_cases').insert(cases);
}

export async function getPoliceCases(saveId: string): Promise<PoliceCase[]> {
  const { data, error } = await supabase
    .from('police_cases')
    .select('*')
    .eq('save_id', saveId)
    .order('created_at', { ascending: false })
    .limit(10);

  if (error || !data) return [];
  return (data as Record<string, unknown>[]).map(rowToPoliceCase);
}

export async function solveCase(caseId: string, gameDays: number): Promise<boolean> {
  const { error } = await supabase
    .from('police_cases')
    .update({ status: 'solved', solved_day: gameDays })
    .eq('id', caseId);
  return !error;
}

export async function addNewCases(saveId: string, userId: string, gameDays: number): Promise<void> {
  const indices = Array.from({ length: CASE_TEMPLATES.length }, (_, i) => i)
    .sort(() => Math.random() - 0.5)
    .slice(0, 2);

  const cases = indices.map(i => ({
    save_id: saveId,
    user_id: userId,
    title: CASE_TEMPLATES[i].title,
    description: CASE_TEMPLATES[i].description,
    case_type: CASE_TEMPLATES[i].caseType,
    difficulty: CASE_TEMPLATES[i].difficulty,
    required_police: CASE_TEMPLATES[i].requiredPolice,
    reward_merit: CASE_TEMPLATES[i].rewardMerit,
    security_change: CASE_TEMPLATES[i].securityChange,
    status: 'pending',
    created_day: gameDays,
  }));
  await supabase.from('police_cases').insert(cases);
}

// ============ 事件记录 ============

export async function saveEventRecord(record: Omit<EventRecord, 'id' | 'createdAt'>): Promise<boolean> {
  const { error } = await supabase.from('event_records').insert({
    save_id: record.saveId,
    user_id: record.userId,
    event_type: record.eventType,
    title: record.title,
    description: record.description,
    choice_index: record.choiceIndex,
    choice_text: record.choiceText,
    merit_change: record.meritChange,
    moral_change: record.moralChange,
    gdp_change: record.gdpChange,
    livelihood_change: record.livelihoodChange,
    ecology_change: record.ecologyChange,
    business_change: record.businessChange,
    game_day: record.gameDay,
  });
  return !error;
}

// ============ 家庭成员操作 ============

function rowToFamilyMember(row: Record<string, unknown>): FamilyMember {
  return {
    id: row.id as string,
    saveId: row.save_id as string,
    userId: row.user_id as string,
    memberType: row.member_type as FamilyMember['memberType'],
    name: row.name as string,
    gender: (row.gender as string) ?? '男',
    birthDay: (row.birth_day as number) ?? 0,
    personality: (row.personality as string) ?? '温和',
    job: (row.job as string) ?? '教师',
    studyScore: (row.study_score as number) ?? 50,
    healthScore: (row.health_score as number) ?? 80,
    moralScore: (row.moral_score as number) ?? 80,
    isAdult: (row.is_adult as boolean) ?? false,
    adultPath: row.adult_path as string | null,
    careerBlocked: (row.career_blocked as boolean) ?? false,
    blockReason: (row.block_reason as string) ?? '',
    blockSeverity: (row.block_severity as string) ?? '',
    createdAt: row.created_at as string,
  };
}

/** 获取存档的子女数 */
export async function getChildCount(saveId: string): Promise<number> {
  const { count } = await supabase
    .from('family_members')
    .select('id', { count: 'exact', head: true })
    .eq('save_id', saveId)
    .eq('member_type', 'child');
  return count ?? 0;
}

export async function getFamilyMembers(saveId: string): Promise<FamilyMember[]> {
  const { data, error } = await supabase
    .from('family_members')
    .select('*')
    .eq('save_id', saveId)
    .order('created_at', { ascending: true });
  if (error || !data) return [];
  return (data as Record<string, unknown>[]).map(rowToFamilyMember);
}

const SPOUSE_PERSONALITIES = ['温和', '贤惠', '开朗', '理性', '独立', '体贴', '直爽', '睿智'];
const SPOUSE_JOBS_FEMALE = ['教师', '医生', '工程师', '公务员', '企业职员', '律师', '会计师', '护士'];
const SPOUSE_JOBS_MALE = ['教师', '医生', '工程师', '公务员', '企业管理', '律师', '警察', '教授'];

export async function addSpouse(saveId: string, userId: string, name: string, gender: string, gameDays: number): Promise<FamilyMember | null> {
  const personality = SPOUSE_PERSONALITIES[Math.floor(Math.random() * SPOUSE_PERSONALITIES.length)];
  const jobPool = gender === '女' ? SPOUSE_JOBS_FEMALE : SPOUSE_JOBS_MALE;
  const job = jobPool[Math.floor(Math.random() * jobPool.length)];
  const { data, error } = await supabase
    .from('family_members')
    .insert({
      save_id: saveId,
      user_id: userId,
      member_type: 'spouse',
      name,
      gender,
      birth_day: gameDays - 365 * (20 + Math.floor(Math.random() * 8)),
      personality,
      job,
      study_score: 50,
      health_score: 85,
      moral_score: 80,
      is_adult: true,
    })
    .select('*')
    .single();
  if (error || !data) return null;
  return rowToFamilyMember(data as Record<string, unknown>);
}

const CHILD_NAMES_MALE = ['子轩', '浩然', '明睿', '文博', '宇航', '泽宇', '志远', '嘉豪'];
const CHILD_NAMES_FEMALE = ['思雨', '雨欣', '晓彤', '梦琪', '若曦', '佳颖', '静怡', '雪儿'];

export async function addChild(saveId: string, userId: string, gender: string, gameDays: number, familyName: string): Promise<FamilyMember | null> {
  const namePool = gender === '女' ? CHILD_NAMES_FEMALE : CHILD_NAMES_MALE;
  const childName = familyName + namePool[Math.floor(Math.random() * namePool.length)];
  const { data, error } = await supabase
    .from('family_members')
    .insert({
      save_id: saveId,
      user_id: userId,
      member_type: 'child',
      name: childName,
      gender,
      birth_day: gameDays,
      personality: SPOUSE_PERSONALITIES[Math.floor(Math.random() * SPOUSE_PERSONALITIES.length)],
      job: '学生',
      study_score: 50,
      health_score: 90,
      moral_score: 80,
      is_adult: false,
    })
    .select('*')
    .single();
  if (error || !data) return null;
  return rowToFamilyMember(data as Record<string, unknown>);
}

export async function updateFamilyMember(memberId: string, updates: Partial<{
  studyScore: number;
  healthScore: number;
  moralScore: number;
  isAdult: boolean;
  adultPath: string;
  job: string;
  careerBlocked: boolean;
  blockReason: string;
  blockSeverity: string;
}>): Promise<boolean> {
  const dbUp: Record<string, unknown> = {};
  if (updates.studyScore !== undefined) dbUp.study_score = updates.studyScore;
  if (updates.healthScore !== undefined) dbUp.health_score = updates.healthScore;
  if (updates.moralScore !== undefined) dbUp.moral_score = updates.moralScore;
  if (updates.isAdult !== undefined) dbUp.is_adult = updates.isAdult;
  if (updates.adultPath !== undefined) dbUp.adult_path = updates.adultPath;
  if (updates.job !== undefined) dbUp.job = updates.job;
  if (updates.careerBlocked !== undefined) dbUp.career_blocked = updates.careerBlocked;
  if (updates.blockReason !== undefined) dbUp.block_reason = updates.blockReason;
  if (updates.blockSeverity !== undefined) dbUp.block_severity = updates.blockSeverity;
  const { error } = await supabase.from('family_members').update(dbUp).eq('id', memberId);
  return !error;
}

// ============ 建设项目 ============
function rowToBuildProject(row: Record<string, unknown>): import('@/types/game').BuildProject {
  return {
    id: row.id as string,
    saveId: row.save_id as string,
    userId: row.user_id as string,
    name: row.name as string,
    category: row.category as import('@/types/game').BuildCategory,
    costMerit: (row.cost_merit as number) ?? 0,
    costFund: (row.cost_fund as number) ?? 0,
    durationDays: row.duration_days as number,
    startDay: row.start_day as number,
    finishDay: row.finish_day as number,
    status: row.status as 'building' | 'done',
    effectType: row.effect_type as import('@/types/game').EffectType,
    effectValue: row.effect_value as number,
    meritReward: row.merit_reward as number,
    createdAt: row.created_at as string,
  };
}

export async function getBuildProjects(saveId: string): Promise<import('@/types/game').BuildProject[]> {
  const { data, error } = await supabase
    .from('construction_projects')
    .select('*')
    .eq('save_id', saveId)
    .order('created_at', { ascending: false });
  if (error || !data) return [];
  return (data as Record<string, unknown>[]).map(rowToBuildProject);
}

export async function startBuildProject(
  saveId: string, userId: string, gameDays: number,
  tpl: import('@/types/game').BuildProjectTemplate
): Promise<import('@/types/game').BuildProject | null> {
  const { data, error } = await supabase
    .from('construction_projects')
    .insert({
      save_id: saveId,
      user_id: userId,
      name: tpl.name,
      category: tpl.category,
      cost_merit: 0,
      cost_fund: tpl.costFund,
      duration_days: tpl.durationDays,
      start_day: gameDays,
      finish_day: gameDays + tpl.durationDays,
      status: 'building',
      effect_type: tpl.effectType,
      effect_value: tpl.effectValue,
      merit_reward: tpl.meritReward,
    })
    .select('*')
    .single();
  if (error || !data) return null;
  return rowToBuildProject(data as Record<string, unknown>);
}

export async function completeBuildProjects(saveId: string, gameDays: number): Promise<import('@/types/game').BuildProject[]> {
  // 查找到期项目
  const { data, error } = await supabase
    .from('construction_projects')
    .select('*')
    .eq('save_id', saveId)
    .eq('status', 'building')
    .lte('finish_day', gameDays);
  if (error || !data || data.length === 0) return [];
  const projects = (data as Record<string, unknown>[]).map(rowToBuildProject);
  const ids = projects.map(p => p.id);
  await supabase.from('construction_projects').update({ status: 'done' }).in('id', ids);
  return projects;
}

// ============ 管辖区域 ============
function rowToArea(row: Record<string, unknown>): import('@/types/game').GoverningArea {
  return {
    id: row.id as string,
    saveId: row.save_id as string,
    userId: row.user_id as string,
    areaName: row.area_name as string,
    areaType: row.area_type as 'town' | 'district',
    devIndex: row.dev_index as number,
    favorIndex: row.favor_index as number,
    lastVisitedDay: row.last_visited_day as number,
    lastInvestedDay: row.last_invested_day as number,
    createdAt: row.created_at as string,
    devHistory: (() => {
      try { return JSON.parse((row.dev_history as string) || '[]') as { m: number; v: number }[]; }
      catch { return []; }
    })(),
  };
}

export async function getGoverningAreas(saveId: string): Promise<import('@/types/game').GoverningArea[]> {
  const { data, error } = await supabase
    .from('governing_areas')
    .select('*')
    .eq('save_id', saveId)
    .order('created_at', { ascending: true });
  if (error || !data) return [];
  return (data as Record<string, unknown>[]).map(rowToArea);
}

export async function initGoverningAreas(
  saveId: string, userId: string,
  areas: { name: string; type: 'village' | 'town' | 'district' | 'city_level' }[]
): Promise<boolean> {
  // 先清空旧区域
  await supabase.from('governing_areas').delete().eq('save_id', saveId);
  if (areas.length === 0) return true;
  const rows = areas.map(a => ({
    save_id: saveId,
    user_id: userId,
    area_name: a.name,
    area_type: a.type,
    dev_index: 40 + Math.floor(Math.random() * 30),
    favor_index: 40 + Math.floor(Math.random() * 30),
    last_visited_day: 0,
    last_invested_day: 0,
  }));
  const { error } = await supabase.from('governing_areas').insert(rows);
  return !error;
}

export async function investArea(areaId: string, devDelta: number): Promise<boolean> {
  const { data } = await supabase.from('governing_areas').select('dev_index').eq('id', areaId).single();
  if (!data) return false;
  const newVal = Math.min(100, (data as Record<string, number>).dev_index + devDelta);
  const { error } = await supabase.from('governing_areas').update({ dev_index: newVal, last_invested_day: 0 }).eq('id', areaId);
  return !error;
}

export async function visitArea(areaId: string, visitDay: number, favorDelta: number): Promise<boolean> {
  const { data } = await supabase.from('governing_areas').select('favor_index').eq('id', areaId).single();
  if (!data) return false;
  const newFavor = Math.min(100, (data as Record<string, number>).favor_index + favorDelta);
  const { error } = await supabase.from('governing_areas').update({ favor_index: newFavor, last_visited_day: visitDay }).eq('id', areaId);
  return !error;
}

export async function updateAreaDevIndex(areaId: string, gameDays: number): Promise<void> {
  await supabase.from('governing_areas').update({ last_invested_day: gameDays }).eq('id', areaId);
}

// ============ 补充下属至职级上限 ============
export async function supplementSubordinates(
  saveId: string, userId: string, rankLevel: number, currentCount: number
): Promise<number> {
  const { SUBORDINATE_LIMIT } = await import('@/types/game');
  const limit = SUBORDINATE_LIMIT[rankLevel] ?? 5;
  const needed = limit - currentCount;
  if (needed <= 0) return 0;

  // 复用顶部扩充的名字池（与 initSubordinates 共享）
  const NAMES_MALE = SUBORDINATE_NAMES_MALE;
  const NAMES_FEMALE = SUBORDINATE_NAMES_FEMALE;
  const POSITIONS = ['副科长', '科员', '主任科员', '副主任', '主任', '办公室主任', '专员', '副处长', '处长'];

  // 拿库中已有名字，防止与已有下属重名
  const { data: existingRows } = await supabase
    .from('subordinates')
    .select('name')
    .eq('save_id', saveId);
  const _usedNames = new Set<string>((existingRows ?? []).map((r: Record<string, unknown>) => r.name as string));

  // 按玩家职级生成现实合理的下属初始职级：以 rankLevel-2 为基础，分布到 [rankLevel-3, rankLevel-1]
  // 例如玩家 rank6（县委书记）→ 下属主要在 3-5 级（正科～正处）
  const subLevelBase = Math.max(1, rankLevel - 2);
  const genSubLevel = () => {
    const r = Math.random();
    if (r < 0.5) return subLevelBase;                          // 50% 中间层
    if (r < 0.80) return Math.max(1, subLevelBase - 1);       // 30% 低一级
    return Math.min(12, subLevelBase + 1);                     // 20% 高一级
  };

  const rows = Array.from({ length: needed }, () => {
    const isMale = Math.random() > 0.45;
    const names = isMale ? NAMES_MALE : NAMES_FEMALE;
    let name = names[Math.floor(Math.random() * names.length)];
    for (let _r = 0; _r < 60 && _usedNames.has(name); _r++) {
      name = names[Math.floor(Math.random() * names.length)];
    }
    _usedNames.add(name);
    return {
      save_id: saveId,
      user_id: userId,
      name,
      position: POSITIONS[Math.floor(Math.random() * POSITIONS.length)],
      role: '普通干部',
      avatar_id: Math.floor(Math.random() * 6),
      gender: isMale ? '男' : '女',
      ability: 40 + Math.floor(Math.random() * 30),
      loyalty: 40 + Math.floor(Math.random() * 30),
      integrity: 50 + Math.floor(Math.random() * 30),
      experience: 10 + Math.floor(Math.random() * 30),
      sub_level: genSubLevel(),  // ← 按玩家职级生成现实职级
      is_appointed: false,
      appointed_role: null,
      appointed_dept: null,
      dept_position: 'head',
      transferred_city: null,
      last_assessed_day: 0,
    };
  });

  await supabase.from('subordinates').insert(rows);
  return needed;
}

// ============ 招募候选人 ============
function rowToRecruit(row: Record<string, unknown>): RecruitCandidate {
  return {
    id: row.id as string,
    saveId: row.save_id as string,
    userId: row.user_id as string,
    yearKey: row.year_key as number,
    name: row.name as string,
    gender: (row.gender as string) ?? '男',
    avatarId: (row.avatar_id as number) ?? 0,
    ability: row.ability as number,
    loyalty: row.loyalty as number,
    integrity: row.integrity as number,
    experience: row.experience as number,
    trait: (row.trait as string) ?? '',
    rankOrder: (row.rank_order as number) ?? null,
    status: (row.status as RecruitCandidate['status']) ?? 'pending',
    createdAt: row.created_at as string,
    // ── 个人档案 ──────────────────────────────────────────────────
    birthYear: (row.birth_year as number) ?? null,
    university: (row.university as string) ?? null,
    major: (row.major as string) ?? null,
    hometown: (row.hometown as string) ?? null,
    score: (row.score as number) ?? null,
  };
}

const RECRUIT_NAMES_MALE = ['刘海', '陈磊', '王建国', '赵兴', '孙鹏', '李博', '张浩', '周翔', '吴杰', '郑刚', '钱志远', '冯磊'];
const RECRUIT_NAMES_FEMALE = ['刘慧', '陈雪', '王晓燕', '赵婷', '孙丽', '李萍', '张婧', '周雅', '吴敏', '郑静'];

export async function getOrCreateRecruitCandidates(
  saveId: string, userId: string, yearKey: number
): Promise<RecruitCandidate[]> {
  // 查询当年候选人
  const { data: existing } = await supabase
    .from('recruit_candidates')
    .select('*')
    .eq('save_id', saveId)
    .eq('year_key', yearKey)
    .order('created_at', { ascending: true });
  if (existing && existing.length > 0) return (existing as Record<string, unknown>[]).map(rowToRecruit);

  // 生成10名候选人
  const rows = Array.from({ length: 10 }, () => {
    const isMale = Math.random() > 0.4;
    const names = isMale ? RECRUIT_NAMES_MALE : RECRUIT_NAMES_FEMALE;
    const name = names[Math.floor(Math.random() * names.length)];
    const trait = SUB_TRAITS[Math.floor(Math.random() * SUB_TRAITS.length)];
    return {
      save_id: saveId,
      user_id: userId,
      year_key: yearKey,
      name,
      gender: isMale ? '男' : '女',
      avatar_id: Math.floor(Math.random() * 8),
      ability: 45 + Math.floor(Math.random() * 40),
      loyalty: 50 + Math.floor(Math.random() * 35),
      integrity: 50 + Math.floor(Math.random() * 35),
      experience: 15 + Math.floor(Math.random() * 35),
      trait,
      rank_order: null,
      status: 'pending',
    };
  });
  const { data: created } = await supabase.from('recruit_candidates').insert(rows).select('*');
  if (!created) return [];
  return (created as Record<string, unknown>[]).map(rowToRecruit);
}

export async function selectRecruit(candidateId: string, rankOrder: number): Promise<boolean> {
  const { error } = await supabase
    .from('recruit_candidates')
    .update({ status: 'selected', rank_order: rankOrder })
    .eq('id', candidateId);
  return !error;
}

export async function dismissRecruit(candidateId: string): Promise<boolean> {
  const { error } = await supabase
    .from('recruit_candidates')
    .update({ status: 'dismissed', rank_order: null })
    .eq('id', candidateId);
  return !error;
}

// 确认招募：将选中的候选人加入下属列表，最多3名，自动分配到编制空缺部门
export async function confirmRecruits(
  saveId: string, userId: string, yearKey: number
): Promise<{ count: number; assignments: { name: string; dept: string; position: string }[] }> {
  const { data } = await supabase
    .from('recruit_candidates')
    .select('*')
    .eq('save_id', saveId)
    .eq('year_key', yearKey)
    .eq('status', 'selected')
    .order('rank_order', { ascending: true })
    .limit(3);
  if (!data || data.length === 0) return { count: 0, assignments: [] };

  const rows = (data as Record<string, unknown>[]).map(r => ({
    save_id: saveId,
    user_id: userId,
    name: r.name,
    position: '待分配',
    role: '新录用干部',
    avatar_id: r.avatar_id,
    gender: r.gender,
    ability: r.ability,
    loyalty: r.loyalty,
    integrity: r.integrity,
    experience: r.experience,
    sub_level: 1, // 新录用公务员从科员级(1)起步
    is_appointed: false,
    appointed_role: null,
    appointed_dept: null,
    dept_position: 'deputy',
    transferred_city: null,
    last_assessed_day: 0,
  }));

  const { data: inserted } = await supabase.from('subordinates').insert(rows).select('id');
  const newIds = (inserted ?? []).map((r: Record<string, unknown>) => r.id as string);

  // 自动分配到编制最空缺的部门
  const assignments = await autoAssignNewRecruits(saveId, newIds);

  // 标记本批次已完成招募
  await supabase
    .from('recruit_candidates')
    .update({ status: 'dismissed' })
    .eq('save_id', saveId)
    .eq('year_key', yearKey);
  // 更新 player_saves.last_recruit_quarter
  await supabase
    .from('player_saves')
    .update({ last_recruit_quarter: yearKey })
    .eq('id', saveId);
  return { count: rows.length, assignments };
}

// ============ 下属拜访 ============
// 随机触发：选一个高忠诚度下属拜访
export async function triggerSubVisit(saveId: string): Promise<{ subId: string; subName: string } | null> {
  const { data } = await supabase
    .from('subordinates')
    .select('id, name, loyalty')
    .eq('save_id', saveId)
    .gte('loyalty', 60)
    .order('loyalty', { ascending: false })
    .limit(10);
  if (!data || data.length === 0) return null;
  const pool = data as { id: string; name: string; loyalty: number }[];
  const picked = pool[Math.floor(Math.random() * Math.min(pool.length, 5))];
  return { subId: picked.id, subName: picked.name };
}

// 响应拜访：增加忠诚度+好感度
export async function resolveSubVisit(
  saveId: string, subId: string, accept: boolean
): Promise<void> {
  if (accept) {
    const { data } = await supabase.from('subordinates').select('loyalty').eq('id', subId).maybeSingle();
    if (data) {
      const row = data as { loyalty: number };
      await supabase.from('subordinates').update({
        loyalty: Math.min(100, row.loyalty + 8),
      }).eq('id', subId);
    }
  }
  await supabase.from('player_saves').update({
    sub_visit_pending: false,
    sub_visit_sub_id: null,
    sub_visit_sub_name: null,
  }).eq('id', saveId);
}

// ============ 年度考核（按能力高低分级不合格率）============
// 能力<70 → 20%不合格；能力>=70 → 5%不合格；调任下属不参与
export async function runAnnualSubAssessment(saveId: string, currentDay: number): Promise<{
  failed: string[]; passed: string[];
}> {
  const { data } = await supabase
    .from('subordinates')
    .select('id, name, ability, integrity, experience')
    .eq('save_id', saveId)
    .is('transferred_city', null);
  if (!data) return { failed: [], passed: [] };

  const rows = data as { id: string; name: string; ability: number; integrity: number; experience: number }[];
  const failed: string[] = [];
  const passed: string[] = [];

  for (const sub of rows) {
    // 不合格概率：能力低70% → 20%；能力高 → 5%
    const failRate = sub.ability < 70 ? 0.20 : 0.05;
    const isFail = Math.random() < failRate;
    if (isFail) {
      failed.push(sub.name);
      // 不合格：能力-5，经验-3
      await supabase.from('subordinates').update({
        ability: Math.max(0, sub.ability - 5),
        experience: Math.max(0, sub.experience - 3),
        last_assessed_day: currentDay,
      }).eq('id', sub.id);
    } else {
      passed.push(sub.name);
      // 合格：经验+3
      await supabase.from('subordinates').update({
        experience: Math.min(100, sub.experience + 3),
        last_assessed_day: currentDay,
      }).eq('id', sub.id);
    }
  }
  return { failed, passed };
}

// ============ 删除存档 ============
export async function deleteSave(saveId: string): Promise<boolean> {
  // 按依赖顺序删除关联数据
  await supabase.from('recruit_candidates').delete().eq('save_id', saveId);
  await supabase.from('welfare_actions').delete().eq('save_id', saveId);
  await supabase.from('city_finance').delete().eq('save_id', saveId);
  await supabase.from('secretary').delete().eq('save_id', saveId);
  await supabase.from('monthly_meetings').delete().eq('save_id', saveId);
  await supabase.from('governing_areas').delete().eq('save_id', saveId);
  await supabase.from('build_projects').delete().eq('save_id', saveId);
  await supabase.from('family_members').delete().eq('save_id', saveId);
  await supabase.from('police_cases').delete().eq('save_id', saveId);
  await supabase.from('events').delete().eq('save_id', saveId);
  await supabase.from('boss_tasks').delete().eq('save_id', saveId);
  await supabase.from('subordinates').delete().eq('save_id', saveId);
  const { error } = await supabase.from('player_saves').delete().eq('id', saveId);
  return !error;
}
function rowToMeeting(row: Record<string, unknown>): MonthlyMeeting {
  return {
    id: row.id as string,
    saveId: row.save_id as string,
    userId: row.user_id as string,
    monthKey: row.month_key as string,
    heldDay: row.held_day as number,
    tasks: (row.tasks as MeetingTask[]) ?? [],
    createdAt: row.created_at as string,
  };
}

export async function getMeetingByMonth(saveId: string, monthKey: string): Promise<MonthlyMeeting | null> {
  const { data } = await supabase
    .from('monthly_meetings')
    .select('*')
    .eq('save_id', saveId)
    .eq('month_key', monthKey)
    .maybeSingle();
  if (!data) return null;
  return rowToMeeting(data as Record<string, unknown>);
}

export async function createMeeting(saveId: string, userId: string, monthKey: string, heldDay: number, tasks: MeetingTask[]): Promise<MonthlyMeeting | null> {
  const { data, error } = await supabase
    .from('monthly_meetings')
    .insert({ save_id: saveId, user_id: userId, month_key: monthKey, held_day: heldDay, tasks })
    .select('*')
    .single();
  if (error || !data) return null;
  return rowToMeeting(data as Record<string, unknown>);
}

export async function getRecentMeetings(saveId: string, limit = 6): Promise<MonthlyMeeting[]> {
  const { data } = await supabase
    .from('monthly_meetings')
    .select('*')
    .eq('save_id', saveId)
    .order('held_day', { ascending: false })
    .limit(limit);
  if (!data) return [];
  return (data as Record<string, unknown>[]).map(rowToMeeting);
}

// 检查会议KPI任务完成情况（推进时间时调用）
export async function resolveMeetingTasks(saveId: string, gameDays: number): Promise<{ meritBonus: number; failedSubIds: string[] }> {
  const { data } = await supabase
    .from('monthly_meetings')
    .select('*')
    .eq('save_id', saveId);
  if (!data || data.length === 0) return { meritBonus: 0, failedSubIds: [] };

  let meritBonus = 0;
  const failedSubIds: string[] = [];

  for (const row of data as Record<string, unknown>[]) {
    const meeting = rowToMeeting(row);
    let changed = false;
    const updatedTasks = meeting.tasks.map(t => {
      if (t.status !== 'pending') return t;
      if (gameDays >= t.deadlineDay) {
        // 简单模拟：60%概率完成
        const done = Math.random() < 0.6;
        changed = true;
        if (done) {
          meritBonus += t.targetValue * 2;
          return { ...t, status: 'done' as const, completedDay: gameDays };
        } else {
          failedSubIds.push(t.subordinateId);
          return { ...t, status: 'failed' as const, completedDay: null };
        }
      }
      return t;
    });
    if (changed) {
      await supabase.from('monthly_meetings').update({ tasks: updatedTasks }).eq('id', meeting.id);
    }
  }
  return { meritBonus, failedSubIds };
}

// ============ 秘书 ============
function rowToSecretary(row: Record<string, unknown>): Secretary {
  return {
    id: row.id as string,
    saveId: row.save_id as string,
    userId: row.user_id as string,
    name: row.name as string,
    avatarId: (row.avatar_id as number) ?? 1,
    ability: (row.ability as number) ?? 60,
    lastDocworkDay: (row.last_docwork_day as number) ?? 0,
    dailySchedule: row.daily_schedule as string | null,
    createdAt: row.created_at as string,
    subId: (row.sub_id as string) ?? null,
    isAppointed: (row.is_appointed as boolean) ?? false,
  };
}

export async function getOrCreateSecretary(saveId: string, userId: string): Promise<Secretary | null> {
  const { data: existing } = await supabase
    .from('secretary')
    .select('*')
    .eq('save_id', saveId)
    .maybeSingle();
  if (existing) {
    const sec = rowToSecretary(existing as Record<string, unknown>);
    // 兼容旧存档：迁移前自动生成的 NPC 秘书（ability>0 且非待任命占位）自动升级为已任命
    if (!sec.isAppointed && sec.ability > 0 && sec.name !== '（待任命）') {
      await supabase.from('secretary').update({ is_appointed: true }).eq('id', sec.id);
      sec.isAppointed = true;
    }
    return sec;
  }

  // 未有记录时创建待任命占位
  const { data, error } = await supabase
    .from('secretary')
    .insert({ save_id: saveId, user_id: userId, name: '（待任命）', avatar_id: 1, ability: 0, is_appointed: false })
    .select('*')
    .single();
  if (error || !data) return null;
  return rowToSecretary(data as Record<string, unknown>);
}

/** 任命某下属为专属秘书 */
export async function appointSubAsSecretary(
  saveId: string, sub: { id: string; name: string; avatarId: number; ability: number }
): Promise<boolean> {
  // 更新secretary行，绑定该下属
  const { error } = await supabase
    .from('secretary')
    .update({
      sub_id: sub.id,
      name: sub.name,
      avatar_id: sub.avatarId,
      ability: Math.min(sub.ability, 100),
      is_appointed: true,
    })
    .eq('save_id', saveId);
  if (error) return false;
  // 同步更新下属岗位标注
  await supabase
    .from('subordinates')
    .update({ appointed_role: '专属秘书', is_appointed: true })
    .eq('id', sub.id);
  return true;
}

/** 解除秘书任命（还原为待任命状态）*/
export async function recallSecretary(saveId: string, subId: string): Promise<boolean> {
  const { error } = await supabase
    .from('secretary')
    .update({ sub_id: null, name: '（待任命）', avatar_id: 1, ability: 0, is_appointed: false })
    .eq('save_id', saveId);
  if (error) return false;
  // 解除下属的秘书岗位标注
  await supabase
    .from('subordinates')
    .update({ appointed_role: null, is_appointed: false })
    .eq('id', subId);
  return true;
}

export async function doDocwork(secretaryId: string, gameDays: number): Promise<{ meritGain: number } | null> {
  const { data } = await supabase.from('secretary').select('ability,last_docwork_day').eq('id', secretaryId).maybeSingle();
  if (!data) return null;
  const row = data as Record<string, unknown>;
  const ability = (row.ability as number) ?? 60;
  if (ability < 20) return null; // 能力不足
  const gain = 5 + Math.floor(ability / 20);
  const newAbility = Math.max(10, ability - 10); // 整理公文消耗能力值
  await supabase.from('secretary').update({ ability: newAbility, last_docwork_day: gameDays }).eq('id', secretaryId);
  return { meritGain: gain };
}

export async function updateSecretarySchedule(secretaryId: string, schedule: string): Promise<boolean> {
  const { error } = await supabase.from('secretary').update({ daily_schedule: schedule }).eq('id', secretaryId);
  return !error;
}

/** 更新秘书能力值（供巡查督导等消耗/增益场景使用） */
export async function updateSecretaryAbility(secretaryId: string, newAbility: number): Promise<boolean> {
  const { error } = await supabase.from('secretary').update({ ability: Math.max(0, newAbility) }).eq('id', secretaryId);
  return !error;
}

export async function restoreSecretaryAbility(secretaryId: string): Promise<void> {
  const { data } = await supabase.from('secretary').select('ability').eq('id', secretaryId).maybeSingle();
  if (!data) return;
  const ability = (data as Record<string, unknown>).ability as number;
  if (ability < 100) {
    await supabase.from('secretary').update({ ability: Math.min(100, ability + 5) }).eq('id', secretaryId);
  }
}

// ============ 城市金融 ============
function rowToFinance(row: Record<string, unknown>): CityFinance {
  return {
    id: row.id as string,
    saveId: row.save_id as string,
    userId: row.user_id as string,
    fundBalance: (row.fund_balance as number) ?? 0,
    debtTotal: (row.debt_total as number) ?? 0,
    loans: (row.loans as LoanRecord[]) ?? [],
    investments: (row.investments as InvestmentRecord[]) ?? [],
    investGroupEstDay: row.invest_group_est_day as number | null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export async function getOrCreateFinance(saveId: string, userId: string): Promise<CityFinance | null> {
  const { data: existing } = await supabase
    .from('city_finance')
    .select('*')
    .eq('save_id', saveId)
    .maybeSingle();
  if (existing) return rowToFinance(existing as Record<string, unknown>);

  const { data, error } = await supabase
    .from('city_finance')
    .insert({ save_id: saveId, user_id: userId, fund_balance: 0, debt_total: 0, loans: [], investments: [] })
    .select('*')
    .single();
  if (error || !data) return null;
  return rowToFinance(data as Record<string, unknown>);
}

/** 直接扣减城市财政余额（万元单位，delta 为负数表示扣减）
 *  player_saves.fund_balance 是月度结算的唯一权威来源，此处直接更新该表。
 */
export async function updateCityFinanceFund(saveId: string, deltaWan: number): Promise<boolean> {
  const { data: row } = await supabase.from('player_saves').select('fund_balance').eq('id', saveId).maybeSingle();
  if (!row) return false;
  const current = (row.fund_balance as number) ?? 0;
  const next = Math.max(0, current + deltaWan);
  const { error } = await supabase.from('player_saves')
    .update({ fund_balance: next, updated_at: new Date().toISOString() })
    .eq('id', saveId);
  return !error;
}

export async function applyLoan(saveId: string, loan: LoanRecord): Promise<boolean> {
  const finance = await getOrCreateFinance(saveId, '');
  if (!finance) return false;
  const { data: row } = await supabase.from('city_finance').select('*').eq('save_id', saveId).maybeSingle();
  if (!row) return false;
  const current = rowToFinance(row as Record<string, unknown>);
  // ★ 贷款限制：同一档贷款只有在「已还清 paid 且 到期日已过」时才可重借
  const sameNameActive = current.loans.find(l => l.amount === loan.amount && l.status === 'active');
  if (sameNameActive) return false;
  const newLoans = [...current.loans, loan];
  const newBalance = current.fundBalance + loan.amount;
  const newDebt = current.debtTotal + loan.amount;
  const { error } = await supabase.from('city_finance').update({ loans: newLoans, fund_balance: newBalance, debt_total: newDebt, updated_at: new Date().toISOString() }).eq('save_id', saveId);
  return !error;
}

/**
 * 提前全额偿还指定贷款（一次性还清剩余本金+当期利息）
 * 提前还款金额 = 贷款总额（简化：用总本金，不计剩余月供分期）
 */
export async function repayLoanEarly(saveId: string, loanId: string): Promise<{ ok: boolean; cost: number }> {
  const { data: row } = await supabase.from('city_finance').select('*').eq('save_id', saveId).maybeSingle();
  if (!row) return { ok: false, cost: 0 };
  const finance = rowToFinance(row as Record<string, unknown>);
  const loan = finance.loans.find(l => l.id === loanId && l.status === 'active');
  if (!loan) return { ok: false, cost: 0 };
  // 提前还款金额 = 贷款本金（已按月偿还的月供部分已扣减债务，此处简化为全额本金）
  const cost = loan.amount;
  if (finance.fundBalance < cost) return { ok: false, cost };
  const updatedLoans = finance.loans.map(l =>
    l.id === loanId ? { ...l, status: 'paid' as const } : l,
  );
  const newBalance = finance.fundBalance - cost;
  const newDebt = Math.max(0, finance.debtTotal - cost);
  const { error } = await supabase.from('city_finance').update({
    loans: updatedLoans, fund_balance: newBalance, debt_total: newDebt,
    updated_at: new Date().toISOString(),
  }).eq('save_id', saveId);
  if (error) return { ok: false, cost };
  await supabase.from('player_saves').update({ fund_balance: newBalance }).eq('id', saveId);
  return { ok: true, cost };
}

export async function startInvestment(saveId: string, inv: InvestmentRecord): Promise<boolean> {
  const { data: row } = await supabase.from('city_finance').select('*').eq('save_id', saveId).maybeSingle();
  if (!row) return false;
  const current = rowToFinance(row as Record<string, unknown>);

  // ★ 修复：使用 player_saves.fund_balance 作为余额权威来源
  //   city_finance.fund_balance 初始为0且未与玩家账户同步，直接用其校验会导致省级以上玩家无法投资下级项目
  const { data: saveRow } = await supabase.from('player_saves').select('fund_balance').eq('id', saveId).maybeSingle();
  const playerBalance = saveRow ? ((saveRow.fund_balance as number) ?? 0) : 0;
  if (playerBalance < inv.amount) return false;

  const newInvs = [...current.investments, inv];
  const newBalance = Math.max(0, playerBalance - inv.amount);

  // 同步更新 city_finance（投资列表 + 同步余额）
  const { error } = await supabase.from('city_finance').update({
    investments: newInvs,
    fund_balance: newBalance,
    updated_at: new Date().toISOString(),
  }).eq('save_id', saveId);
  if (error) return false;
  // ★ 同步扣减 player_saves.fund_balance，保证 UI 刷新后余额正确
  await supabase.from('player_saves').update({ fund_balance: newBalance }).eq('id', saveId);
  return true;
}

export async function establishInvestGroup(saveId: string, gameDays: number): Promise<boolean> {
  const { error } = await supabase.from('city_finance').update({ invest_group_est_day: gameDays, updated_at: new Date().toISOString() }).eq('save_id', saveId);
  return !error;
}

// 每月处理贷款还款和到期投资（时间推进时调用）
export async function processFinanceMonth(saveId: string, userId: string, gameDays: number): Promise<{ meritBonus: number; gdpBonus: number; bizBonus: number; liveBonus: number; ecoBonus: number; penaltyMerit: number }> {
  const result = { meritBonus: 0, gdpBonus: 0, bizBonus: 0, liveBonus: 0, ecoBonus: 0, penaltyMerit: 0 };
  const { data: row } = await supabase.from('city_finance').select('*').eq('save_id', saveId).maybeSingle();
  if (!row) return result;
  const finance = rowToFinance(row as Record<string, unknown>);

  let newBalance = finance.fundBalance;
  let newDebt = finance.debtTotal;
  const updatedLoans = finance.loans.map(l => {
    if (l.status !== 'active') return l;
    if (gameDays >= l.dueDay) {
      if (newBalance >= l.monthlyPay) {
        newBalance -= l.monthlyPay;
        newDebt = Math.max(0, newDebt - l.monthlyPay);
        return { ...l, status: 'paid' as const };
      } else {
        result.penaltyMerit += 20; // 逾期罚款
        return l;
      }
    }
    // 正常月供
    if (newBalance >= l.monthlyPay) {
      newBalance -= l.monthlyPay;
      newDebt = Math.max(0, newDebt - l.monthlyPay);
    } else {
      result.penaltyMerit += 5;
    }
    return l;
  });

  const updatedInvs = finance.investments.map(inv => {
    if (inv.status !== 'running') return inv;
    if (gameDays >= inv.endDay) {
      result.meritBonus += 30;
      if (inv.effectType === 'gdp') result.gdpBonus += inv.effectValue;
      if (inv.effectType === 'business') result.bizBonus += inv.effectValue;
      if (inv.effectType === 'livelihood') result.liveBonus += inv.effectValue;
      if (inv.effectType === 'ecology') result.ecoBonus += inv.effectValue;
      return { ...inv, status: 'done' as const };
    }
    return inv;
  });

  await supabase.from('city_finance').update({
    fund_balance: newBalance, debt_total: newDebt,
    loans: updatedLoans, investments: updatedInvs,
    updated_at: new Date().toISOString(),
  }).eq('save_id', saveId);
  // 同步player_saves资金余额
  await supabase.from('player_saves').update({ fund_balance: newBalance }).eq('id', saveId);
  return result;
}

// ============ 民生操作 ============
export async function doWelfareAction(
  saveId: string, userId: string,
  actionType: 'welfare' | 'education' | 'healthcare' | 'housing',
  costMerit: number, effectValue: number, gameDays: number,
  costFund = 0
): Promise<boolean> {
  const { error } = await supabase.from('welfare_actions').insert({
    save_id: saveId, user_id: userId,
    action_type: actionType, cost_merit: costMerit,
    effect_value: effectValue, done_day: gameDays,
    cost_fund: costFund,
  });
  return !error;
}

export interface WelfareRecord {
  id: string;
  actionType: string;
  costMerit: number;
  costFund: number;
  effectValue: number;
  doneDay: number;
}

export async function getWelfareHistory(saveId: string, limit = 5): Promise<WelfareRecord[]> {
  const { data, error } = await supabase
    .from('welfare_actions')
    .select('*')
    .eq('save_id', saveId)
    .order('done_day', { ascending: false })
    .limit(limit);
  if (error || !data) return [];
  return (data as Record<string, unknown>[]).map(r => ({
    id: r.id as string,
    actionType: r.action_type as string,
    costMerit: r.cost_merit as number,
    costFund: (r.cost_fund as number) ?? 0,
    effectValue: r.effect_value as number,
    doneDay: r.done_day as number,
  }));
}

// ============ 年度招募（每年2次：春招约第90天/国考批次 & 秋招约第270天/省考批次）============
//
// 现实依据：
//   • 国家公务员考试（国考）：每年10-11月报名笔试，次年春季录用 → 游戏映射为第1批（前半年）
//   • 省级公务员考试（省考）：每年3-4月笔试，5-6月面试录用 → 游戏映射为第2批（后半年）
//   • 主管机构：人力资源和社会保障局（人社局）组织笔试，
//               县/市/省执政委组织部负责政治考察与录用审批
//   • rank 1-3（乡镇/科员级）：参加省考/国考，录用科员~副科级人员
//   • rank 4-6（县级）：组织部统一分配科员~正科级人员（不再手动选择，改为自动录用并分配）
//   • rank 7+：由上级组织部统筹分配，无需手动招募
//
// yearKey 编码：year * 10 + round（round=0春招, round=1秋招）

/** 计算当前招募批次 key（year * 10 + round），每年2次：前半年0、后半年1 */
export function getCurrentRecruitKey(gameDays: number): number {
  const year = Math.floor(gameDays / 365);
  const dayInYear = gameDays % 365;
  const round = dayInYear < 182 ? 0 : 1; // 0=春招(国考), 1=秋招(省考)
  return year * 10 + round;
}

/** 批次描述 */
export function getRecruitRoundLabel(recruitKey: number): string {
  const round = recruitKey % 10;
  const year = Math.floor(recruitKey / 10);
  return round === 0
    ? `第${year + 1}年 · 春季招录（参照国家公务员考试）`
    : `第${year + 1}年 · 秋季招录（参照省级公务员考试）`;
}

/** 候选人主管机构（按职级） */
export function getRecruitOrg(rankLevel: number): string {
  if (rankLevel <= 3) return '县委组织部 & 人社局';
  if (rankLevel <= 6) return '市委组织部';
  if (rankLevel <= 9) return '省执政委组织部';
  return '党政人事院';
}

export async function getOrCreateQuarterCandidates(
  saveId: string, userId: string, recruitKey: number, rankLevel = 3
): Promise<RecruitCandidate[]> {
  const { data: existing } = await supabase
    .from('recruit_candidates')
    .select('*')
    .eq('save_id', saveId)
    .eq('year_key', recruitKey)
    .order('created_at', { ascending: true });
  if (existing && existing.length > 0) return (existing as Record<string, unknown>[]).map(rowToRecruit);

  // 候选人数：国考批次12人，省考批次8人
  const isNationalExam = recruitKey % 10 === 0;
  const count = isNationalExam ? 12 : 8;
  // 游戏年份（用于推算出生年份）
  const gameYear = Math.floor(recruitKey / 10) + 2000;

  const EXTRA_NAMES_MALE = ['徐明', '许浩', '袁磊', '戴刚', '蒋辉', '沈俊', '程远', '卢凯', '潘锋'];
  const EXTRA_NAMES_FEMALE = ['许晴', '袁雪', '戴婷', '蒋娜', '沈琪'];
  const allMale = [...RECRUIT_NAMES_MALE, ...EXTRA_NAMES_MALE];
  const allFemale = [...RECRUIT_NAMES_FEMALE, ...EXTRA_NAMES_FEMALE];

  // 院校分层：985/211/普本/大专
  const UNIV_985 = ['北京大学', '清华大学', '复旦大学', '中国人民大学', '武汉大学', '浙江大学', '南京大学', '中山大学', '吉林大学', '四川大学', '华中科技大学', '中南大学'];
  const UNIV_211 = ['郑州大学', '河北大学', '湖南大学', '西南大学', '华南理工大学', '苏州大学', '扬州大学', '安徽大学', '广西大学', '云南大学', '贵州大学', '兰州大学'];
  const UNIV_NORMAL = ['湖南师范大学', '河南工业大学', '广西师范大学', '安徽师范大学', '江西师范大学', '辽宁大学', '西北师范大学', '内蒙古大学', '山西大学', '青海大学'];
  const UNIV_COLLEGE = ['某某职业技术学院', '某省行政管理学院', '某市干部培训学校'];

  // 专业池（公务员常见）
  const MAJORS = ['行政管理', '公共管理', '法学', '经济学', '财政学', '会计学', '金融学', '计算机科学与技术', '土木工程', '农学', '中文（汉语言文学）', '历史学', '社会学'];

  // 籍贯省份
  const HOMETOWNS = ['楚南省', '楚北省', '蜀州省', '粤海省', '瓯越省', '汉东省', '中原省', '齐鲁省', '皖淮省', '秦陕省', '洪都省', '渝江市', '辽东省', '冀州省', '闽南省', '南桂壮族自治区', '滇南省', '黔贵省'];

  // 教育背景配置
  const EDU_POOL: { label: string; abilityBonus: number; loyaltyBonus: number; univPool: string[]; weight: number }[] = [
    { label: '博士研究生', abilityBonus: 18, loyaltyBonus: 2, univPool: UNIV_985, weight: 5 },
    { label: '硕士研究生', abilityBonus: 10, loyaltyBonus: 3, univPool: [...UNIV_985, ...UNIV_211], weight: 25 },
    { label: '本科（985/211）', abilityBonus: 5, loyaltyBonus: 2, univPool: [...UNIV_985, ...UNIV_211], weight: 30 },
    { label: '本科', abilityBonus: 0, loyaltyBonus: 0, univPool: UNIV_NORMAL, weight: 30 },
    { label: '大专', abilityBonus: -5, loyaltyBonus: 5, univPool: UNIV_COLLEGE, weight: 10 },
  ];

  function pickEdu() {
    const total = EDU_POOL.reduce((s, e) => s + e.weight, 0);
    let r = Math.random() * total;
    for (const e of EDU_POOL) { r -= e.weight; if (r <= 0) return e; }
    return EDU_POOL[2];
  }

  const rows = Array.from({ length: count }, () => {
    const isMale = Math.random() > 0.4;
    const names = isMale ? allMale : allFemale;
    const name = names[Math.floor(Math.random() * names.length)];
    const trait = SUB_TRAITS[Math.floor(Math.random() * SUB_TRAITS.length)];
    const edu = pickEdu();
    const univ = edu.univPool[Math.floor(Math.random() * edu.univPool.length)];
    const major = MAJORS[Math.floor(Math.random() * MAJORS.length)];
    const hometown = HOMETOWNS[Math.floor(Math.random() * HOMETOWNS.length)];
    // 入职年龄22-28岁（博士最大到32），出生年份由此推算
    const entryAge = edu.label === '博士研究生' ? 27 + Math.floor(Math.random() * 5)
      : edu.label === '硕士研究生' ? 24 + Math.floor(Math.random() * 4)
      : 22 + Math.floor(Math.random() * 4);
    const birthYear = gameYear - entryAge;

    const baseAbility = rankLevel <= 3
      ? 42 + Math.floor(Math.random() * 35)
      : 50 + Math.floor(Math.random() * 35);
    const ability = Math.min(99, baseAbility + edu.abilityBonus);
    const loyalty = Math.min(99, 45 + Math.floor(Math.random() * 40) + edu.loyaltyBonus);
    const integrity = 50 + Math.floor(Math.random() * 38);
    const experience = rankLevel <= 3 ? 5 + Math.floor(Math.random() * 20) : 15 + Math.floor(Math.random() * 30);
    // 综合评分：能力60% + 廉洁25% + 忠诚15%
    const score = Math.round(ability * 0.6 + integrity * 0.25 + loyalty * 0.15);

    return {
      save_id: saveId,
      user_id: userId,
      year_key: recruitKey,
      name,
      gender: isMale ? '男' : '女',
      avatar_id: Math.floor(Math.random() * 8),
      ability,
      loyalty,
      integrity,
      experience,
      trait,
      rank_order: null,
      status: 'pending',
      birth_year: birthYear,
      university: univ,
      major,
      hometown,
      score,
    };
  });

  const { data: created } = await supabase.from('recruit_candidates').insert(rows).select('*');
  if (!created) return [];
  return (created as Record<string, unknown>[]).map(rowToRecruit);
}

/**
 * 系统自动招募：按综合评分选出前N名直接录用并分配部门。
 * 调用后无需玩家手动确认，直接完成本批次招募。
 */
export async function triggerAutoRecruit(
  saveId: string, userId: string, recruitKey: number, rankLevel: number
): Promise<{ count: number; assignments: { name: string; dept: string; position: string }[]; recruited: RecruitCandidate[]; recruitType: 'national' | 'provincial' }> {
  const isNationalExam = recruitKey % 10 === 0; // true=国考(春季), false=省考(秋季)

  // 1. 生成候选人（如果已存在则直接取）
  const allCandidates = await getOrCreateQuarterCandidates(saveId, userId, recruitKey, rankLevel);

  // 2. 按综合评分排序
  const sorted = [...allCandidates].sort((a, b) => (b.score ?? 0) - (a.score ?? 0));

  // 3. 录取名额差异化：
  //    国考（精英通道）：1-2名，竞争激烈
  //    省考（编制补充）：按空缺填满，最多6名
  let recruitCount: number;
  if (isNationalExam) {
    // 国考：高职级多一名（因为选调生项目更强），但总体名额少
    recruitCount = rankLevel <= 3 ? 1 : 2;
  } else {
    // 省考：查现有编制空缺，按空缺数录用（至少2名，最多6名）
    const { data: currentStaff } = await supabase
      .from('subordinates')
      .select('id')
      .eq('save_id', saveId)
      .eq('is_appointed', true)
      .is('transferred_city', null);
    const currentCount = (currentStaff ?? []).length;
    const quotaBase = rankLevel <= 3 ? 8 : rankLevel <= 6 ? 20 : rankLevel <= 9 ? 50 : 120;
    const vacancy = Math.max(0, quotaBase - currentCount);
    recruitCount = Math.max(2, Math.min(6, vacancy));
  }

  const toRecruit = sorted.slice(0, recruitCount);

  if (toRecruit.length === 0) return { count: 0, assignments: [], recruited: [], recruitType: isNationalExam ? 'national' : 'provincial' };

  // 3. 标记录取状态（selected），其余 dismissed
  for (let i = 0; i < toRecruit.length; i++) {
    await supabase.from('recruit_candidates').update({ status: 'selected', rank_order: i + 1 }).eq('id', toRecruit[i].id);
  }
  await supabase.from('recruit_candidates')
    .update({ status: 'dismissed' })
    .eq('save_id', saveId).eq('year_key', recruitKey).eq('status', 'pending');

  // 4. 将录取人员插入下属表（含完整档案）
  //    国考前1名（或唯一录用者）标记为选调生角色
  const rows = toRecruit.map((r, idx) => {
    const isZhuandiaosheng = isNationalExam && idx === 0 && (r.score ?? 0) >= 80;
    return {
      save_id: saveId,
      user_id: userId,
      name: r.name,
      position: isZhuandiaosheng ? '选调生（重要岗位预备）' : '待分配',
      role: isZhuandiaosheng ? '中央选调生' : '新录用干部',
      avatar_id: r.avatarId,
      gender: r.gender,
      ability: r.ability,
      loyalty: r.loyalty,
      integrity: r.integrity,
      experience: r.experience,
      sub_level: isZhuandiaosheng ? 2 : 1, // 选调生直接定副科级起步
      is_appointed: false,
      appointed_role: null,
      appointed_dept: null,
      dept_position: 'deputy',
      transferred_city: null,
      last_assessed_day: 0,
      birth_year: r.birthYear,
      university: r.university,
      major: r.major,
      hometown: r.hometown,
    };
  });
  const { data: inserted } = await supabase.from('subordinates').insert(rows).select('id');
  const newIds = (inserted ?? []).map((r: Record<string, unknown>) => r.id as string);

  // 5. 自动分配部门
  //    国考：选调生优先分配到重要岗位（ndrc/finance/organization）
  //    省考：按编制最空缺分配
  const assignments = await autoAssignNewRecruits(saveId, newIds, isNationalExam);

  // 6. 更新 last_recruit_quarter，完成本批次
  await supabase.from('player_saves').update({ last_recruit_quarter: recruitKey }).eq('id', saveId);

  return { count: toRecruit.length, assignments, recruited: toRecruit, recruitType: isNationalExam ? 'national' : 'provincial' };
}

/** 招募完成后自动将新录用干部分配到编制最空缺的部门
 *  isNationalExam=true 时：前1名（选调生）优先分配到重要岗位
 */
export async function autoAssignNewRecruits(
  saveId: string,
  newSubIds: string[],
  isNationalExam = false,
): Promise<{ name: string; dept: string; position: string }[]> {
  if (newSubIds.length === 0) return [];

  // 查询各部门已有下属数量（未调任，已任命）
  const { data: appointed } = await supabase
    .from('subordinates')
    .select('appointed_dept')
    .eq('save_id', saveId)
    .eq('is_appointed', true)
    .is('transferred_city', null);

  const deptCount: Record<string, number> = {};
  (appointed ?? []).forEach((r: Record<string, unknown>) => {
    const d = r.appointed_dept as string;
    if (d) deptCount[d] = (deptCount[d] ?? 0) + 1;
  });

  // 按需求量从高到低排序部门（人少的优先）
  const DEPT_KEYS_LIST = ['police', 'ndrc', 'finance', 'urban', 'education', 'health',
    'ecology', 'market', 'agriculture', 'personnel', 'invest', 'tax'] as const;
  const sortedDepts = [...DEPT_KEYS_LIST].sort((a, b) => (deptCount[a] ?? 0) - (deptCount[b] ?? 0));

  // 国考选调生优先岗位（按重要性排序）
  const KEY_DEPTS_NATIONAL: (typeof DEPT_KEYS_LIST[number])[] = ['ndrc', 'finance', 'organization' as never, 'personnel', 'ecology', 'police'];

  // 查新录用干部
  const { data: newSubs } = await supabase
    .from('subordinates')
    .select('*')
    .in('id', newSubIds);
  if (!newSubs || newSubs.length === 0) return [];

  const assignmentLog: { name: string; dept: string; position: string }[] = [];
  const { DEPT_CONFIG: DC } = await import('@/types/game');

  for (let i = 0; i < newSubs.length; i++) {
    const sub = newSubs[i] as Record<string, unknown>;
    // 选调生（国考第1名）分配至重要岗位
    let deptKey: typeof DEPT_KEYS_LIST[number];
    if (isNationalExam && i === 0) {
      // 选最空缺的重要岗位
      const keyAvailable = KEY_DEPTS_NATIONAL.filter(d => DEPT_KEYS_LIST.includes(d as typeof DEPT_KEYS_LIST[number]));
      const keyWithCount = keyAvailable.map(d => ({ d, cnt: deptCount[d] ?? 0 })).sort((a, b) => a.cnt - b.cnt);
      deptKey = (keyWithCount[0]?.d ?? sortedDepts[0]) as typeof DEPT_KEYS_LIST[number];
    } else {
      deptKey = sortedDepts[i % sortedDepts.length];
    }
    const cfg = DC[deptKey];
    if (!cfg) continue;
    const isZhuandiaosheng = (sub.role as string) === '中央选调生';
    const position = isZhuandiaosheng ? `${cfg.name}${cfg.headTitle}助理（选调生）` : `${cfg.name}科员`;
    await supabase
      .from('subordinates')
      .update({
        appointed_dept: deptKey,
        is_appointed: true,
        dept_position: isZhuandiaosheng ? 'deputy' : 'staff',
        position,
        role: isZhuandiaosheng ? `${cfg.name}选调生` : `${cfg.name}工作人员`,
      })
      .eq('id', sub.id as string);
    assignmentLog.push({ name: sub.name as string, dept: cfg.name, position });
    deptCount[deptKey] = (deptCount[deptKey] ?? 0) + 1;
  }
  return assignmentLog;
}

// ============ 月度工作报告 ============
function rowToMonthlyReport(row: Record<string, unknown>): MonthlyReport {
  return {
    id: row.id as string,
    saveId: row.save_id as string,
    monthKey: row.month_key as number,
    yearKey: row.year_key as number,
    deptKey: row.dept_key as string,
    title: row.title as string,
    content: row.content as string,
    gdpChange: (row.gdp_change as number) ?? 0,
    livelihoodChange: (row.livelihood_change as number) ?? 0,
    ecologyChange: (row.ecology_change as number) ?? 0,
    businessChange: (row.business_change as number) ?? 0,
    meritReward: (row.merit_reward as number) ?? 0,
    isRead: (row.is_read as boolean) ?? false,
    createdAt: row.created_at as string,
  };
}

const DEPT_REPORT_TEMPLATES: Record<string, { titles: string[]; contents: string[][] }> = {
  police: {
    titles: ['公安局月度工作报告', '治安专项整治通报', '打击违法犯罪工作简报'],
    contents: [
      ['本月共破获刑事案件{n}起', '治安案件处置{m}起', '开展扫黄打非专项行动，查处违法人员{k}名'],
      ['本月实施街面巡逻{h}次，有效震慑犯罪', '新设社区警务站{s}个', '治安满意度提升{p}个百分点'],
    ],
  },
  ndrc: {
    titles: ['发改委月度工作报告', '招商引资工作简报', '重大项目推进通报'],
    contents: [
      ['本月新签约投资项目{n}个，合同金额{m}亿元', '推进重点项目{k}个，完成投资{h}亿元'],
      ['本月举办招商推介会{s}次，吸引意向投资{p}亿元'],
    ],
  },
  ecology: {
    titles: ['生态环保局月度工作报告', '环保专项整治通报', '生态环境执法简报'],
    contents: [
      ['本月开展企业环保检查{n}次，责令整改{m}家', '处以环保罚款共{k}万元'],
      ['本月关停不达标污染企业{s}家，生态指数提升{p}个百分点'],
    ],
  },
  market: {
    titles: ['市场监管局月度简报', '招商政策落实通报', '营商环境优化工作报告'],
    contents: [
      ['本月新增市场主体{n}家，注销{m}家', '办理营业执照{k}件，平均办理时限{h}个工作日'],
      ['本月开展食品安全检查{s}次，处罚违规商户{p}家'],
    ],
  },
  education: {
    titles: ['教育局月度工作报告', '师资队伍建设通报', '教育质量提升简报'],
    contents: [
      ['本月完成教师培训{n}人次，新引进优秀教师{m}名'],
      ['本月中小学在校生总数{k}人，出勤率达{h}%'],
    ],
  },
  health: {
    titles: ['卫健委月度工作报告', '基层医疗服务通报', '公共卫生工作简报'],
    contents: [
      ['本月完成居民健康档案建档{n}人次，开展义诊活动{m}场'],
      ['本月卫生监督抽检{k}次，无重大食品安全事故'],
    ],
  },
  finance: {
    titles: ['财政局月度工作报告', '预算执行情况通报', '政府债务管理简报'],
    contents: [
      ['本月税收入库{n}万元，财政支出{m}万元，收支结余{k}万元'],
      ['本月完成专项债资金拨付{h}万元'],
    ],
  },
  urban: {
    titles: ['住建局月度工作报告', '城市建设推进通报', '住房保障工作简报'],
    contents: [
      ['本月新开工建设项目{n}个，竣工验收{m}个'],
      ['本月保障性住房申请受理{k}户，完成审核{h}户'],
    ],
  },
  agriculture: {
    titles: ['农业农村局月度工作报告', '乡村振兴工作通报', '农业生产情况简报'],
    contents: [
      ['本月农业生产总值{n}万元，同比增长{m}%'],
      ['本月开展农技培训{k}场次，参训农民{h}人'],
    ],
  },
};

function generateReportContent(deptKey: string): { title: string; content: string; gdpChange: number; livelihoodChange: number; ecologyChange: number; businessChange: number; meritReward: number } {
  const tpl = DEPT_REPORT_TEMPLATES[deptKey] ?? DEPT_REPORT_TEMPLATES['finance'];
  const title = tpl.titles[Math.floor(Math.random() * tpl.titles.length)];
  const block = tpl.contents[Math.floor(Math.random() * tpl.contents.length)];
  const content = block.map(line =>
    line
      .replace('{n}', String(5 + Math.floor(Math.random() * 20)))
      .replace('{m}', String(3 + Math.floor(Math.random() * 15)))
      .replace('{k}', String(2 + Math.floor(Math.random() * 10)))
      .replace('{h}', String(10 + Math.floor(Math.random() * 20)))
      .replace('{s}', String(1 + Math.floor(Math.random() * 5)))
      .replace('{p}', String(1 + Math.floor(Math.random() * 8)))
  ).join('；') + '。';

  const deptEffects: Record<string, Partial<{ gdpChange: number; livelihoodChange: number; ecologyChange: number; businessChange: number }>> = {
    police: { livelihoodChange: 0.5 },
    ndrc: { gdpChange: 0.8 },
    ecology: { ecologyChange: 0.8 },
    market: { businessChange: 0.6 },
    education: { livelihoodChange: 0.5 },
    health: { livelihoodChange: 0.4 },
    finance: { gdpChange: 0.3 },
    urban: { gdpChange: 0.4, livelihoodChange: 0.3 },
    agriculture: { gdpChange: 0.3, livelihoodChange: 0.3 },
  };
  const fx = deptEffects[deptKey] ?? {};
  return {
    title, content,
    gdpChange: fx.gdpChange ?? 0,
    livelihoodChange: fx.livelihoodChange ?? 0,
    ecologyChange: fx.ecologyChange ?? 0,
    businessChange: fx.businessChange ?? 0,
    meritReward: 8 + Math.floor(Math.random() * 12),
  };
}

export async function generateMonthlyReports(
  saveId: string, userId: string, gameDays: number
): Promise<MonthlyReport[]> {
  const monthKey = Math.floor(gameDays / 30);
  const yearKey = Math.floor(gameDays / 365);

  // 获取已任命部门
  const { data: subs } = await supabase
    .from('subordinates')
    .select('appointed_dept, dept_position, is_appointed')
    .eq('save_id', saveId)
    .eq('is_appointed', true);

  const activeDepts = [...new Set((subs ?? []).map(s => s.appointed_dept as string).filter(Boolean))];
  if (activeDepts.length === 0) return [];

  // 查是否已生成本月报告
  const { data: existing } = await supabase
    .from('monthly_reports')
    .select('id')
    .eq('save_id', saveId)
    .eq('month_key', monthKey);
  if (existing && existing.length > 0) return [];

  const rows = activeDepts.map(dk => {
    const gen = generateReportContent(dk);
    return {
      save_id: saveId, user_id: userId,
      month_key: monthKey, year_key: yearKey,
      dept_key: dk, title: gen.title, content: gen.content,
      gdp_change: gen.gdpChange, livelihood_change: gen.livelihoodChange,
      ecology_change: gen.ecologyChange, business_change: gen.businessChange,
      merit_reward: gen.meritReward, is_read: false,
    };
  });

  const { data: created } = await supabase.from('monthly_reports').insert(rows).select('*');
  if (!created) return [];
  return (created as Record<string, unknown>[]).map(rowToMonthlyReport);
}

export async function getUnreadReports(saveId: string): Promise<MonthlyReport[]> {
  const { data } = await supabase
    .from('monthly_reports')
    .select('*')
    .eq('save_id', saveId)
    .eq('is_read', false)
    .order('created_at', { ascending: false })
    .limit(20);
  return (data ?? []).map(r => rowToMonthlyReport(r as Record<string, unknown>));
}

export async function markReportsRead(saveId: string, monthKey: number): Promise<void> {
  await supabase.from('monthly_reports').update({ is_read: true })
    .eq('save_id', saveId).eq('month_key', monthKey);
}

export async function getAllReports(saveId: string): Promise<MonthlyReport[]> {
  const { data } = await supabase
    .from('monthly_reports')
    .select('*')
    .eq('save_id', saveId)
    .order('created_at', { ascending: false })
    .limit(50);
  return (data ?? []).map(r => rowToMonthlyReport(r as Record<string, unknown>));
}

// ============ 领导班子 ============
function rowToLeadership(row: Record<string, unknown>): LeadershipMember {
  return {
    id: row.id as string,
    saveId: row.save_id as string,
    subId: (row.sub_id as string) ?? null,
    roleKey: row.role_key as string,
    roleLabel: row.role_label as string,
    subName: (row.sub_name as string) ?? '',
    subAvatar: (row.sub_avatar as number) ?? 0,
    subGender: (row.sub_gender as string) ?? '男',
    assignedDay: (row.assigned_day as number) ?? 0,
  };
}

export async function getLeadershipBand(saveId: string): Promise<LeadershipMember[]> {
  const { data } = await supabase
    .from('leadership_band')
    .select('*')
    .eq('save_id', saveId)
    .order('created_at', { ascending: true });
  return (data ?? []).map(r => rowToLeadership(r as Record<string, unknown>));
}

export async function assignLeadershipRole(
  saveId: string, userId: string,
  subId: string, roleKey: string, roleLabel: string,
  subName: string, subAvatar: number, subGender: string, gameDays: number
): Promise<boolean> {
  // 先删除该角色已有的任命
  await supabase.from('leadership_band').delete().eq('save_id', saveId).eq('role_key', roleKey);
  const { error } = await supabase.from('leadership_band').insert({
    save_id: saveId, user_id: userId, sub_id: subId,
    role_key: roleKey, role_label: roleLabel,
    sub_name: subName, sub_avatar: subAvatar, sub_gender: subGender,
    assigned_day: gameDays,
  });
  return !error;
}

export async function removeLeadershipRole(saveId: string, roleKey: string): Promise<boolean> {
  const { error } = await supabase.from('leadership_band').delete()
    .eq('save_id', saveId).eq('role_key', roleKey);
  return !error;
}

// ============ 下属履历 ============
import type { SubResume, Enterprise } from '@/types/game';

function rowToSubResume(row: Record<string, unknown>): SubResume {
  return {
    id: row.id as string,
    saveId: row.save_id as string,
    subId: row.sub_id as string,
    position: row.position as string,
    deptName: (row.dept_name as string) ?? '',
    startDay: (row.start_day as number) ?? 0,
    endDay: (row.end_day as number) ?? null,
    note: (row.note as string) ?? '',
    createdAt: row.created_at as string,
  };
}

export async function getSubResumes(subId: string): Promise<SubResume[]> {
  const { data } = await supabase
    .from('subordinate_resumes')
    .select('*')
    .eq('sub_id', subId)
    .order('start_day', { ascending: false });
  if (!data) return [];
  return (data as Record<string, unknown>[]).map(rowToSubResume);
}

export async function addSubResume(
  saveId: string, subId: string, position: string,
  deptName: string, startDay: number, note = ''
): Promise<void> {
  await supabase.from('subordinate_resumes').insert({
    save_id: saveId, sub_id: subId,
    position, dept_name: deptName,
    start_day: startDay, end_day: null, note,
  });
}

export async function closeSubResume(subId: string, endDay: number): Promise<void> {
  // 关闭当前在职履历
  await supabase.from('subordinate_resumes')
    .update({ end_day: endDay })
    .eq('sub_id', subId)
    .is('end_day', null);
}

// ============ 年度晋升候选人查询 ============
/** 每年初查询符合晋升条件的下属，同时遵守金字塔职级人数上限 */
export async function getAnnualPromoEligible(saveId: string, currentDay: number, playerRankLevel: number): Promise<{
  id: string; name: string; subLevel: number; ability: number; experience: number;
  appointedDept: string | null; deptPosition: string; reason: string;
}[]> {
  const { SUB_LEVEL_MAX_COUNT } = await import('@/types/game');

  const { data } = await supabase
    .from('subordinates')
    .select('id, name, sub_level, ability, experience, last_assessed_day, appointed_dept, dept_position')
    .eq('save_id', saveId)
    .is('transferred_city', null);
  if (!data) return [];

  const rows = data as { id: string; name: string; sub_level: number; ability: number; experience: number; last_assessed_day: number; appointed_dept: string | null; dept_position: string }[];

  // 统计当前各职级人数
  const levelCount: Record<number, number> = {};
  for (const s of rows) levelCount[s.sub_level] = (levelCount[s.sub_level] ?? 0) + 1;

  const maxSubLevel = Math.min(12, playerRankLevel - 1); // 下属最多比玩家低一级
  return rows
    .filter(s => s.sub_level < maxSubLevel)
    .map(s => {
      const daysInPost = currentDay - (s.last_assessed_day ?? 0);
      // 越高职级任职年限要求越长
      const yearThreshold = s.sub_level <= 3 ? 365 * 2 : s.sub_level <= 6 ? 365 * 3 : 365 * 4;
      const tenureReached = daysInPost >= yearThreshold;
      // KPI 标准随职级提高而更严格
      const kpiAbility = s.sub_level <= 3 ? 72 : s.sub_level <= 6 ? 76 : 80;
      const kpiExp    = s.sub_level <= 3 ? 55 : s.sub_level <= 6 ? 65 : 75;
      const kpiReached = s.ability >= kpiAbility && s.experience >= kpiExp;
      if (!tenureReached && !kpiReached) return null;

      // 检查目标职级是否已达金字塔上限
      const targetLevel = s.sub_level + 1;
      const cap = SUB_LEVEL_MAX_COUNT[targetLevel] ?? 999;
      const currentAtTarget = levelCount[targetLevel] ?? 0;
      if (currentAtTarget >= cap) return null; // 名额已满，此轮不推荐晋升

      const reason = tenureReached && kpiReached ? '年限到达 + KPI优秀' : tenureReached ? '在职年限已满' : 'KPI考核优秀';
      return { id: s.id, name: s.name, subLevel: s.sub_level, ability: s.ability, experience: s.experience, appointedDept: s.appointed_dept, deptPosition: s.dept_position, reason };
    })
    .filter((s): s is NonNullable<typeof s> => s !== null);
}

// ============ 下属晋升/降级 ============
export async function promoteSubordinate(
  saveId: string, subId: string, currentLevel: number, gameDays: number,
  currentPosition: string, deptName: string
): Promise<boolean> {
  const newLevel = Math.min(12, currentLevel + 1);
  if (newLevel === currentLevel) return false;
  const { error } = await supabase
    .from('subordinates')
    .update({ sub_level: newLevel })
    .eq('id', subId);
  if (!error) {
    await closeSubResume(subId, gameDays);
    await addSubResume(saveId, subId, currentPosition, deptName, gameDays, '晋升');
  }
  return !error;
}

export async function demoteSubordinate(
  saveId: string, subId: string, currentLevel: number, gameDays: number,
  currentPosition: string, deptName: string
): Promise<boolean> {
  const newLevel = Math.max(1, currentLevel - 1);
  if (newLevel === currentLevel) return false;
  const { error } = await supabase
    .from('subordinates')
    .update({ sub_level: newLevel })
    .eq('id', subId);
  if (!error) {
    await closeSubResume(subId, gameDays);
    await addSubResume(saveId, subId, currentPosition, deptName, gameDays, '降级');
  }
  return !error;
}

// ============ 人事局年底晋升评审 ============
// 返回符合晋升条件的下属列表（能力>=60，经验>=50）
export async function getPersonnelCandidates(saveId: string): Promise<Subordinate[]> {
  const { data } = await supabase
    .from('subordinates')
    .select('*')
    .eq('save_id', saveId)
    .gte('ability', 60)
    .gte('experience', 50)
    .lt('sub_level', 12)
    .order('ability', { ascending: false })
    .limit(8);
  if (!data) return [];
  return (data as Record<string, unknown>[]).map(rowToSubordinate);
}

// ============ 招商引资企业 ============
const INDUSTRY_LIST = ['制造业', '信息技术', '新能源', '生物医药', '高端装备', '商贸零售', '农业产业化', '文化旅游', '现代物流', '金融服务'];
const NAME_PREFIXES = ['华盛', '鼎兴', '腾远', '宏达', '聚力', '鑫源', '瑞丰', '卓越', '恒信', '晨阳', '盛世', '创合', '博远', '同兴', '智汇', '龙腾', '福瑞', '康泰', '永业', '嘉和'];
const NAME_SUFFIXES = ['科技有限公司', '实业有限公司', '投资集团', '新材料有限公司', '装备制造有限公司', '生物科技有限公司', '能源科技有限公司', '集团有限公司', '产业有限公司', '发展有限公司'];

function rowToEnterprise(row: Record<string, unknown>): Enterprise {
  return {
    id: row.id as string,
    saveId: row.save_id as string,
    userId: row.user_id as string,
    name: row.name as string,
    industry: (row.industry as string) ?? '制造业',
    scale: ((row.scale as string) ?? 'small') as Enterprise['scale'],
    investAmount: (row.invest_amount as number) ?? 0,
    taxContribution: (row.tax_contribution as number) ?? 0,
    employeeCount: (row.employee_count as number) ?? 0,
    introducedMonth: (row.introduced_month as number) ?? 0,
    status: ((row.status as string) ?? 'operating') as Enterprise['status'],
    foundedDay: (row.founded_day as number) ?? 0,
    createdAt: row.created_at as string,
  };
}

export async function getEnterprises(saveId: string): Promise<Enterprise[]> {
  const { data } = await supabase
    .from('enterprises')
    .select('*')
    .eq('save_id', saveId)
    .order('created_at', { ascending: false });
  if (!data) return [];
  return (data as Record<string, unknown>[]).map(rowToEnterprise);
}

// 月度自动引进1-2家企业（由招商局负责人能力影响）
export async function generateMonthlyEnterprises(
  saveId: string, userId: string, gameDays: number, headAbility: number, rankLevel = 3
): Promise<Enterprise[]> {
  const count = headAbility >= 70 ? 2 : 1;
  const currentMonth = Math.floor(gameDays / 30) + 1;

  // 企业投资规模和税收按职级分层，参照现实（万元）：
  // 乡镇：单企业投资5-50万，月税收0.4-7.5万
  // 县级：50-500万，月税收3-60万
  // 市级：500-5000万，月税收25-500万
  // 省级：5000-50000万，月税收200-4000万
  // 国家级：50000-200000万
  const investRange = rankLevel <= 3  ? [5, 45]
    : rankLevel <= 6  ? [50, 450]
    : rankLevel <= 9  ? [500, 4500]
    : rankLevel <= 11 ? [5000, 45000]
    : [50000, 150000];
  const taxRateLo = rankLevel <= 3 ? 0.08 : rankLevel <= 6 ? 0.06 : rankLevel <= 9 ? 0.05 : 0.04;
  const taxRateHi = rankLevel <= 3 ? 0.15 : rankLevel <= 6 ? 0.12 : rankLevel <= 9 ? 0.10 : 0.08;

  const rows = Array.from({ length: count }, () => {
    const prefix = NAME_PREFIXES[Math.floor(Math.random() * NAME_PREFIXES.length)];
    const suffix = NAME_SUFFIXES[Math.floor(Math.random() * NAME_SUFFIXES.length)];
    const industry = INDUSTRY_LIST[Math.floor(Math.random() * INDUSTRY_LIST.length)];
    const invest = investRange[0] + Math.floor(Math.random() * investRange[1]);
    const tax = Math.round(invest * (taxRateLo + Math.random() * (taxRateHi - taxRateLo)));
    const scaleVal: Enterprise['scale'] = invest >= investRange[0] + investRange[1] * 0.6 ? 'large'
      : invest >= investRange[0] + investRange[1] * 0.25 ? 'medium' : 'small';
    const employees = scaleVal === 'large' ? 200 + Math.floor(Math.random() * 800)
      : scaleVal === 'medium' ? 50 + Math.floor(Math.random() * 150)
      : 10 + Math.floor(Math.random() * 40);
    return {
      save_id: saveId, user_id: userId,
      name: prefix + suffix,
      industry,
      scale: scaleVal,
      invest_amount: invest,
      tax_contribution: tax,
      employee_count: employees,
      introduced_month: currentMonth,
      status: 'operating',
      founded_day: gameDays,
    };
  });
  const { data } = await supabase.from('enterprises').insert(rows).select('*');
  if (!data) return [];
  return (data as Record<string, unknown>[]).map(rowToEnterprise);
}

// 计算企业月度总税收（operating企业累加）
export async function calcMonthlyTax(saveId: string): Promise<number> {
  const { data } = await supabase
    .from('enterprises')
    .select('tax_contribution')
    .eq('save_id', saveId)
    .eq('status', 'operating');
  if (!data) return 0;
  return (data as Record<string, unknown>[]).reduce((sum, r) => sum + ((r.tax_contribution as number) ?? 0), 0);
}

// 关停企业
export async function closeEnterprise(enterpriseId: string): Promise<boolean> {
  const { error } = await supabase
    .from('enterprises')
    .update({ status: 'closed' })
    .eq('id', enterpriseId);
  return !error;
}

// 部门工作汇报：表扬/问责
export async function rewardDeptHead(subId: string, isReward: boolean): Promise<boolean> {
  const loyaltyDelta = isReward ? 8 : -8;
  const abilityDelta = isReward ? 2 : -2;
  const { data: sub } = await supabase
    .from('subordinates').select('loyalty, ability').eq('id', subId).single();
  if (!sub) return false;
  const r = sub as Record<string, unknown>;
  const newLoyalty = Math.max(0, Math.min(100, (r.loyalty as number) + loyaltyDelta));
  const newAbility = Math.max(0, Math.min(100, (r.ability as number) + abilityDelta));
  const { error } = await supabase.from('subordinates')
    .update({ loyalty: newLoyalty, ability: newAbility })
    .eq('id', subId);
  return !error;
}

// 获取各部门人数统计
export async function getDeptStaffCounts(saveId: string): Promise<Record<string, number>> {
  const { data } = await supabase
    .from('subordinates')
    .select('appointed_dept')
    .eq('save_id', saveId)
    .eq('is_appointed', true)
    .not('appointed_dept', 'is', null);
  if (!data) return {};
  const counts: Record<string, number> = {};
  for (const r of data as Record<string, unknown>[]) {
    const dept = r.appointed_dept as string;
    counts[dept] = (counts[dept] ?? 0) + 1;
  }
  return counts;
}

// ============ 财政汇总 ============
export interface FiscalSummary {
  // 主账户余额（player_saves.fund_balance，唯一权威来源）
  mainBalance: number;
  // 月度收入
  monthlyTaxIncome: number;        // 企业税收
  monthlyLoanRepayment: number;    // 贷款月供（支出）
  monthlyAdminExpense: number;     // 行政运营支出（按编制人数估算）
  monthlyNetFlow: number;          // 月净现金流
  // 企业明细
  enterpriseCount: number;
  enterpriseTotalTax: number;
  enterprises: Enterprise[];
  // 贷款明细
  activeLoans: LoanRecord[];
  debtTotal: number;
  // 投资明细
  runningInvestments: InvestmentRecord[];
  // 部门编制
  deptStaffCounts: Record<string, number>;
  totalStaff: number;
  // 累计税收记录
  totalTaxRevenue: number;
  // 城市税率
  cityTaxRate: number;
}

export async function getFiscalSummary(saveId: string, userId: string): Promise<FiscalSummary | null> {
  const [entData, financeData, staffData, saveData] = await Promise.all([
    supabase.from('enterprises').select('*').eq('save_id', saveId).order('created_at', { ascending: false }),
    getOrCreateFinance(saveId, userId),
    supabase.from('subordinates').select('appointed_dept').eq('save_id', saveId).eq('is_appointed', true).not('appointed_dept', 'is', null),
    supabase.from('player_saves').select('fund_balance,tax_revenue,city_tax_rate').eq('id', saveId).maybeSingle(),
  ]);

  const enterprises = (Array.isArray(entData.data) ? entData.data : []).map(r => rowToEnterprise(r as Record<string, unknown>));
  const operating = enterprises.filter(e => e.status === 'operating');
  const monthlyTaxIncome = operating.reduce((s, e) => s + e.taxContribution, 0);

  const activeLoans = financeData?.loans.filter(l => l.status === 'active') ?? [];
  const monthlyLoanRepayment = activeLoans.reduce((s, l) => s + l.monthlyPay, 0);

  const runningInvestments = financeData?.investments.filter(i => i.status === 'running') ?? [];

  // 部门编制人数 → 行政运营成本（每人每月约 2~5 万估算）
  const deptStaffCounts: Record<string, number> = {};
  for (const r of (staffData.data ?? []) as Record<string, unknown>[]) {
    const dept = r.appointed_dept as string;
    deptStaffCounts[dept] = (deptStaffCounts[dept] ?? 0) + 1;
  }
  const totalStaff = Object.values(deptStaffCounts).reduce((s, n) => s + n, 0);
  const monthlyAdminExpense = totalStaff * 3; // 人均 3 万元/月

  const saveRow = saveData.data as Record<string, unknown> | null;
  // mainBalance 统一从 player_saves.fund_balance 读取（万元单位，月度结算唯一写入源）
  const mainBalance = (saveRow?.fund_balance as number) ?? 0;
  const totalTaxRevenue = (saveRow?.tax_revenue as number) ?? 0;
  const cityTaxRate = (saveRow?.city_tax_rate as number) ?? 0.12;

  const monthlyNetFlow = monthlyTaxIncome - monthlyLoanRepayment - monthlyAdminExpense;

  return {
    mainBalance,
    monthlyTaxIncome,
    monthlyLoanRepayment,
    monthlyAdminExpense,
    monthlyNetFlow,
    enterpriseCount: operating.length,
    enterpriseTotalTax: monthlyTaxIncome,
    enterprises,
    activeLoans,
    debtTotal: financeData?.debtTotal ?? 0,
    runningInvestments,
    deptStaffCounts,
    totalStaff,
    totalTaxRevenue,
    cityTaxRate,
  };
}

// ============ 信访事件 ============
const PETITION_COMPLAINTS = [
  { title: '群众反映基础设施差', content: '辖区多名群众联名来信，反映道路破损严重，出行不便，请求政府尽快修缮。' },
  { title: '企业噪音扰民投诉', content: '附近居民投诉新引进企业夜间施工噪音扰民，严重影响居民休息，要求整改。' },
  { title: '行政审批效率低下', content: '多家企业主来信反映营业执照审批周期过长，影响正常经营，要求提高行政效率。' },
  { title: '征地拆迁补偿纠纷', content: '某村民投诉征地补偿款未足额发放，请求政府介入协调解决。' },
  { title: '城区环境卫生问题', content: '市民投诉某街道垃圾清运不及时，堆积严重，影响环境卫生和居民健康。' },
  { title: '教育资源分配不均', content: '家长代表来信，反映优质学校招生名额分配不公，要求公开招生标准。' },
  { title: '医疗服务质量投诉', content: '患者家属投诉某医院服务态度恶劣、看病难问题突出，要求相关部门介入处理。' },
  { title: '政务服务态度问题', content: '群众投诉窗口工作人员服务态度差，推诿扯皮，影响政府形象。' },
];

const PETITION_PRAISES = [
  { title: '群众感谢道路改造工程', content: '辖区居民联名来信，对近期完成的道路改造工程表示感谢，称赞政府为民办实事。' },
  { title: '表扬扶贫工作成效显著', content: '贫困村村民来信，感谢政府精准扶贫政策，村子面貌焕然一新，生活大为改善。' },
  { title: '市民表扬城市环境整治', content: '市民来信表扬近期城市环境整治工作成效，称赞城市变得干净整洁。' },
  { title: '企业肯定营商环境改善', content: '本地企业家协会来函，高度评价近年来营商环境持续优化，表示将加大在本地投资。' },
  { title: '群众感谢民生帮扶政策', content: '困难群众来信，感谢政府发放的生活补贴和帮扶措施，解决了燃眉之急。' },
  { title: '表扬行政审批改革成效', content: '多家企业来函称赞"一窗通办"改革，审批效率大幅提升，为企业节省了大量时间成本。' },
];

function rowToPetitionEvent(row: Record<string, unknown>): PetitionEvent {
  return {
    id: row.id as string,
    saveId: row.save_id as string,
    userId: row.user_id as string,
    eventType: row.event_type as 'complaint' | 'praise',
    title: row.title as string,
    content: row.content as string,
    gameDay: (row.game_day as number) ?? 0,
    monthKey: (row.month_key as number) ?? 0,
    bosFavorDelta: (row.bos_favor_delta as number) ?? 0,
    meritDelta: (row.merit_delta as number) ?? 0,
    isProcessed: (row.is_processed as boolean) ?? false,
    createdAt: row.created_at as string,
  };
}

// 生成月度信访事件（约30%概率，外部决策是否调用）
export async function generatePetitionEvent(
  saveId: string, userId: string, gameDays: number
): Promise<PetitionEvent | null> {
  const monthKey = Math.floor(gameDays / 30);
  // 检查本月是否已生成
  const { data: existing } = await supabase
    .from('petition_events')
    .select('id')
    .eq('save_id', saveId)
    .eq('month_key', monthKey)
    .limit(1);
  if (existing && existing.length > 0) return null;

  const isComplaint = Math.random() < 0.60; // 60%是投诉，40%是表扬
  const pool = isComplaint ? PETITION_COMPLAINTS : PETITION_PRAISES;
  const template = pool[Math.floor(Math.random() * pool.length)];

  const bosFavorDelta = isComplaint
    ? -(1 + Math.floor(Math.random() * 3))
    : (1 + Math.floor(Math.random() * 2));
  const meritDelta = isComplaint
    ? -(5 + Math.floor(Math.random() * 6))
    : (3 + Math.floor(Math.random() * 6));

  const { data } = await supabase.from('petition_events').insert({
    save_id: saveId, user_id: userId,
    event_type: isComplaint ? 'complaint' : 'praise',
    title: template.title, content: template.content,
    game_day: gameDays, month_key: monthKey,
    bos_favor_delta: bosFavorDelta, merit_delta: meritDelta,
    is_processed: false,
  }).select('*').maybeSingle();
  if (!data) return null;
  return rowToPetitionEvent(data as Record<string, unknown>);
}

// 查询信访事件列表
export async function getPetitionEvents(saveId: string, limit = 20): Promise<PetitionEvent[]> {
  const { data } = await supabase
    .from('petition_events')
    .select('*')
    .eq('save_id', saveId)
    .order('game_day', { ascending: false })
    .limit(limit);
  return (data ?? []).map(r => rowToPetitionEvent(r as Record<string, unknown>));
}

// 处理信访事件（标记已处理，并返回受影响的delta值）
export async function processPetitionEvent(
  eventId: string
): Promise<{ bosFavorDelta: number; meritDelta: number } | null> {
  const { data } = await supabase
    .from('petition_events')
    .select('bos_favor_delta, merit_delta, is_processed')
    .eq('id', eventId)
    .maybeSingle();
  if (!data) return null;
  const r = data as Record<string, unknown>;
  if (r.is_processed) return null;
  await supabase.from('petition_events').update({ is_processed: true }).eq('id', eventId);
  return { bosFavorDelta: r.bos_favor_delta as number, meritDelta: r.merit_delta as number };
}

// ============ 招商引资立即入驻 ============
// 招商行政活动执行后立即生成企业（1~3家，按能力加成）
export async function generateImmediateEnterprises(
  saveId: string, userId: string, gameDays: number, headAbility: number, count = 1, rankLevel = 3
): Promise<Enterprise[]> {
  const realCount = Math.min(count + (headAbility >= 70 ? 1 : 0), 3);
  const currentMonth = Math.floor(gameDays / 30) + 1;

  const investRange = rankLevel <= 3  ? [5, 45]
    : rankLevel <= 6  ? [50, 450]
    : rankLevel <= 9  ? [500, 4500]
    : rankLevel <= 11 ? [5000, 45000]
    : [50000, 150000];
  const taxRateLo = rankLevel <= 3 ? 0.08 : rankLevel <= 6 ? 0.06 : rankLevel <= 9 ? 0.05 : 0.04;
  const taxRateHi = rankLevel <= 3 ? 0.15 : rankLevel <= 6 ? 0.12 : rankLevel <= 9 ? 0.10 : 0.08;

  const rows = Array.from({ length: realCount }, () => {
    const prefix = NAME_PREFIXES[Math.floor(Math.random() * NAME_PREFIXES.length)];
    const suffix = NAME_SUFFIXES[Math.floor(Math.random() * NAME_SUFFIXES.length)];
    const industry = INDUSTRY_LIST[Math.floor(Math.random() * INDUSTRY_LIST.length)];
    const invest = investRange[0] + Math.floor(Math.random() * investRange[1]);
    const tax = Math.round(invest * (taxRateLo + Math.random() * (taxRateHi - taxRateLo)));
    const scaleVal: Enterprise['scale'] = invest >= investRange[0] + investRange[1] * 0.6 ? 'large'
      : invest >= investRange[0] + investRange[1] * 0.25 ? 'medium' : 'small';
    const employees = scaleVal === 'large' ? 200 + Math.floor(Math.random() * 800)
      : scaleVal === 'medium' ? 50 + Math.floor(Math.random() * 150)
      : 10 + Math.floor(Math.random() * 40);
    return {
      save_id: saveId, user_id: userId,
      name: prefix + suffix, industry, scale: scaleVal,
      invest_amount: invest, tax_contribution: tax,
      employee_count: employees, introduced_month: currentMonth,
      status: 'operating', founded_day: gameDays,
    };
  });
  const { data } = await supabase.from('enterprises').insert(rows).select('*');
  if (!data) return [];
  return (data as Record<string, unknown>[]).map(rowToEnterprise);
}

// ============ 工商局企业管理功能 ============
// 专项检查：随机增减单家企业的税收贡献
export async function inspectEnterprise(
  enterpriseId: string
): Promise<{ delta: number } | null> {
  const { data: ent } = await supabase
    .from('enterprises').select('tax_contribution').eq('id', enterpriseId).maybeSingle();
  if (!ent) return null;
  const r = ent as Record<string, unknown>;
  const current = r.tax_contribution as number;
  // 检查结果：60%正向（发现良好）10%不变，30%负向（发现问题）
  const roll = Math.random();
  const delta = roll < 0.60
    ? Math.round(current * (0.05 + Math.random() * 0.10))
    : roll < 0.70
    ? 0
    : -Math.round(current * (0.05 + Math.random() * 0.10));
  const newVal = Math.max(1, current + delta);
  await supabase.from('enterprises').update({ tax_contribution: newVal }).eq('id', enterpriseId);
  return { delta };
}

// 违规整改：关停企业
export async function regulateEnterprise(enterpriseId: string): Promise<boolean> {
  return closeEnterprise(enterpriseId);
}

// 优化营商服务：批量提升所有运营企业税收贡献 5~10%
export async function optimizeBusinessService(saveId: string): Promise<number> {
  const { data } = await supabase
    .from('enterprises')
    .select('id, tax_contribution')
    .eq('save_id', saveId)
    .eq('status', 'operating');
  if (!data || data.length === 0) return 0;
  const boostRate = 0.05 + Math.random() * 0.05;
  const updates = (data as Record<string, unknown>[]).map(r => ({
    id: r.id as string,
    tax_contribution: Math.round((r.tax_contribution as number) * (1 + boostRate)),
  }));
  for (const u of updates) {
    await supabase.from('enterprises').update({ tax_contribution: u.tax_contribution }).eq('id', u.id);
  }
  return Math.round(boostRate * 100);
}

// ============ 部门补充科员（任命正/副职后调用）============
// deptPosition='staff' 为科员/科长/办事员，is_appointed=true，随机2~4人
export async function fillDeptStaff(
  saveId: string, userId: string, deptKey: DeptKey
): Promise<number> {
  // 获取玩家职级以生成正确的称谓
  const { data: saveRow } = await supabase
    .from('player_saves')
    .select('rank_level')
    .eq('id', saveId)
    .maybeSingle();
  const rankLevel = (saveRow as Record<string, unknown> | null)?.rank_level as number ?? 3;

  // 按层级获取现实编制人数范围
  const { min: staffMin, max: staffMax } = getDeptStaffRange(rankLevel);
  const targetTotal = staffMin + Math.floor(Math.random() * (staffMax - staffMin + 1));

  // 检查已有总人数（头/副/科员）
  const { data: existing } = await supabase
    .from('subordinates')
    .select('id')
    .eq('save_id', saveId)
    .eq('appointed_dept', deptKey)
    .eq('is_appointed', true);
  const currentTotal = existing?.length ?? 0;
  if (currentTotal >= targetTotal) return 0;

  const needed = targetTotal - currentTotal;

  const NAMES_MALE = ['张伟', '王磊', '李强', '刘洋', '赵磊', '孙辉', '吴刚', '郑博', '韩杰', '冯刚', '陈勇', '周毅', '林峰', '黄浩', '马超', '许昊', '曹阳', '邓宇', '方建', '龚亮'];
  const NAMES_FEMALE = ['王芳', '陈敏', '周娟', '冯霞', '李静', '张丽', '刘云', '赵雪', '孙梅', '吴萍', '林慧', '黄婷', '马晓', '徐倩', '曾欢', '邓瑶', '秦莉'];

  // 动态部门名称
  const deptDisplayName = getDeptNameByRank(deptKey, rankLevel);
  const chiefLabel = rankLevel <= 3 ? `${deptDisplayName}负责人` : `${deptDisplayName}科长`;
  const staffLabel  = rankLevel <= 3 ? `${deptDisplayName}工作人员` : `${deptDisplayName}科员`;

  // 生成完整仕途档案
  const buildCareer = (gender: string): CareerEntry[] => {
    const age = 28 + Math.floor(Math.random() * 15);
    return _genNpcCareerHistory(Math.max(1, rankLevel - 2), age, undefined, undefined);
  };
  const { province: npcProv, city: npcCity } = randBirthPlace();
  const tier = npcSchoolTier(Math.max(1, rankLevel - 2));

  const rows = Array.from({ length: needed }, (_, i) => {
    const isMale = Math.random() > 0.4;
    const names = isMale ? NAMES_MALE : NAMES_FEMALE;
    // 每5人中首位为科长（20%），其余为科员（80%）
    const isSectionChief = (currentTotal + i) % 5 === 0;
    const roleLabel = isSectionChief ? chiefLabel : staffLabel;
    const gender = isMale ? '男' : '女';
    const uniName = pickUniversityName(tier, npcProv);
    const degreeLabel = npcDegreeLabel(tier, Math.max(1, rankLevel - 2));
    const studyYears = degreeLabel === '博士' ? 9 : degreeLabel === '硕士' ? 6 : 4;
    const age = 25 + Math.floor(Math.random() * 20);
    const gradYear = (2025 - age) + 18 + studyYears;
    const { province: bp, city: bc } = randBirthPlace();
    return {
      save_id: saveId, user_id: userId,
      name: names[Math.floor(Math.random() * names.length)],
      position: isSectionChief ? (rankLevel <= 3 ? '负责人' : '科长') : (rankLevel <= 3 ? '工作人员' : '科员'),
      role: roleLabel,
      avatar_id: Math.floor(Math.random() * 6),
      gender,
      ability: 30 + Math.floor(Math.random() * 35),
      loyalty: 40 + Math.floor(Math.random() * 35),
      integrity: 50 + Math.floor(Math.random() * 30),
      experience: 5 + Math.floor(Math.random() * 25),
      is_appointed: true,
      appointed_role: roleLabel,
      appointed_dept: deptKey,
      dept_position: 'staff',
      transferred_city: null,
      last_assessed_day: 0,
      birth_province: bp,
      birth_city: bc,
      graduation_year: gradYear,
      career_history: buildCareer(gender),
    };
  });
  await supabase.from('subordinates').insert(rows);
  return needed;
}

// ============ 年度分级综合评分排行快照 ============
/**
 * areaType → tier 映射
 * village/town  → 'town'（镇乡级）
 * district      → 'county'（县区级）
 * city_level    → 'city'（市级）
 * player_city（rankLevel）:
 *   1-3 → 'town', 4-6 → 'county', 7-9 → 'city', 10+ → 'province'
 */
function areaTypeToTier(areaType: string): 'province' | 'city' | 'county' | 'town' {
  if (areaType === 'city_level') return 'city';
  if (areaType === 'district')   return 'county';
  return 'town';
}
function rankLevelToTier(rankLevel: number): 'province' | 'city' | 'county' | 'town' {
  if (rankLevel >= 10) return 'province';
  if (rankLevel >= 7)  return 'city';
  if (rankLevel >= 4)  return 'county';
  return 'town';
}

export interface AnnualRankEntry {
  id: string;
  saveId: string;
  yearKey: number;
  tier: 'province' | 'city' | 'county' | 'town';
  rankPos: number;
  areaName: string;
  areaType: string;
  score: number;
  devIndex: number;
  favorIndex: number;
  cityGdp: number;
  cityLivelihood: number;
  cityEcology: number;
  cityBusiness: number;
  securityIndex: number;
}

function rowToRankEntry(r: Record<string, unknown>): AnnualRankEntry {
  return {
    id:              r.id as string,
    saveId:          r.save_id as string,
    yearKey:         r.year_key as number,
    tier:            r.tier as 'province' | 'city' | 'county' | 'town',
    rankPos:         r.rank_pos as number,
    areaName:        r.area_name as string,
    areaType:        r.area_type as string,
    score:           Number(r.score),
    devIndex:        r.dev_index as number,
    favorIndex:      r.favor_index as number,
    cityGdp:         Number(r.city_gdp),
    cityLivelihood:  Number(r.city_livelihood),
    cityEcology:     Number(r.city_ecology),
    cityBusiness:    Number(r.city_business),
    securityIndex:   Number(r.security_index),
  };
}

// ============ 各部门正职每月自动行动 ============
/**
 * 遍历所有已任命正职的部门，按正职能力系数自动执行月度行动。
 * 能力系数 = ability / 100（范围 0.5~1.0，最低保底 50%）
 * 返回实际叠加到 save 上的增量对象，由调用方写入。
 */
export async function execDeptAutoActions(
  saveId: string,
): Promise<{
  cityGdp: number; cityLivelihood: number; cityEcology: number;
  cityBusiness: number; securityIndex: number; meritPoints: number;
  bossFavor: number; fundBalance: number; taxRevenue: number;
  log: string[];
}> {
  const result = {
    cityGdp: 0, cityLivelihood: 0, cityEcology: 0,
    cityBusiness: 0, securityIndex: 0, meritPoints: 0,
    bossFavor: 0, fundBalance: 0, taxRevenue: 0,
    log: [] as string[],
  };

  // 查询所有正职下属
  const { data } = await supabase
    .from('subordinates')
    .select('appointed_dept, dept_position, ability, name, is_appointed')
    .eq('save_id', saveId)
    .eq('is_appointed', true)
    .eq('dept_position', 'head');

  if (!data || data.length === 0) return result;

  for (const row of data as Record<string, unknown>[]) {
    const deptKey = row.appointed_dept as DeptKey | null;
    if (!deptKey) continue;
    const cfg = DEPT_CONFIG[deptKey];
    if (!cfg?.autoEffect) continue;

    // 能力系数：保底 50%，最高 100%
    const ability = typeof row.ability === 'number' ? row.ability : 50;
    const factor = Math.max(0.5, Math.min(1.0, ability / 100));

    const fx = cfg.autoEffect;
    const apply = (v?: number) => v ? Math.round(v * factor * 10) / 10 : 0;

    result.cityGdp       += apply(fx.cityGdp);
    result.cityLivelihood += apply(fx.cityLivelihood);
    result.cityEcology    += apply(fx.cityEcology);
    result.cityBusiness   += apply(fx.cityBusiness);
    result.securityIndex  += apply(fx.securityIndex);
    result.meritPoints    += apply(fx.meritPoints);
    result.bossFavor      += apply(fx.bossFavor);
    result.fundBalance    += apply(fx.fundBalance);
    result.taxRevenue     += apply(fx.taxRevenue);

    result.log.push(`${cfg.name}[${row.name as string}]执行了【${cfg.autoActionName}】`);
  }

  return result;
}

// ============ 民生人口自然增长 ============
export async function growPopulation(saveId: string): Promise<number> {
  const { data } = await supabase
    .from('player_saves')
    .select('city_population, city_livelihood, city_business, city_gdp')
    .eq('id', saveId)
    .maybeSingle();
  if (!data) return 50000;
  const pop        = (data.city_population as number) ?? 50000;
  const livelihood = (data.city_livelihood as number) ?? 50;
  const business   = (data.city_business as number) ?? 50;
  const gdp        = (data.city_gdp as number) ?? 50;
  const baseRate   = 0.003;
  const bonus      = (livelihood > 60 ? 0.001 : 0) + (business > 60 ? 0.001 : 0) + (gdp > 70 ? 0.001 : 0);
  const newPop     = Math.max(1000, Math.round(pop * (1 + baseRate + bonus)));
  await supabase.from('player_saves').update({ city_population: newPop }).eq('id', saveId);
  return newPop;
}

// ============ 秘书能力每月自动+1 ============
export async function autoGrowSecretaryAbility(saveId: string): Promise<void> {
  const { data } = await supabase.from('secretary').select('id, ability').eq('save_id', saveId).maybeSingle();
  if (!data) return;
  const cur = (data.ability as number) ?? 50;
  if (cur >= 100) return;
  await supabase.from('secretary').update({ ability: Math.min(100, cur + 1) }).eq('id', data.id as string);
}

/**
 * NPC月度能力自然增长（锚定官职职级，不再弹窗晋级）
 * 增长逻辑（参考现实干部成长规律）：
 *  - 科员级(1-2)：在岗实践多，成长快，+2~3点能力/月，上限80
 *  - 副科/正科(3-4)：基层独当一面，+1~2点/月，上限85
 *  - 副处/正处(5-6)：经验丰富，+1点/月，上限88
 *  - 副厅/正厅(7-8)：增长趋缓，+1点/月，上限90（每3月增1次）
 *  - 副部/正部+(9+)：顶峰期，上限95，每6月+1点
 */
export async function autoGrowSubAbility(saveId: string): Promise<void> {
  const { data } = await supabase
    .from('subordinates')
    .select('id, sub_level, ability, experience')
    .eq('save_id', saveId)
    .is('transferred_city', null);
  if (!data || data.length === 0) return;

  const rows = data as { id: string; sub_level: number; ability: number; experience: number }[];
  for (const sub of rows) {
    const level = sub.sub_level ?? 1;
    // 每月随机决定是否增长（按职级控制频率）
    const roll = Math.random();
    // 科员(1-2)：100%概率增长
    // 副科/正科(3-4)：80%
    // 副处/正处(5-6)：60%
    // 副厅/正厅(7-8)：40%
    // 副部+(9+)：20%
    const prob = level <= 2 ? 1.0 : level <= 4 ? 0.80 : level <= 6 ? 0.60 : level <= 8 ? 0.40 : 0.20;
    if (roll > prob) continue;

    // 增长量（职级越高增量越小）
    const gain = level <= 2 ? 2 + Math.floor(Math.random() * 2) : level <= 4 ? 1 + Math.floor(Math.random() * 2) : 1;
    const cap  = level <= 2 ? 80 : level <= 4 ? 85 : level <= 6 ? 88 : level <= 8 ? 90 : 95;
    const expGain = level <= 4 ? 1 : 0; // 低职级顺带积累经验

    if (sub.ability >= cap && sub.experience >= 100) continue;
    await supabase.from('subordinates').update({
      ability:    Math.min(cap, sub.ability + gain),
      experience: Math.min(100, sub.experience + expGain),
    }).eq('id', sub.id);
  }
}

// ============ 一键考评所有在岗下属 ============
export async function batchAssessSubordinates(saveId: string, gameDays: number): Promise<number> {
  const { data } = await supabase
    .from('subordinates')
    .select('id, ability, loyalty, experience')
    .eq('save_id', saveId)
    .eq('is_appointed', true);
  if (!data || data.length === 0) return 0;
  for (const row of data as Record<string, unknown>[]) {
    await supabase.from('subordinates').update({
      ability:           Math.min(100, Math.max(0, (row.ability as number)    + (Math.floor(Math.random() * 5) - 1))),
      loyalty:           Math.min(100, Math.max(0, (row.loyalty as number)    + (Math.floor(Math.random() * 4) - 1))),
      experience:        Math.min(100, (row.experience as number) + 2 + Math.floor(Math.random() * 3)),
      last_assessed_day: gameDays,
    }).eq('id', row.id as string);
  }
  return data.length;
}

// ============ 一键分配岗位 ============
/**
 * 一键分配岗位（智能级联策略）：
 * 1. 优先填充空缺正职（每部门最多1名）
 * 2. 正职全满后，填充空缺副职（每部门最多3名）
 * 3. 副职全满后，将剩余人员分配为科员（就近分配人数不足的部门）
 * 返回总分配人数。
 */
export async function autoAssignSubordinates(saveId: string, userId: string, rankLevel = 7): Promise<number> {
  // 获取全部未在岗下属（is_appointed=false，transferred_city 为 null）
  const { data: unassigned } = await supabase
    .from('subordinates')
    .select('id, ability, faction, sub_level')
    .eq('save_id', saveId)
    .eq('is_appointed', false)
    .is('transferred_city', null);
  if (!unassigned || unassigned.length === 0) return 0;

  // 获取当前已任命情况，统计各部门正职/副职/科员人数
  const { data: appointedAll } = await supabase
    .from('subordinates')
    .select('appointed_dept, dept_position')
    .eq('save_id', saveId)
    .eq('is_appointed', true);

  // 编制上限：1 正职 / 5 副职 / 无限科员（科长占20%，科员占80%）
  const HEAD_LIMIT   = 1;
  const DEPUTY_LIMIT = 5;

  type DeptCounts = { head: number; deputy: number; staff: number };
  const deptCounts: Record<string, DeptCounts> = {};
  const allDepts = Object.keys(DEPT_CONFIG) as DeptKey[];
  for (const d of allDepts) deptCounts[d] = { head: 0, deputy: 0, staff: 0 };
  for (const row of (appointedAll ?? [])) {
    const r = row as Record<string, unknown>;
    const dept = r.appointed_dept as string;
    const pos  = r.dept_position as string;
    if (deptCounts[dept] && (pos === 'head' || pos === 'deputy' || pos === 'staff')) {
      deptCounts[dept][pos as keyof DeptCounts]++;
    }
  }

  // 能力降序排列，清除残留字段
  const pool = [...(unassigned as { id: string; ability: number; faction: string; sub_level: number }[])]
    .sort((a, b) => b.ability - a.ability);
  const unassignedIds = pool.map(s => s.id);
  await supabase.from('subordinates')
    .update({ appointed_dept: null, dept_position: null, appointed_role: null })
    .in('id', unassignedIds);

  let assigned = 0;
  let poolIdx  = 0;

  // ── 阶段 1：填充正职空缺（能力最强者担任正职）──
  const headVacant = allDepts.filter(d => deptCounts[d].head < HEAD_LIMIT);
  for (const dept of headVacant) {
    if (poolIdx >= pool.length) break;
    const sub = pool[poolIdx++];
    await supabase.from('subordinates').update({
      is_appointed: true,
      appointed_role: getDeptHeadTitle(dept, rankLevel),
      appointed_dept: dept,
      dept_position: 'head',
      sub_level: getDeptPositionSubLevel(dept, rankLevel, 'head'),
      position: getDeptHeadTitle(dept, rankLevel),
    }).eq('id', sub.id);
    deptCounts[dept].head++;
    await fillDeptStaff(saveId, userId, dept);
    assigned++;
  }

  // ── 阶段 2：填充副职空缺（每部门最多 5 名副职）──
  if (poolIdx < pool.length) {
    const deputyVacant: DeptKey[] = [];
    for (const d of allDepts) {
      const gap = DEPUTY_LIMIT - deptCounts[d].deputy;
      for (let i = 0; i < gap; i++) deputyVacant.push(d);
    }
    for (const dept of deputyVacant) {
      if (poolIdx >= pool.length) break;
      const sub = pool[poolIdx++];
      await supabase.from('subordinates').update({
        is_appointed: true,
        appointed_role: getDeptDeputyTitle(dept, rankLevel),
        appointed_dept: dept,
        dept_position: 'deputy',
        sub_level: getDeptPositionSubLevel(dept, rankLevel, 'deputy'),
        position: getDeptDeputyTitle(dept, rankLevel),
      }).eq('id', sub.id);
      deptCounts[dept].deputy++;
      assigned++;
    }
  }

  // ── 阶段 3：剩余人员按 20%科长/80%科员 轮询分配到各部门 ──
  // 每满 5 人给 1 名科长（位置 0），其余为科员
  if (poolIdx < pool.length) {
    const deptArr = allDepts.slice().sort((a, b) => deptCounts[a].staff - deptCounts[b].staff);
    // 记录每个部门本次新增科员数，用于控制科长比例
    const newStaffCount: Record<string, number> = {};
    for (const d of allDepts) newStaffCount[d] = 0;
    let deptIdx = 0;

    while (poolIdx < pool.length) {
      // 轮询找下一个可分配的部门（科员上限 30 人/部门）
      let found = false;
      for (let attempt = 0; attempt < deptArr.length; attempt++) {
        const dept = deptArr[(deptIdx + attempt) % deptArr.length];
        if (deptCounts[dept].staff < 30) {
          const sub = pool[poolIdx++];
          // 每 5 人中首位为科长（20%），其余为科员（80%）；乡镇层级用"工作人员/负责人"
          const isSectionChief = newStaffCount[dept] % 5 === 0;
          const deptDisplayName = getDeptNameByRank(dept, rankLevel);
          const role = isSectionChief
            ? (rankLevel <= 3 ? `${deptDisplayName}负责人` : `${deptDisplayName}科长`)
            : (rankLevel <= 3 ? `${deptDisplayName}工作人员` : `${deptDisplayName}科员`);
          await supabase.from('subordinates').update({
            is_appointed: true,
            appointed_role: role,
            appointed_dept: dept,
            dept_position: 'staff',
          }).eq('id', sub.id);
          deptCounts[dept].staff++;
          newStaffCount[dept]++;
          deptIdx = (deptIdx + attempt + 1) % deptArr.length;
          assigned++;
          found = true;
          break;
        }
      }
      if (!found) break;
    }
  }

  return assigned;
}

// ============ 岗位变动时刷新下属队伍（晋升/换城市/换岗位）============
/**
 * 玩家晋升或换岗时调用：
 * 1. 将现有下属随机分配去向（转任/退休），高忠诚者保留在"申请跟随"候选列表
 * 2. 为新岗位生成初始下属并自动填满80%以上编制
 * 返回：申请跟随玩家的下属列表（由 promotion.tsx 弹窗处理）
 */
export async function refreshSubordinatesForNewPost(
  saveId: string,
  userId: string,
  newRankLevel: number,
  newCityName: string,
  keepFollowers: string[] = [],  // 已确认跟随的下属ID（在弹窗确认后调用）
): Promise<void> {
  // 获取所有在岗下属
  const { data: allSubs } = await supabase
    .from('subordinates')
    .select('id, loyalty, is_appointed')
    .eq('save_id', saveId)
    .is('transferred_city', null);

  if (!allSubs) return;

  const keepSet = new Set(keepFollowers);
  const toDispatch: string[] = [];

  for (const s of allSubs as { id: string; loyalty: number; is_appointed: boolean }[]) {
    if (keepSet.has(s.id)) continue; // 明确跟随者保留
    if (s.is_appointed) continue;   // AI 已任命在岗的下属保留（新城市继续工作）
    toDispatch.push(s.id);
  }

  if (toDispatch.length > 0) {
    // 批量标记为调任其他城市（用固定占位城市，不影响游戏）
    const DISPATCH_CITY = `原任地（${newCityName}前）`;
    await supabase.from('subordinates')
      .update({ is_appointed: false, transferred_city: DISPATCH_CITY, appointed_dept: null, dept_position: null, appointed_role: null })
      .in('id', toDispatch);
  }

  // 为新岗位生成初始下属（数量根据职级）
  const { SUBORDINATE_LIMIT } = await import('@/types/game');
  const targetCount = Math.ceil((SUBORDINATE_LIMIT[newRankLevel] ?? 10) * 0.85);
  const NAMES_M = ['张国强', '李建平', '王志远', '刘明华', '陈学勤', '赵伟民', '孙建国', '吴天明', '郑浩宇', '冯光辉', '韩志国', '许大勇', '曹俊峰', '邓晓波'];
  const NAMES_F = ['王雅云', '李秀芳', '张晓梅', '陈慧琴', '刘雨晴', '赵婉婷', '周文慧', '吴雪莹', '郑思远', '冯晓燕', '林碧霞', '黄美玲'];
  const FACTIONS = ['reform', 'pragmatic', 'neutral', 'economy', 'discipline'] as const;
  const DEPT_KEYS_NEW = Object.keys(DEPT_CONFIG) as DeptKey[];

  const newSubs = Array.from({ length: targetCount }, () => {
    const isMale = Math.random() > 0.4;
    const names = isMale ? NAMES_M : NAMES_F;
    const dept = DEPT_KEYS_NEW[Math.floor(Math.random() * DEPT_KEYS_NEW.length)];
    const cfg = DEPT_CONFIG[dept];
    return {
      save_id: saveId,
      user_id: userId,
      name: names[Math.floor(Math.random() * names.length)],
      position: '科员',
      role: `${cfg.name}科员`,
      avatar_id: Math.floor(Math.random() * 8),
      gender: isMale ? '男' : '女',
      ability: 35 + Math.floor(Math.random() * 40),
      loyalty: 40 + Math.floor(Math.random() * 35),
      integrity: 45 + Math.floor(Math.random() * 35),
      experience: 5 + Math.floor(Math.random() * 30),
      faction: FACTIONS[Math.floor(Math.random() * FACTIONS.length)],
      is_appointed: false,
      sub_level: Math.max(1, newRankLevel - 2),
      transferred_city: null,
      last_assessed_day: 0,
    };
  });

  if (newSubs.length > 0) {
    await supabase.from('subordinates').insert(newSubs);
  }

  // 自动分配编制（阶段1正职+阶段2副职+阶段3科员）
  await autoAssignSubordinates(saveId, userId, newRankLevel);
  // 补全所有14个部门的额定编制（NPC填充）
  await fillAllDeptsStaff(saveId, userId);

  // ── 保障每部门至少1正职+2副职 ─────────────────────────────────────
  // autoAssignSubordinates 已尽力分配，但若干部库不足可能有部门副职<2
  // 此处对缺口部门补充生成干部并直接任命
  const DEPT_KEYS_CHECK = Object.keys(DEPT_CONFIG) as DeptKey[];
  const { data: appointed } = await supabase
    .from('subordinates')
    .select('id, appointed_dept, dept_position, ability')
    .eq('save_id', saveId)
    .eq('is_appointed', true)
    .not('appointed_dept', 'is', null);

  type AppointedRow = { id: string; appointed_dept: string; dept_position: string; ability: number };
  const apptData = (appointed ?? []) as AppointedRow[];
  const deptHead: Record<string, number>   = {};
  const deptDeputy: Record<string, number> = {};
  for (const r of apptData) {
    if (r.dept_position === 'head')   deptHead[r.appointed_dept]   = (deptHead[r.appointed_dept]   ?? 0) + 1;
    if (r.dept_position === 'deputy') deptDeputy[r.appointed_dept] = (deptDeputy[r.appointed_dept] ?? 0) + 1;
  }

  const NAMES_M2 = ['魏建国', '许志远', '曹光辉', '邓晓波', '梁俊峰', '彭天明', '蒋浩宇', '韩学勤'];
  const NAMES_F2 = ['林慧琴', '胡雨晴', '萧婉婷', '卢文慧', '章雪莹', '阮碧霞', '谢美玲', '龚思远'];
  const FACTIONS2 = ['reform', 'pragmatic', 'neutral', 'economy', 'discipline'] as const;

  for (const dept of DEPT_KEYS_CHECK) {
    const headGap   = Math.max(0, 1 - (deptHead[dept]   ?? 0));
    const deputyGap = Math.max(0, 2 - (deptDeputy[dept] ?? 0));
    const total = headGap + deputyGap;
    if (total === 0) continue;

    const positions: Array<'head' | 'deputy'> = [
      ...Array(headGap).fill('head') as 'head'[],
      ...Array(deputyGap).fill('deputy') as 'deputy'[],
    ];

    for (const pos of positions) {
      const isMale = Math.random() > 0.4;
      const names = isMale ? NAMES_M2 : NAMES_F2;
      const name = names[Math.floor(Math.random() * names.length)];
      const faction = FACTIONS2[Math.floor(Math.random() * FACTIONS2.length)];
      const subLevel = getDeptPositionSubLevel(dept, newRankLevel, pos);
      const role = pos === 'head' ? getDeptHeadTitle(dept, newRankLevel) : getDeptDeputyTitle(dept, newRankLevel);
      const { data: ins } = await supabase.from('subordinates').insert({
        save_id: saveId,
        user_id: userId,
        name,
        position: role,
        role,
        avatar_id: Math.floor(Math.random() * 8),
        gender: isMale ? '男' : '女',
        ability: pos === 'head' ? 50 + Math.floor(Math.random() * 25) : 40 + Math.floor(Math.random() * 25),
        loyalty: 45 + Math.floor(Math.random() * 30),
        integrity: 50 + Math.floor(Math.random() * 30),
        experience: 10 + Math.floor(Math.random() * 20),
        faction,
        is_appointed: true,
        appointed_dept: dept,
        dept_position: pos,
        appointed_role: role,
        sub_level: subLevel,
        transferred_city: null,
        last_assessed_day: 0,
      }).select('id').single();
      if (ins) {
        if (pos === 'head') deptHead[dept]   = (deptHead[dept]   ?? 0) + 1;
        else                deptDeputy[dept] = (deptDeputy[dept] ?? 0) + 1;
      }
    }
  }
}

/**
 * 获取当前在岗下属中愿意跟随玩家的候选人列表（忠诚度≥70）
 * 供晋升弹窗展示，最多返回3名
 */
export async function getFollowCandidates(saveId: string): Promise<{ id: string; name: string; loyalty: number; appointedRole: string | null }[]> {
  const { data } = await supabase
    .from('subordinates')
    .select('id, name, loyalty, appointed_role')
    .eq('save_id', saveId)
    .is('transferred_city', null)
    .gte('loyalty', 70)
    .order('loyalty', { ascending: false })
    .limit(3);
  return (data ?? []).map(r => ({
    id: r.id as string,
    name: r.name as string,
    loyalty: r.loyalty as number,
    appointedRole: r.appointed_role as string | null,
  }));
}
const EXCHANGE_CITIES = ['穗城市', '锦城市', '江夏市', '长安市', '京岳市', '钱塘市', '历城市', '中州市', '湘都市', '庐州市'];
const EXCHANGE_NAMES_M = ['刘建国', '张维新', '王国华', '陈明远', '李志勇', '赵子强', '周文博', '吴天明', '郑昊宇', '孙家豪'];
const EXCHANGE_NAMES_F = ['刘晓燕', '张敏华', '王雅琳', '陈思远', '李晓萍', '赵婉婷', '周文慧', '吴雨欣', '郑梦瑶', '孙秀媛'];

export interface ExchangeOfficer {
  name: string;
  gender: '男' | '女';
  avatarId: number;
  fromCity: string;
  position: string;
  ability: number;
  loyalty: number;
  integrity: number;
  experience: number;
  faction: 'reform' | 'pragmatic' | 'neutral';
  subLevel: number;
}

export function generateExchangeOfficer(): ExchangeOfficer {
  const gender: '男' | '女' = Math.random() < 0.6 ? '男' : '女';
  const names = gender === '男' ? EXCHANGE_NAMES_M : EXCHANGE_NAMES_F;
  const factions: ('reform' | 'pragmatic' | 'neutral')[] = ['reform', 'pragmatic', 'neutral'];
  return {
    name:       names[Math.floor(Math.random() * names.length)],
    gender,
    avatarId:   Math.floor(Math.random() * 8),
    fromCity:   EXCHANGE_CITIES[Math.floor(Math.random() * EXCHANGE_CITIES.length)],
    position:   ['县委常委', '市局副局长', '乡镇党委书记', '市直机关科长', '县政府办副主任'][Math.floor(Math.random() * 5)],
    ability:    50 + Math.floor(Math.random() * 30),
    loyalty:    40 + Math.floor(Math.random() * 30),
    integrity:  50 + Math.floor(Math.random() * 30),
    experience: 40 + Math.floor(Math.random() * 40),
    faction:    factions[Math.floor(Math.random() * 3)],
    subLevel:   3 + Math.floor(Math.random() * 4),
  };
}

export async function acceptExchangeOfficer(
  saveId: string, userId: string, officer: ExchangeOfficer
): Promise<boolean> {
  const { error } = await supabase.from('subordinates').insert({
    save_id:           saveId,
    user_id:           userId,
    name:              officer.name,
    position:          officer.position,
    role:              officer.position,
    avatar_id:         officer.avatarId,
    gender:            officer.gender,
    ability:           officer.ability,
    loyalty:           officer.loyalty,
    integrity:         officer.integrity,
    experience:        officer.experience,
    faction:           officer.faction,
    sub_level:         officer.subLevel,
    is_appointed:      false,
    appointed_role:    null,
    appointed_dept:    null,
    dept_position:     'head',
    transferred_city:  null,
    last_assessed_day: 0,
  });
  return !error;
}

// =====================================================================
// ★ 领导班子系统
// =====================================================================

// 随机名字池（扩充至50+姓、60+男名、50+女名，大批量生成时重复率极低）
const _NPC_SURNAMES = [
  '王', '李', '张', '刘', '陈', '赵', '孙', '周', '吴', '郑',
  '冯', '许', '韩', '唐', '曹', '邓', '杨', '胡', '徐', '朱',
  '何', '林', '黄', '罗', '高', '梁', '宋', '谢', '江', '方',
  '苏', '章', '潘', '丁', '史', '余', '白', '薛', '蒋', '范',
  '傅', '谭', '贾', '叶', '秦', '尹', '孔', '翟', '龚', '魏',
];
const _NPC_GIVEN_M  = [
  '建国', '志远', '国华', '宏伟', '一凡', '明远', '国强', '兴华', '书平', '德胜',
  '正阳', '向阳', '克强', '永康', '家旺', '仁义', '文博', '建平', '志刚', '宏图',
  '天明', '长远', '国政', '利民', '振华', '光明', '鸿志', '建军', '学民', '伟业',
  '保国', '兴邦', '顺德', '泽民', '大为', '国平', '德志', '永强', '定远', '安邦',
  '山河', '坚毅', '浩然', '博远', '启明', '进贤', '治国', '敬民', '守志', '廉洁',
  '壮志', '凌云', '振远', '庆丰', '荣华', '泰安', '继文', '立志', '铭远', '砺志',
];
const _NPC_GIVEN_F  = [
  '玉兰', '秀英', '丽华', '晓燕', '爱莲', '雪梅', '淑芳', '慧敏', '建华', '玲玲',
  '秋菊', '美玲', '惠珍', '雅芳', '青梅', '清华', '晓红', '国珍', '艳华', '凤英',
  '书贤', '玉珍', '静文', '晓月', '燕妮', '秋霞', '慧英', '彩云', '晶晶', '桂芳',
  '雪莲', '梅英', '惠兰', '芳洁', '玉霞', '书慧', '丽敏', '文静', '思远', '锦绣',
  '明慧', '若萱', '佳雯', '彩霞', '云霞', '文惠', '晓慧', '思敏', '慧珍', '雅琴',
];

/**
 * 生成不重复的NPC姓名。
 * @param gender  '男' | '女' | 其他
 * @param usedNames 已使用名字集合（就地追加，跨调用共享同一个Set即可实现去重）
 * @param maxRetry 最大重试次数（超出后允许重复，防止死循环）
 */
function _randNpcName(gender: string, usedNames?: Set<string>, maxRetry = 80): string {
  const g_pool = gender === '女' ? _NPC_GIVEN_F : _NPC_GIVEN_M;
  let name = '';
  for (let i = 0; i < maxRetry; i++) {
    const s = _NPC_SURNAMES[Math.floor(Math.random() * _NPC_SURNAMES.length)];
    const g = g_pool[Math.floor(Math.random() * g_pool.length)];
    name = s + g;
    if (!usedNames || !usedNames.has(name)) break;
  }
  if (usedNames) usedNames.add(name);
  return name;
}

// 真实县级行政区（供仕途历程中随机选取）
const _REAL_COUNTIES: Record<string, string[]> = {
  '京都市':   ['密云区', '延庆区', '怀柔区', '平谷区', '顺义区', '昌平区'],
  '津门市':   ['蓟州区', '宝坻区', '武清区', '静海区', '宁河区', '滨海新区'],
  '冀州省':   ['滦南县', '迁安市', '武强县', '饶阳县', '枣强县', '清苑区', '定州市', '任丘市', '雄县', '涿州市'],
  '晋阳省':   ['祁水县', '平遥县', '介休市', '高平市', '长子县', '浮山县', '翼城县', '曲沃县'],
  '漠北自治区': ['科尔沁右翼前旗', '察哈尔右翼前旗', '托克托县', '和林格尔县', '清水河县'],
  '辽东省':   ['海州市', '台安县', '岫岩满族自治县', '凌海市', '北镇市', '庄河市', '瓦州市'],
  '吉阳省':   ['梅江市', '集安市', '辉南县', '柳河县', '东丰县', '双辽市', '公主岭市'],
  '乌龙江省': ['肇阳市', '肇州县', '肇源县', '绥棱县', '明水县', '青冈县', '兰西县', '依安县'],
  '沪海市':   ['金山区', '奉贤区', '崇明区', '松江区', '青浦区', '嘉定区'],
  '汉东省':   ['澄江市', '海滨市', '启云市', '通州区', '丹台市', '句云市', '溧水市', '宜泉市', '金淮县', '盱源县'],
  '瓯越省':   ['桐岭县', '建溪市', '淳湖县', '慈江市', '余湖市', '平泽市', '海盐县', '龙越县', '江岭市', '温海市'],
  '皖淮省':   ['天长市', '明岭市', '全椒县', '来江县', '定远县', '凤阳县', '界河市', '太和县', '颍上县', '阜南县'],
  '闽南省':   ['永泰市', '沙溪区', '尤水县', '将乐县', '建阳市', '汀州县', '连川县', '武平县', '南靖县'],
  '洪都省':   ['宁水县', '于江县', '兴盛县', '赣县区', '信江县', '大余县', '上游县', '崇义县', '安源县', '进贤县'],
  '齐鲁省':   ['诸山市', '安岭市', '高洲市', '昌盛市', '邹颜市', '阙里市', '泗水县', '微山县', '滕州市', '招金市'],
  '中原省':   ['新郑市', '荥泽市', '巩洛市', '新密市', '嵩阳市', '长岗市', '项阳市', '沈丘县', '郸城县', '太康县'],
  '楚北省':   ['钟阳市', '京岳市', '沙江县', '公安县', '监洲市', '石津市', '赤江市', '咸安区', '嘉鱼县', '通城县'],
  '楚南省':   ['浏江市', '宁静市', '醴泉市', '攸水县', '茶山县', '炎帝县', '汨江市', '平溪县', '巴陵县', '容湖县'],
  '粤海省':   ['增华区', '从化区', '花都区', '博阳县', '惠泉县', '龙华县', '高明区', '四河市', '德江县', '封开县'],
  '南桂壮族自治区': ['横县', '宾阳县', '上林县', '隆安县', '马山县', '武鸣区', '鹿寨县', '融安县', '融水苗族自治县'],
  '琼岛省':   ['定安县', '屯昌县', '澄迈县', '临高县', '乐东黎族自治县', '东方市', '昌江黎族自治县'],
  '渝江市':   ['江津区', '合江区', '永川区', '南川区', '綦江区', '大足区', '荣昌区', '铜梁区', '潼南区', '梁平区'],
  '蜀州省':   ['简城市', '金堂县', '大邑县', '蒲江县', '新津区', '仁水县', '彭山区', '青神县', '丹棱县', '东坡区'],
  '黔贵省':   ['息烽县', '修文县', '开阳县', '清镇市', '遵义县', '桐梓县', '绥阳县', '正安县', '道真仡佬族苗族自治县'],
  '滇南省':   ['宜良县', '石林彝族自治县', '嵩明县', '禄劝彝族苗族自治县', '寻甸回族彝族自治县', '安宁市', '呈贡区'],
  '藏羌自治区': ['达孜区', '墨竹工卡县', '堆龙德庆区', '曲水县', '尼木县', '当雄县'],
  '秦陕省':   ['三原县', '泾阳县', '礼泉县', '乾州县', '兴平市', '武功县', '扶风县', '眉县', '岐山县', '凤翔区'],
  '陇西省':   ['永登县', '皋兰县', '榆中县', '秦州区', '麦积区', '清水县', '秦安县', '甘谷县', '武山县'],
  '青湖省':   ['湟中区', '湟源县', '大通回族土族自治县', '平安区', '民和回族土族自治县', '乐都区'],
  '宁川回族自治区': ['永宁县', '贺兰县', '灵武市', '平罗县', '惠农区', '利通区', '青铜峡市'],
  '西域维吾尔自治区': ['迪化区', '安宁城区', '西域县', '呼壁县', '玛纳县', '沙州市', '奇台县'],
};

// 随机镇名前缀（符合现实）
const _TOWN_PREFIXES = [
  '清河', '兴华', '龙泉', '南湖', '北溪', '桃源', '柳林', '石桥', '金沙', '铜山',
  '梅岭', '凤凰', '荷花', '莲湖', '白云', '青山', '新兴', '永安', '兴隆', '平原',
  '东风', '红星', '向阳', '太平', '广济', '福安', '长寿', '大同', '永丰', '富民',
  '天马', '玉泉', '惠民', '安平', '通达', '望江', '临江', '泉山', '宝兴', '瑞云',
];

/** 随机生成一个镇名（格式：xx镇） */
function _randTownName(): string {
  return _TOWN_PREFIXES[Math.floor(Math.random() * _TOWN_PREFIXES.length)] + '镇';
}

/** 随机取一个真实省份+城市 */
function _randRealProvCity(): { prov: string; city: string } {
  const prov = PROVINCE_LIST[Math.floor(Math.random() * PROVINCE_LIST.length)];
  const cities = PROVINCE_CITY_MAP[prov] ?? [];
  const city = cities.length > 0 ? cities[Math.floor(Math.random() * cities.length)] : '市辖区';
  return { prov, city };
}

/** 随机取一个真实县（或用城市下辖区替代） */
function _randRealCounty(prov: string): string {
  const counties = _REAL_COUNTIES[prov] ?? [];
  if (counties.length > 0) return counties[Math.floor(Math.random() * counties.length)];
  // 兜底：直接用省会城市名
  const cities = PROVINCE_CITY_MAP[prov] ?? [];
  return cities.length > 0 ? cities[Math.floor(Math.random() * cities.length)] : '某县';
}

// 各级科员/办事员起始职位
/**
 * ── 真实职务对照表（按入职层级分类）──
 *
 * 各级单位名称规范：
 *   镇级：综合办公室、党委办公室、经发办、农业农村服务中心、财政所、社事办、规建中心
 *   县级：发改委、财政局、民政局、人社局、农业农村局、自然资源局、住建局、卫健局、教育局、纪委、组织部
 *   市级：发改委、财政局、组织部……（同县，但叫"市发改委"等）
 *
 * 晋升路径（同一机构内先升职再换岗）：
 *   镇：科员 → 副主任/副所长 → 副镇长 → 镇长 → 镇党委书记
 *   县：科员 → 股长/副科长 → 副局长 → 局长 → 县委常委/副县长 → …
 */

// ── 镇级机构（无"局"，只有"办"/"所"/"中心"/"站"）──
const _TOWN_ORGS: Array<{ name: string; internalTitle: string; internalTitleDep: string }> = [
  { name: '镇政府综合办公室',     internalTitle: '副主任',   internalTitleDep: '主任' },
  { name: '镇党委办公室',         internalTitle: '副主任',   internalTitleDep: '主任' },
  { name: '镇经济发展办公室',     internalTitle: '副主任',   internalTitleDep: '主任' },
  { name: '镇社会事务办公室',     internalTitle: '副主任',   internalTitleDep: '主任' },
  { name: '镇农业农村服务中心',   internalTitle: '副主任',   internalTitleDep: '主任' },
  { name: '镇规划建设服务中心',   internalTitle: '副主任',   internalTitleDep: '主任' },
  { name: '镇财政所',             internalTitle: '副所长',   internalTitleDep: '所长' },
  { name: '镇文化站',             internalTitle: '副站长',   internalTitleDep: '站长' },
];

// ── 县级机构（有"局"/"委"/"部"）──
const _COUNTY_ORGS: Array<{ name: string; clerk: string; deputy: string; head: string }> = [
  { name: '县发展和改革委员会', clerk: '科员',   deputy: '副主任科员', head: '主任科员' },
  { name: '县财政局',           clerk: '科员',   deputy: '股长',       head: '副局长'  },
  { name: '县民政局',           clerk: '科员',   deputy: '股长',       head: '副局长'  },
  { name: '县人力资源和社会保障局', clerk: '科员', deputy: '股长',     head: '副局长'  },
  { name: '县农业农村局',       clerk: '科员',   deputy: '股长',       head: '副局长'  },
  { name: '县自然资源局',       clerk: '科员',   deputy: '股长',       head: '副局长'  },
  { name: '县住房和城乡建设局', clerk: '科员',   deputy: '股长',       head: '副局长'  },
  { name: '县卫生健康局',       clerk: '科员',   deputy: '股长',       head: '副局长'  },
  { name: '县教育局',           clerk: '科员',   deputy: '股长',       head: '副局长'  },
  { name: '县委组织部',         clerk: '干事',   deputy: '副主任科员', head: '主任科员' },
];

// ── 市级机构 ──
const _CITY_ORGS: Array<{ name: string; clerk: string; deputy: string; head: string }> = [
  { name: '市发展和改革委员会', clerk: '科员',   deputy: '副主任科员', head: '主任科员' },
  { name: '市财政局',           clerk: '科员',   deputy: '科长',       head: '副局长'  },
  { name: '市人力资源和社会保障局', clerk: '科员', deputy: '科长',     head: '副局长'  },
  { name: '市农业农村局',       clerk: '科员',   deputy: '科长',       head: '副局长'  },
  { name: '市国资委',           clerk: '科员',   deputy: '科长',       head: '副主任'  },
  { name: '市委组织部',         clerk: '干事',   deputy: '副主任科员', head: '主任科员' },
];

/**
 * 生成"科员+机构内晋升"的两条起步记录，并返回最终占用年数
 * startLevel: 'town' | 'county' | 'city'
 */
/**
 * 地理锚点：NPC 职业生涯的籍贯省/市
 * 低级别在本城市内流动，高级别才跨省
 */
interface GeoCtx {
  prov: string;
  city: string;
}

/** 在同省内随机换一个地级市（可排除当前城市） */
function _pickCityInProv(prov: string, excludeCity?: string): string {
  const cities = (PROVINCE_CITY_MAP[prov] ?? []).filter(c => c !== excludeCity);
  if (cities.length > 0) return cities[Math.floor(Math.random() * cities.length)];
  return PROVINCE_CITY_MAP[prov]?.[0] ?? '市辖区';
}

/**
 * 按地理锚点 + 晋升阶梯层级生成地名（真实地理跨度规则）：
 *  town / county (科员→县委书记)：90%同省同城，10%同省换城
 *  city (副市长→市委书记)：      80%同省换城，20%跨省
 *  prov (副省长→省长)：          70%同省，30%跨省
 *  national：联邦内阁
 */
function _buildLocWithCtx(
  locType: 'town' | 'county' | 'city' | 'prov' | 'national',
  geo: GeoCtx,
): string {
  if (locType === 'national') return '联邦内阁';

  if (locType === 'prov') {
    const prov = Math.random() < 0.7 ? geo.prov : _randRealProvCity().prov;
    return prov;
  }

  if (locType === 'city') {
    if (Math.random() < 0.8) {
      // 同省换地级市
      const newCity = _pickCityInProv(geo.prov, geo.city);
      return `${geo.prov}${newCity}`;
    }
    // 跨省（20%）
    const { prov, city } = _randRealProvCity();
    return `${prov}${city}`;
  }

  if (locType === 'county') {
    if (Math.random() < 0.9) {
      // 同省同城换县（90%）
      return `${geo.prov}${geo.city}${_randRealCounty(geo.prov)}`;
    }
    // 同省换城（10%）
    const newCity = _pickCityInProv(geo.prov, geo.city);
    return `${geo.prov}${newCity}${_randRealCounty(geo.prov)}`;
  }

  // town：同省同城内换镇
  return `${geo.prov}${geo.city}${_randTownName()}`;
}

function _buildClerkStart(
  startLevel: 'town' | 'county' | 'city',
  startYear: number,
  geo: GeoCtx,
): { entries: CareerEntry[]; endYear: number } {
  const entries: CareerEntry[] = [];
  let cur = startYear;

  if (startLevel === 'town') {
    const org = _TOWN_ORGS[Math.floor(Math.random() * _TOWN_ORGS.length)];
    const loc = _buildLocWithCtx('town', geo);
    entries.push({ yearStart: cur, yearEnd: cur + 2, position: `${org.name}科员`,           city: loc, rankLevel: 1 });
    cur += 2;
    entries.push({ yearStart: cur, yearEnd: cur + 2, position: `${org.name}${org.internalTitle}`, city: loc, rankLevel: 1 });
    cur += 2;
  } else if (startLevel === 'county') {
    const org  = _COUNTY_ORGS[Math.floor(Math.random() * _COUNTY_ORGS.length)];
    const loc  = _buildLocWithCtx('county', geo);
    entries.push({ yearStart: cur, yearEnd: cur + 2, position: `${org.name}${org.clerk}`, city: loc, rankLevel: 1 });
    cur += 2;
    const t2 = 2 + Math.floor(Math.random() * 2);
    entries.push({ yearStart: cur, yearEnd: cur + t2, position: `${org.name}${org.deputy}`, city: loc, rankLevel: 1 });
    cur += t2;
    if (Math.random() < 0.5) {
      const t3 = 2 + Math.floor(Math.random() * 2);
      entries.push({ yearStart: cur, yearEnd: cur + t3, position: `${org.name}${org.head}`, city: loc, rankLevel: 2 });
      cur += t3;
    }
  } else {
    const org  = _CITY_ORGS[Math.floor(Math.random() * _CITY_ORGS.length)];
    const loc  = _buildLocWithCtx('city', geo);
    entries.push({ yearStart: cur, yearEnd: cur + 2, position: `${org.name}${org.clerk}`, city: loc, rankLevel: 1 });
    cur += 2;
    const t2 = 2 + Math.floor(Math.random() * 2);
    entries.push({ yearStart: cur, yearEnd: cur + t2, position: `${org.name}${org.deputy}`, city: loc, rankLevel: 1 });
    cur += t2;
    if (Math.random() < 0.5) {
      const t3 = 2 + Math.floor(Math.random() * 2);
      entries.push({ yearStart: cur, yearEnd: cur + t3, position: `${org.name}${org.head}`, city: loc, rankLevel: 2 });
      cur += t3;
    }
  }
  return { entries, endYear: cur };
}

/**
 * 真实公务员晋升阶梯（科员/内部晋升之后的领导岗位，严格递增）
 * locType 决定地名层级
 */
const _CAREER_LADDER: Array<{
  positions: string[];
  locType: 'town' | 'county' | 'city' | 'prov' | 'national';
  tenureMin: number;
  tenureMax: number;
}> = [
  // step 0 — 副科级：副镇长（乡镇政府领导班子成员）
  { positions: ['副镇长', '镇党委委员', '镇肃宪院长'],                              locType: 'town',     tenureMin: 3, tenureMax: 4 },
  // step 1 — 正科级：镇长/镇党委副书记
  { positions: ['镇长', '镇党委副书记'],                                            locType: 'town',     tenureMin: 3, tenureMax: 5 },
  // step 2 — 正科高配：镇党委书记
  { positions: ['镇党委书记'],                                                      locType: 'town',     tenureMin: 3, tenureMax: 5 },
  // step 3 — 副处初：县委常委/县委办副主任（跨到县级）
  { positions: ['县委常委', '县委办副主任', '县纪委副书记'],                          locType: 'county',   tenureMin: 3, tenureMax: 4 },
  // step 4 — 副处：副县长/县肃宪院长
  { positions: ['副县长', '县肃宪院长', '县委组织部部长'],                            locType: 'county',   tenureMin: 3, tenureMax: 5 },
  // step 5 — 正处过渡：县委副书记/常务副县长
  { positions: ['县委副书记', '常务副县长'],                                         locType: 'county',   tenureMin: 3, tenureMax: 5 },
  // step 6 — 正处：县委书记/县长
  { positions: ['县委书记', '县长'],                                                 locType: 'county',   tenureMin: 3, tenureMax: 5 },
  // step 7 — 副厅：副市长/市委常委
  { positions: ['副市长', '市委常委', '市肃宪院长', '市委组织部部长'],                 locType: 'city',     tenureMin: 3, tenureMax: 5 },
  // step 8 — 副厅高配/正厅过渡：常务副市长/市委副书记
  { positions: ['常务副市长', '市委副书记'],                                         locType: 'city',     tenureMin: 3, tenureMax: 5 },
  // step 9 — 正厅：市长/市委书记
  { positions: ['市长', '市委书记'],                                                 locType: 'city',     tenureMin: 3, tenureMax: 5 },
  // step 10 — 副省：副省长/省执政委常委
  { positions: ['副省长', '省执政委常委', '省肃宪院长', '省执政委组织部部长'],                 locType: 'prov',     tenureMin: 3, tenureMax: 5 },
  // step 11 — 省部：省长/省执政委书记
  { positions: ['省长', '省执政委书记'],                                                 locType: 'prov',     tenureMin: 3, tenureMax: 5 },
  // step 12 — 副国：国务委员/副总理
  { positions: ['国务委员', '副总理'],                                               locType: 'national', tenureMin: 3, tenureMax: 5 },
];

/**
 * game rankLevel → _CAREER_LADDER 中当前职位对应的索引（history最多到此索引-1）
 * 高rankLevel NPC 从县级起步，低rankLevel从镇级起步
 */
const _RANK_TO_LADDER_STEP: Record<number, number> = {
  1:  0,   // 科员（无领导岗历史）
  2:  0,   // 副科：副镇长（阶梯step0是现职）
  3:  2,   // 正科：镇党委书记（history: step0副镇长, step1镇长）
  4:  3,   // 副处初：县委常委（history含镇级3步）
  5:  4,   // 副处：副县长
  6:  5,   // 正处过渡：县委副书记
  7:  6,   // 正处：县委书记
  8:  7,   // 副厅：副市长
  9:  9,   // 正厅：市长（history含step7-8）
  10: 10,  // 副省：副省长
  11: 11,  // 省部：省长
  12: 12,  // 副国：副总理
};

/** 根据rankLevel判断起步层级 */
function _clerkStartLevel(rankLevel: number): 'town' | 'county' | 'city' {
  if (rankLevel >= 9)  return 'city';
  if (rankLevel >= 5)  return 'county';
  return 'town';
}

/** 根据 locType 返回完整地名（无锚点兼容版，内部调用请优先用 _buildLocWithCtx） */
function _buildLocationByType(locType: 'town' | 'county' | 'city' | 'prov' | 'national'): string {
  if (locType === 'national') return '联邦内阁';
  const { prov, city } = _randRealProvCity();
  return _buildLocWithCtx(locType, { prov, city });
}

/**
 * 根据级别返回完整地名（兼容旧调用）
 */
function _buildLocation(rankLevel: number): string {
  if (rankLevel >= 12) return '联邦内阁';
  const { prov, city } = _randRealProvCity();
  if (rankLevel >= 10) return _buildLocWithCtx('prov',    { prov, city });
  if (rankLevel >= 7)  return _buildLocWithCtx('city',    { prov, city });
  if (rankLevel >= 4)  return _buildLocWithCtx('county',  { prov, city });
  return _buildLocWithCtx('town', { prov, city });
}

/**
 * 从玩家 cityName（如"漠北自治区青城市清河镇"）中解析省/市锚点
 * 依次匹配 PROVINCE_LIST 中的省名前缀，再匹配城市
 */
function _extractGeoFromCityName(cityName: string): GeoCtx {
  for (const prov of PROVINCE_LIST) {
    if (cityName.startsWith(prov)) {
      const rest  = cityName.slice(prov.length);
      const cities = PROVINCE_CITY_MAP[prov] ?? [];
      const city  = cities.find(c => rest.startsWith(c)) ?? cities[0] ?? '';
      return { prov, city };
    }
  }
  return _randRealProvCity();
}

/**
 * 为NPC生成符合现实的仕途历程
 *
 * 地理规则：
 *  - homeGeo（早期）：优先用玩家籍贯省，代表"本省提拔体系"
 *  - 后期（最近2步）：向 playerCityName 所在省市靠拢，确保现职地点衔接自然
 *  - 若玩家未晋升（开局=籍贯地），则 homeGeo = playerGeo，整条仕途都在籍贯省
 *
 * playerCityName: 玩家当前 save.cityName
 * playerBirthGeo: 玩家籍贯省市（{ prov, city }），优先作为 NPC 早期历史锚点
 */
function _genNpcCareerHistory(rankLevel: number, age: number, playerCityName?: string, playerBirthGeo?: GeoCtx): CareerEntry[] {
  const workStartYear = 2025 - age + 22;
  const startLevel = _clerkStartLevel(rankLevel);
  const currentLadderStep = _RANK_TO_LADDER_STEP[rankLevel] ?? Math.min(rankLevel, _CAREER_LADDER.length);

  // 玩家所在地锚点（现职归宿）
  const playerGeo: GeoCtx = playerCityName
    ? _extractGeoFromCityName(playerCityName)
    : (playerBirthGeo ?? _randRealProvCity());

  // NPC 早期历史锚点：优先用玩家籍贯省，次选玩家当前城市，最后随机
  // 这样开局时（cityName = 籍贯镇），NPC 整条仕途都在籍贯省内
  const homeGeo: GeoCtx = playerBirthGeo ?? playerGeo;

  // 科员+内部晋升起步（用籍贯地）
  const { entries, endYear } = _buildClerkStart(startLevel, workStartYear, homeGeo);
  let curYear = endYear;

  // 领导岗历史阶梯
  const ladderHistory = _CAREER_LADDER.slice(0, currentLadderStep);

  // 年龄约束（留3年给现职）
  const availableYears = age - 22 - (curYear - workStartYear) - 3;
  const selectedSteps: typeof ladderHistory = [];
  let usedYears = 0;
  for (const step of ladderHistory) {
    const est = step.tenureMin;
    if (usedYears + est <= availableYears) {
      selectedSteps.push(step);
      usedYears += est + 1;
    }
  }

  // 最多展示最近5步领导岗
  const stepsToShow = selectedSteps.slice(-5);
  const total = stepsToShow.length;

  for (let i = 0; i < total; i++) {
    const step = stepsToShow[i];
    const tenure = step.tenureMin + Math.floor(Math.random() * (step.tenureMax - step.tenureMin + 1));
    const pos    = step.positions[Math.floor(Math.random() * step.positions.length)];

    // 地点策略：
    //   前半段 → 籍贯省（homeGeo）
    //   最近2步 → 玩家当前所在省市（playerGeo），自然过渡到现职
    let geoForStep: GeoCtx;
    if (total <= 2 || i >= total - 2) {
      geoForStep = (step.locType === 'city' || step.locType === 'prov' || step.locType === 'national')
        ? playerGeo
        : { prov: playerGeo.prov, city: playerGeo.city };
    } else {
      geoForStep = homeGeo;
    }

    const loc = _buildLocWithCtx(step.locType, geoForStep);
    entries.push({ yearStart: curYear, yearEnd: curYear + tenure, position: pos, city: loc, rankLevel });
    curYear += tenure;
  }

  return entries;
}

/** 履新时初始化NPC领导班子（清除旧班子，重新生成本层级NPC） */
export async function initLeadershipBand(
  saveId: string,
  rankLevel: number,
  playerName: string,
  playerPosition: string,
  playerBio?: { province: string; city: string; universityName: string },
  playerCityName?: string,
): Promise<void> {
  // 先清除已有班子（直接删除再重建）
  await supabase.from('npc_band').delete().eq('save_id', saveId);

  const partyPositions = BAND_POSITIONS[rankLevel] ?? BAND_POSITIONS[Math.min(15, Math.max(1, rankLevel))];
  const govPositions   = GOVT_POSITIONS[rankLevel] ?? GOVT_POSITIONS[Math.min(15, Math.max(1, rankLevel))];
  const ndaPositions   = NDA_POSITIONS[rankLevel] ?? NDA_POSITIONS[Math.min(15, Math.max(1, rankLevel))];
  if (!partyPositions) return;

  const [ageMin, ageMax] = NPC_AGE_RANGE[rankLevel] ?? [40, 58];
  const factions: Array<'reform' | 'pragmatic' | 'neutral'> = ['reform', 'pragmatic', 'neutral'];
  const playerBirthGeo: GeoCtx | undefined = (playerBio?.province && playerBio?.city)
    ? { prov: playerBio.province, city: playerBio.city }
    : undefined;

  // 本轮次已用名字集合，防止班子成员重名
  const _bandUsedNames = new Set<string>();

  /** 生成一个 NPC 行（含完整档案） */
  const buildNpcRow = (
    pos: { key: string; label: string; isPlayerRole?: boolean },
    group: 'party' | 'gov' | 'nda',
    isPlayer: boolean,
  ) => {
    if (isPlayer) {
      const birthYear = 2025 - 22 - Math.floor(Math.random() * 15); // 粗略
      return {
        save_id:         saveId,
        position_key:    pos.key,
        position_label:  playerPosition || pos.label,
        rank_level:      rankLevel,
        name:            playerName,
        gender:          '男',
        age:             0,
        faction:         'neutral' as const,
        ability:         80,
        loyalty:         100,
        integrity:       80,
        career_history:  [],
        is_retired:      false,
        retire_game_day: null,
        birth_province:  playerBio?.province ?? '',
        birth_city:      playerBio?.city ?? '',
        university_name: playerBio?.universityName ?? '',
        graduation_year: 0,
        birth_year:      birthYear,
        band_group:      group,
      };
    }
    // NPC层级：政府/联邦国会班子职级略低于党委（现实中党大于政）
    const npcRankAdj = group === 'party' ? rankLevel : Math.max(1, rankLevel - 1);
    const [nm, nx] = NPC_AGE_RANGE[npcRankAdj] ?? [40, 58];
    const gender = Math.random() < 0.25 ? '女' : '男';
    const age = nm + Math.floor(Math.random() * (nx - nm + 1));
    const faction = factions[Math.floor(Math.random() * factions.length)];
    const ability = 45 + Math.floor(Math.random() * 45);
    const careerHistory = _genNpcCareerHistory(npcRankAdj, age, playerCityName, playerBirthGeo);

    const { province: npcProvince, city: npcCity } = randBirthPlace();
    const tier = npcSchoolTier(npcRankAdj);
    const uniName = pickUniversityName(tier, npcProvince);
    const degreeLabel = npcDegreeLabel(tier, npcRankAdj);
    const studyYears = degreeLabel === '博士' ? 9 : degreeLabel === '硕士' ? 6 : 4;
    const birthYear = 2025 - age;
    const gradYear = birthYear + 18 + studyYears;

    let loyaltyBase = 35 + Math.floor(Math.random() * 36);
    if (playerBio) {
      if (npcCity === playerBio.city) loyaltyBase = Math.min(100, loyaltyBase + 12);
      else if (npcProvince === playerBio.province) loyaltyBase = Math.min(100, loyaltyBase + 7);
      if (uniName === playerBio.universityName) loyaltyBase = Math.min(100, loyaltyBase + 10);
    }
    const integrity = 40 + Math.floor(Math.random() * 41);
    return {
      save_id:         saveId,
      position_key:    pos.key,
      position_label:  pos.label,
      rank_level:      npcRankAdj,
      name:            _randNpcName(gender, _bandUsedNames),
      gender,
      age,
      faction,
      ability,
      loyalty:         loyaltyBase,
      integrity,
      career_history:  careerHistory,
      is_retired:      false,
      retire_game_day: null,
      birth_province:  npcProvince,
      birth_city:      npcCity,
      university_name: `${uniName}（${degreeLabel}）`,
      graduation_year: gradYear,
      birth_year:      birthYear,
      band_group:      group,
    };
  };

  const rows = [
    ...partyPositions.map(pos => buildNpcRow(pos, 'party', !!pos.isPlayerRole)),
    ...(govPositions ?? []).map(pos => buildNpcRow(pos, 'gov', !!pos.isPlayerRole)),
    ...(ndaPositions ?? []).map(pos => buildNpcRow(pos, 'nda', !!pos.isPlayerRole)),
  ];

  await supabase.from('npc_band').insert(rows);

  // 同步初始化城市指标（如果还没有）
  const { data: existing } = await supabase.from('city_metrics').select('id').eq('save_id', saveId).maybeSingle();
  if (!existing) {
    await supabase.from('city_metrics').insert({
      save_id: saveId, gdp: 60, finance: 60, ecology: 60,
      stability: 60, education: 60, healthcare: 60,
      invest_bonus: 0, petition_reduction: 0, talent_pool: 0,
    });
  }
  // 同步初始化健康精力
  const { data: hExisting } = await supabase.from('player_health').select('id').eq('save_id', saveId).maybeSingle();
  if (!hExisting) {
    await supabase.from('player_health').insert({ save_id: saveId, health: 80, energy: 100 });
  }
}

/** 获取NPC领导班子成员列表 */
export async function getNpcBand(saveId: string): Promise<LeadershipBand[]> {
  const { data, error } = await supabase
    .from('npc_band')
    .select('*')
    .eq('save_id', saveId)
    .order('rank_level', { ascending: false });
  if (error || !data) return [];
  return data.map(r => ({
    id:            r.id as string,
    saveId:        r.save_id as string,
    positionKey:   r.position_key as string,
    positionLabel: r.position_label as string,
    rankLevel:     r.rank_level as number,
    name:          r.name as string,
    gender:        r.gender as string,
    age:           r.age as number,
    faction:       r.faction as 'reform' | 'pragmatic' | 'neutral',
    ability:       r.ability as number,
    loyalty:       r.loyalty as number,
    integrity:     r.integrity as number,
    careerHistory: (r.career_history as CareerEntry[]) ?? [],
    isRetired:     r.is_retired as boolean,
    retireGameDay: r.retire_game_day as number | null,
    birthProvince: (r.birth_province as string) ?? '',
    birthCity:     (r.birth_city as string) ?? '',
    universityName:(r.university_name as string) ?? '',
    graduationYear:(r.graduation_year as number) ?? 0,
    birthYear:     (r.birth_year as number) ?? 0,
    bandGroup:     ((r.band_group as string) ?? 'party') as 'party' | 'gov' | 'nda',
  }));
}

/** NPC年龄老化（每游戏年调用一次），含NPC破格晋升逻辑 */
export async function agingLeadershipBand(saveId: string, currentGameDay: number, rankLevel: number, playerCityName?: string, playerBirthProvince?: string, playerBirthCity?: string): Promise<string[]> {
  const members = await getNpcBand(saveId);
  const retiredNames: string[] = [];
  // 收集空缺职位标签（退休/落马后，优先通知玩家填补）
  const vacancyPositions: string[] = [];
  // 收集已有名字，防止新生成继任者与现有成员重名
  const _agingUsedNames = new Set<string>(members.filter(m => !m.isRetired).map(m => m.name));
  for (const m of members) {
    if (m.isRetired || m.age === 0) continue; // 玩家占位跳过
    const newAge = m.age + 1;
    const retireAge = RETIREMENT_AGE_MAP[rankLevel] ?? 60;
    if (newAge >= retireAge) {
      // 触发退休，生成替换NPC
      await supabase.from('npc_band').update({ is_retired: true, retire_game_day: currentGameDay }).eq('id', m.id);
      _agingUsedNames.delete(m.name); // 退休后腾出名字位
      retiredNames.push(m.name);
      vacancyPositions.push(m.positionLabel);
      // 生成继任者
      const [ageMin] = NPC_AGE_RANGE[Math.max(1, rankLevel - 1)] ?? [35, 45];
      const gender = Math.random() < 0.25 ? '女' : '男';
      const newAge2 = ageMin + Math.floor(Math.random() * 8);
      const factions: Array<'reform' | 'pragmatic' | 'neutral'> = ['reform', 'pragmatic', 'neutral'];
      await supabase.from('npc_band').insert({
        save_id:        saveId,
        position_key:   m.positionKey,
        position_label: m.positionLabel,
        rank_level:     m.rankLevel,
        name:           _randNpcName(gender, _agingUsedNames),
        gender,
        age:            newAge2,
        faction:        factions[Math.floor(Math.random() * factions.length)],
        ability:        50 + Math.floor(Math.random() * 40),
        loyalty:        40 + Math.floor(Math.random() * 31),
        integrity:      40 + Math.floor(Math.random() * 41),
        career_history: _genNpcCareerHistory(rankLevel, newAge2, playerCityName,
          (playerBirthProvince && playerBirthCity) ? { prov: playerBirthProvince, city: playerBirthCity } : undefined),
      });
    } else {
      // ── NPC腐败落马机制：廉洁度低时有概率被查处，职位由下级顶上 ──
      // 条件：integrity < 30 + 8%概率（最低科员rank1不触发）
      if (m.integrity < 30 && m.rankLevel > 1 && Math.random() < 0.08) {
        await supabase.from('npc_band').update({ is_retired: true, retire_game_day: currentGameDay }).eq('id', m.id);
        _agingUsedNames.delete(m.name);
        retiredNames.push(`${m.name}（落马）`);
        vacancyPositions.push(`${m.positionLabel}（原任落马，空缺待补）`);
        // 继任者来自低一级（从底层科员逐步顶上）
        const successorRank = Math.max(1, m.rankLevel - 1);
        const [succAgeMin] = NPC_AGE_RANGE[successorRank] ?? [28, 40];
        const succGender = Math.random() < 0.25 ? '女' : '男';
        const succAge = succAgeMin + Math.floor(Math.random() * 6);
        const factions: Array<'reform' | 'pragmatic' | 'neutral'> = ['reform', 'pragmatic', 'neutral'];
        await supabase.from('npc_band').insert({
          save_id:        saveId,
          position_key:   m.positionKey,
          position_label: m.positionLabel,
          rank_level:     m.rankLevel, // 顶上后升到同级
          name:           _randNpcName(succGender, _agingUsedNames),
          gender:         succGender,
          age:            succAge,
          faction:        factions[Math.floor(Math.random() * factions.length)],
          ability:        50 + Math.floor(Math.random() * 35),
          loyalty:        50 + Math.floor(Math.random() * 30), // 继任者初始忠诚较高
          integrity:      55 + Math.floor(Math.random() * 35), // 继任者廉洁度较高（反腐后提拔）
          career_history: _genNpcCareerHistory(m.rankLevel, succAge, playerCityName,
            (playerBirthProvince && playerBirthCity) ? { prov: playerBirthProvince, city: playerBirthCity } : undefined),
        });
      } else {
        // NPC破格晋升：模拟5年任期，age%5==2 时处于第3年
        // 条件：任期第3年 + 能力>=60 + 10%概率 + 职级未达顶（<13）
        const inThirdYear = (m.age % 5) === 2;
        const canExceptionalPromo = inThirdYear && m.ability >= 60 && m.rankLevel < 13 && Math.random() < 0.1;
        if (canExceptionalPromo) {
          const newRank = m.rankLevel + 1;
          await supabase.from('npc_band').update({ age: newAge, rank_level: newRank }).eq('id', m.id);
          // NPC晋升 rank>=9 时：按派系随机占据一个省份的版图
          if (newRank >= 9 && m.faction && m.faction !== 'neutral') {
            const { data: saveRow } = await supabase
              .from('player_saves')
              .select('faction_province_map')
              .eq('id', saveId)
              .single();
            if (saveRow) {
              const curMap = (saveRow.faction_province_map as Record<string, string>) ?? {};
              const ALL_PROVINCES = ['京','津','沪','渝','冀','豫','云','辽','黑','湘','皖','鲁','新','苏','浙','赣','鄂','桂','甘','晋','蒙','陕','吉','闽','贵','粤','川','青','琼','宁','藏'];
              // 找未被该派系控制的省份中随机选一个
              const notOwned = ALL_PROVINCES.filter(p => curMap[p] !== m.faction);
              if (notOwned.length > 0) {
                const target = notOwned[Math.floor(Math.random() * notOwned.length)];
                await supabase.from('player_saves').update({
                  faction_province_map: { ...curMap, [target]: m.faction },
                }).eq('id', saveId);
              }
            }
          }
        } else {
          await supabase.from('npc_band').update({ age: newAge }).eq('id', m.id);
        }
      }
    }
  }
  // ── 将空缺通知写入存档（玩家可在home看到）──
  if (vacancyPositions.length > 0) {
    const { data: saveRow } = await supabase
      .from('player_saves')
      .select('npc_vacancy_notices')
      .eq('id', saveId)
      .single();
    const existing: string[] = (saveRow?.npc_vacancy_notices as string[]) ?? [];
    await supabase.from('player_saves').update({
      npc_vacancy_notices: [...existing, ...vacancyPositions].slice(-10), // 最多保留最近10条
    }).eq('id', saveId);
  }
  return retiredNames;
}

/** 记录玩家仕途历史（晋升时调用） */
export async function recordPlayerCareer(saveId: string, position: string, city: string, rankLevel: number, startGameDay: number, endGameDay: number | null, startYear: number, endYear: number | null, livelihoodScore = 0): Promise<void> {
  await supabase.from('player_career_history').insert({
    save_id: saveId, position, city, rank_level: rankLevel,
    start_game_day: startGameDay, end_game_day: endGameDay,
    start_year: startYear, end_year: endYear,
    livelihood_score: livelihoodScore,
  });
}

/** 获取玩家仕途历史 */
export async function getPlayerCareerHistory(saveId: string): Promise<{ position: string; city: string; rankLevel: number; startYear: number | null; endYear: number | null; livelihoodScore: number }[]> {
  const { data, error } = await supabase
    .from('player_career_history')
    .select('position, city, rank_level, start_year, end_year, livelihood_score')
    .eq('save_id', saveId)
    .order('start_game_day');
  if (error || !data) return [];
  return data.map(r => ({
    position:        r.position as string,
    city:            r.city as string,
    rankLevel:       r.rank_level as number,
    startYear:       r.start_year as number | null,
    endYear:         r.end_year as number | null,
    livelihoodScore: (r.livelihood_score as number) ?? 0,
  }));
}

/** 生成每月相亲NPC（5个，性别与玩家相反） */
export function generateBlindDateNpcs(playerGender: '男' | '女'): import('../types/game').BlindDateNpc[] {
  const oppositeGender: '男' | '女' = playerGender === '男' ? '女' : '男';
  const jobs = oppositeGender === '女'
    ? ['教师', '护士', '财务', '行政', '设计师', '医生', '记者', '工程师', '律师', '翻译']
    : ['工程师', '医生', '律师', '教师', '警官', '公务员', '创业者', '经理', '会计', '程序员'];
  const usedNames = new Set<string>();
  return Array.from({ length: 5 }, (_, i) => {
    const favor = 50 + Math.floor(Math.random() * 41); // 50-90
    const age = 22 + Math.floor(Math.random() * 13);   // 22-34
    return {
      id: `bd_${Date.now()}_${i}`,
      name: _randNpcName(oppositeGender, usedNames),
      gender: oppositeGender,
      age,
      job: jobs[Math.floor(Math.random() * jobs.length)],
      favor,
      introduced: false,
    };
  });
}

// =====================================================================
// ★ 健康/精力系统
// =====================================================================

export async function getPlayerHealth(saveId: string): Promise<PlayerHealth | null> {
  const { data, error } = await supabase.from('player_health').select('*').eq('save_id', saveId).maybeSingle();
  if (error || !data) return null;
  return {
    id:         data.id as string,
    saveId:     data.save_id as string,
    health:     data.health as number,
    energy:     data.energy as number,
    isOnLeave:  data.is_on_leave as boolean,
    leaveEndDay: data.leave_end_day as number | null,
    lastMonthlyCareDay: (data.last_monthly_care_day as number) ?? 0,
  };
}

export async function ensurePlayerHealth(saveId: string): Promise<PlayerHealth> {
  const existing = await getPlayerHealth(saveId);
  if (existing) return existing;
  await supabase.from('player_health').insert({ save_id: saveId, health: 80, energy: 100, last_monthly_care_day: 0 });
  return { id: '', saveId, health: 80, energy: 100, isOnLeave: false, leaveEndDay: null, lastMonthlyCareDay: 0 };
}

/** 消耗精力（高强度工作调用）。返回是否触发因病休假 */
export async function consumeEnergy(saveId: string, energyCost: number, healthCost: number, currentGameDay: number): Promise<{ forcedLeave: boolean }> {
  const ph = await ensurePlayerHealth(saveId);
  if (ph.isOnLeave) return { forcedLeave: true };

  let newEnergy = Math.max(0, ph.energy - energyCost);
  let newHealth = ph.health;
  // 精力耗尽时额外扣健康
  if (newEnergy === 0 && energyCost > 0) newHealth = Math.max(0, newHealth - healthCost);

  let forcedLeave = false;
  let isOnLeave: boolean = ph.isOnLeave;
  let leaveEndDay = ph.leaveEndDay;

  if (newHealth < 20 && !isOnLeave) {
    // 触发因病休假
    forcedLeave = true;
    isOnLeave = true;
    leaveEndDay = currentGameDay + 7;
    newHealth = 50; // 休假后回复
    newEnergy = 60;
  }

  await supabase.from('player_health').update({
    health: newHealth, energy: newEnergy,
    is_on_leave: isOnLeave, leave_end_day: leaveEndDay,
    updated_at: new Date().toISOString(),
  }).eq('save_id', saveId);

  return { forcedLeave };
}

/** 恢复健康/精力（休假/锻炼/疗养） */
export async function restoreHealth(saveId: string, type: 'rest' | 'exercise' | 'sanatorium', currentGameDay: number): Promise<boolean> {
  const ph = await ensurePlayerHealth(saveId);
  let newHealth = ph.health;
  let newEnergy = ph.energy;

  if (type === 'rest') {
    newHealth = Math.min(100, newHealth + 10);
    newEnergy = Math.min(100, newEnergy + 30);
  } else if (type === 'exercise') {
    newHealth = Math.min(100, newHealth + 5);
    newEnergy = Math.min(100, newEnergy + 10);
  } else if (type === 'sanatorium') {
    // 疗养：7游戏天，大幅恢复（仅厅级及以上可用）
    newHealth = Math.min(100, newHealth + 25);
    newEnergy = Math.min(100, newEnergy + 50);
  }

  // 检查休假是否结束
  let isOnLeave = ph.isOnLeave;
  if (isOnLeave && ph.leaveEndDay && currentGameDay >= ph.leaveEndDay) {
    isOnLeave = false;
  }

  const { error } = await supabase.from('player_health').update({
    health: newHealth, energy: newEnergy, is_on_leave: isOnLeave,
    updated_at: new Date().toISOString(),
  }).eq('save_id', saveId);
  return !error;
}

/** 每日自然恢复精力（每天基础+5，职级额外加成），游戏推进时调用 */
export async function dailyEnergyRegen(saveId: string, currentGameDay: number, rankLevel = 1, personalAssets: string[] = []): Promise<void> {
  const ph = await getPlayerHealth(saveId);
  if (!ph) return;

  // 基础恢复 + 职级加成
  const baseRegen = 5;
  const rankBonus = RANK_DAILY_ENERGY_BONUS[rankLevel] ?? 0;
  // 资产加成（精力/日）
  const assetBonus = personalAssets.reduce((acc, key) => acc + (ASSET_HEALTH_BONUS[key]?.energyBonusDaily ?? 0), 0);
  const totalRegen = baseRegen + rankBonus + Math.round(assetBonus);

  const newEnergy = Math.min(100, ph.energy + totalRegen);
  let isOnLeave = ph.isOnLeave;
  if (isOnLeave && ph.leaveEndDay && currentGameDay >= ph.leaveEndDay) {
    isOnLeave = false;
  }

  await supabase.from('player_health').update({
    energy: newEnergy, is_on_leave: isOnLeave,
    updated_at: new Date().toISOString(),
  }).eq('save_id', saveId);
}

/**
 * 月度医疗保健加成（每月结算一次）
 * 调用时机：月度结算 advanceMonth 中
 * 联动：职级医疗级别 + 已购资产加成 + 年龄衰减
 */
export async function monthlyHealthRegen(
  saveId: string,
  currentGameDay: number,
  rankLevel: number,
  personalAssets: string[],
  playerAge: number,
): Promise<{ healthAdded: number; reason: string }> {
  const ph = await getPlayerHealth(saveId);
  if (!ph) return { healthAdded: 0, reason: '健康数据不存在' };

  // 避免同月重复加成
  if (ph.lastMonthlyCareDay && currentGameDay - ph.lastMonthlyCareDay < 28) {
    return { healthAdded: 0, reason: '本月已结算' };
  }

  // 职级医疗基础加成
  const rankBase = RANK_MONTHLY_HEALTH_REGEN[rankLevel] ?? 1;
  // 资产健康加成
  const assetBonus = personalAssets.reduce((acc, key) => acc + (ASSET_HEALTH_BONUS[key]?.healthBonus ?? 0), 0);
  // 年龄衰减：每超过50岁减少1点/月（模拟随龄健康下滑）
  const agePenalty = Math.max(0, Math.floor((playerAge - 50) / 5));
  // 疲劳惩罚：若精力 < 30，健康额外衰减
  const fatiguePenalty = ph.energy < 30 ? 3 : ph.energy < 60 ? 1 : 0;

  const totalDelta = rankBase + assetBonus - agePenalty - fatiguePenalty;
  const newHealth = Math.max(0, Math.min(100, ph.health + totalDelta));

  await supabase.from('player_health').update({
    health: newHealth,
    last_monthly_care_day: currentGameDay,
    updated_at: new Date().toISOString(),
  }).eq('save_id', saveId);

  const parts: string[] = [];
  if (rankBase > 0) parts.push(`医疗保健+${rankBase}`);
  if (assetBonus > 0) parts.push(`资产加成+${assetBonus}`);
  if (agePenalty > 0) parts.push(`年龄衰减-${agePenalty}`);
  if (fatiguePenalty > 0) parts.push(`疲劳惩罚-${fatiguePenalty}`);
  return { healthAdded: totalDelta, reason: parts.join('，') };
}

// =====================================================================
// ★ 党校培训系统
// =====================================================================

/** 获取/确保本年度培训名额 */
export async function getPartySchoolQuota(saveId: string, gameYear: number, rankLevel: number): Promise<{ usedCount: number; quotaLimit: number }> {
  const quotaByRank = rankLevel <= 3 ? 2 : rankLevel <= 6 ? 3 : rankLevel <= 9 ? 4 : 5;
  const { data } = await supabase.from('party_school_quota')
    .select('used_count, quota_limit')
    .eq('save_id', saveId)
    .eq('game_year', gameYear)
    .maybeSingle();
  if (!data) {
    await supabase.from('party_school_quota').insert({
      save_id: saveId, game_year: gameYear, used_count: 0, quota_limit: quotaByRank,
    });
    return { usedCount: 0, quotaLimit: quotaByRank };
  }
  return { usedCount: data.used_count as number, quotaLimit: data.quota_limit as number };
}

/** 提交党校培训申请（扣除政绩由调用方 updateGameSave 完成） */
export async function trainAtPartySchool(
  saveId: string,
  trainLevel: PartySchoolLevel,
  targetType: 'player' | 'subordinate',
  targetId: string | null,
  targetName: string,
  currentGameDay: number,
  gameYear: number,
  rankLevel: number,
  currentMerit: number,
): Promise<{ success: boolean; msg: string; costMerit: number }> {
  const cfg = PARTY_SCHOOL_CONFIG[trainLevel];
  if (rankLevel < cfg.minRank) return { success: false, msg: `当前职级不满足${cfg.label}报名条件（最低${cfg.minRank}级）`, costMerit: 0 };

  const quota = await getPartySchoolQuota(saveId, gameYear, rankLevel);
  if (quota.usedCount >= quota.quotaLimit) return { success: false, msg: `本年度培训名额已用完（${quota.quotaLimit}个），请明年申报`, costMerit: 0 };
  if (currentMerit < cfg.costMerit) return { success: false, msg: `政绩不足（需${cfg.costMerit}点，当前${currentMerit}），请继续积累政绩`, costMerit: 0 };

  const endDay = currentGameDay + cfg.durationDays;
  const { error } = await supabase.from('party_school_records').insert({
    save_id: saveId, target_type: targetType, target_id: targetId,
    target_name: targetName, train_level: trainLevel,
    start_game_day: currentGameDay, end_game_day: endDay, is_complete: false,
    ability_bonus: cfg.abilityBonus, loyalty_bonus: cfg.loyaltyBonus,
    promote_bonus: cfg.promoteBonus,
    network_bonus: cfg.networkBonus,
    cert_name: cfg.certName,
  });
  if (error) return { success: false, msg: '培训申报失败，请重试', costMerit: 0 };

  // 扣名额
  await supabase.from('party_school_quota')
    .update({ used_count: quota.usedCount + 1 })
    .eq('save_id', saveId)
    .eq('game_year', gameYear);

  return { success: true, msg: `已成功报名${cfg.schoolName}${cfg.label}，培训期${cfg.durationDays}天`, costMerit: cfg.costMerit };
}

/** 检查并结算已完成的培训 */
export async function checkPartySchoolCompletion(saveId: string, currentGameDay: number): Promise<PartySchoolRecord[]> {
  const { data, error } = await supabase.from('party_school_records')
    .select('*')
    .eq('save_id', saveId)
    .eq('is_complete', false)
    .lte('end_game_day', currentGameDay);
  if (error || !data || data.length === 0) return [];

  const completed: PartySchoolRecord[] = [];
  for (const r of data) {
    await supabase.from('party_school_records').update({ is_complete: true }).eq('id', r.id as string);

    // 应用效果：调用 apply_training_bonus RPC 为下属增加能力/忠诚
    if (r.target_type === 'subordinate' && r.target_id) {
      await supabase.rpc('apply_training_bonus', {
        p_sub_id:  r.target_id as string,
        p_ability: r.ability_bonus as number,
        p_loyalty: r.loyalty_bonus as number,
      });
    }

    // 玩家本人完训：发放政绩奖励 + 廉洁加成 + 上司好感
    if (r.target_type === 'player') {
      const cfg = PARTY_SCHOOL_CONFIG[r.train_level as PartySchoolLevel];
      if (cfg) {
        const { data: saveRow } = await supabase.from('player_saves')
          .select('merit_points, moral_value, boss_favor')
          .eq('id', saveId).maybeSingle();
        if (saveRow) {
          await supabase.from('player_saves').update({
            merit_points: (saveRow.merit_points as number ?? 0) + cfg.meritReward,
            moral_value:  Math.min(100, (saveRow.moral_value as number ?? 80) + cfg.moralBonus),
            boss_favor:   Math.min(100, (saveRow.boss_favor as number ?? 60) + cfg.networkBonus),
          }).eq('id', saveId);
        }
      }
    }

    completed.push({
      id:           r.id as string,
      saveId:       r.save_id as string,
      targetType:   r.target_type as 'player' | 'subordinate',
      targetId:     r.target_id as string | null,
      targetName:   r.target_name as string,
      trainLevel:   r.train_level as PartySchoolLevel,
      startGameDay: r.start_game_day as number,
      endGameDay:   r.end_game_day as number,
      isComplete:   true,
      abilityBonus: r.ability_bonus as number,
      loyaltyBonus: r.loyalty_bonus as number,
      promoteBonus: r.promote_bonus as number,
      networkBonus: (r.network_bonus as number) ?? 0,
      certName:     (r.cert_name as string) ?? '',
    });
  }
  return completed;
}


/** 查询玩家（target_type=player）已完成的党校培训级别列表 */
export async function getPlayerPartySchoolCerts(saveId: string): Promise<PartySchoolLevel[]> {
  const { data, error } = await supabase.from('party_school_records')
    .select('train_level')
    .eq('save_id', saveId)
    .eq('target_type', 'player')
    .eq('is_complete', true);
  if (error || !data) return [];
  return data.map(r => r.train_level as PartySchoolLevel);
}

/** 获取培训记录 */
export async function getPartySchoolRecords(saveId: string): Promise<PartySchoolRecord[]> {
  const { data, error } = await supabase.from('party_school_records')
    .select('*')
    .eq('save_id', saveId)
    .order('created_at', { ascending: false })
    .limit(20);
  if (error || !data) return [];
  return data.map(r => ({
    id:           r.id as string,
    saveId:       r.save_id as string,
    targetType:   r.target_type as 'player' | 'subordinate',
    targetId:     r.target_id as string | null,
    targetName:   r.target_name as string,
    trainLevel:   r.train_level as PartySchoolLevel,
    startGameDay: r.start_game_day as number,
    endGameDay:   r.end_game_day as number,
    isComplete:   r.is_complete as boolean,
    abilityBonus: r.ability_bonus as number,
    loyaltyBonus: r.loyalty_bonus as number,
    promoteBonus: r.promote_bonus as number,
    networkBonus: (r.network_bonus as number) ?? 0,
    certName:     (r.cert_name as string) ?? '',
  }));
}

// =====================================================================
// ★ 国家重大政策运动
// =====================================================================

/** 随机触发政策运动（每年30%概率）：每年初调用 */
export async function tryTriggerNationalPolicy(saveId: string, currentGameDay: number): Promise<NationalPolicy | null> {
  // 检查是否已有进行中的运动
  const { data: active } = await supabase.from('national_policies')
    .select('id')
    .eq('save_id', saveId)
    .eq('is_active', true)
    .maybeSingle();
  if (active) return null;

  if (Math.random() > 0.30) return null; // 70%不触发

  const def = NATIONAL_POLICY_POOL[Math.floor(Math.random() * NATIONAL_POLICY_POOL.length)];
  const durationDays = def.durationDays + Math.floor(Math.random() * 30) - 15;

  const { data, error } = await supabase.from('national_policies').insert({
    save_id: saveId, policy_key: def.key, policy_name: def.name,
    start_game_day: currentGameDay, duration_days: durationDays,
    is_active: true, responded: false,
  }).select().maybeSingle();

  if (error || !data) return null;
  return {
    id:            data.id as string,
    saveId:        data.save_id as string,
    policyKey:     data.policy_key as string,
    policyName:    data.policy_name as string,
    startGameDay:  data.start_game_day as number,
    durationDays:  data.duration_days as number,
    isActive:      true,
    responded:     false,
  };
}

/** 获取当前进行中的政策运动 */
export async function getActiveNationalPolicy(saveId: string): Promise<NationalPolicy | null> {
  const { data, error } = await supabase.from('national_policies')
    .select('*')
    .eq('save_id', saveId)
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error || !data) return null;
  return {
    id: data.id as string, saveId: data.save_id as string,
    policyKey: data.policy_key as string, policyName: data.policy_name as string,
    startGameDay: data.start_game_day as number, durationDays: data.duration_days as number,
    isActive: data.is_active as boolean, responded: data.responded as boolean,
  };
}

/** 玩家响应政策运动，返回政绩加成 */
export async function respondToPolicy(saveId: string, policyId: string, currentGameDay: number): Promise<{ meritBonus: number; promoteBonus: number }> {
  const { data: p } = await supabase.from('national_policies').select('policy_key, responded').eq('id', policyId).maybeSingle();
  if (!p || (p.responded as boolean)) return { meritBonus: 0, promoteBonus: 0 };

  const def = NATIONAL_POLICY_POOL.find(d => d.key === (p.policy_key as string));
  if (!def) return { meritBonus: 0, promoteBonus: 0 };

  await supabase.from('national_policies').update({ responded: true }).eq('id', policyId);
  return { meritBonus: def.meritBonus, promoteBonus: def.promoteBonus };
}

/** 检查并结束已到期的政策运动 */
export async function checkPolicyExpiry(saveId: string, currentGameDay: number): Promise<void> {
  const { data } = await supabase.from('national_policies')
    .select('id, start_game_day, duration_days, responded')
    .eq('save_id', saveId)
    .eq('is_active', true);
  if (!data) return;
  for (const p of data) {
    const endDay = (p.start_game_day as number) + (p.duration_days as number);
    if (currentGameDay >= endDay) {
      await supabase.from('national_policies').update({ is_active: false }).eq('id', p.id as string);
    }
  }
}

// =====================================================================
// ★ 城市指标联动
// =====================================================================

export async function getCityMetrics(saveId: string): Promise<CityMetrics | null> {
  const { data, error } = await supabase.from('city_metrics').select('*').eq('save_id', saveId).maybeSingle();
  if (error || !data) return null;
  return {
    id:                 data.id as string,
    saveId:             data.save_id as string,
    gdp:                data.gdp as number,
    finance:            data.finance as number,
    ecology:            data.ecology as number,
    stability:          data.stability as number,
    education:          data.education as number,
    healthcare:         data.healthcare as number,
    investBonus:        data.invest_bonus as number,
    petitionReduction:  data.petition_reduction as number,
    talentPool:         data.talent_pool as number,
  };
}

/** 更新某项阳市指标，并自动重算联动值 */
export async function updateCityMetric(saveId: string, field: 'gdp' | 'finance' | 'ecology' | 'stability' | 'education' | 'healthcare', delta: number): Promise<CityMetrics | null> {
  const cur = await getCityMetrics(saveId);
  if (!cur) {
    await supabase.from('city_metrics').insert({ save_id: saveId, gdp: 60, finance: 60, ecology: 60, stability: 60, education: 60, healthcare: 60 });
    return null;
  }

  const updates: Record<string, number | string> = {};
  updates[field] = Math.max(0, Math.min(100, (cur[field] as number) + delta));

  // GDP→财政联动
  if (field === 'gdp') updates['finance'] = Math.min(100, cur.finance + Math.floor(delta * 0.5));
  // 环境→招商加成
  const newEcology = field === 'ecology' ? (updates['ecology'] as number) : cur.ecology;
  updates['invest_bonus'] = Math.floor(newEcology / 10) * 5;
  // 稳定→信访减少
  const newStability = field === 'stability' ? (updates['stability'] as number) : cur.stability;
  updates['petition_reduction'] = Math.floor(newStability / 10) * 10;
  // 教育→人才积累（缓慢增长）
  const newEdu = field === 'education' ? (updates['education'] as number) : cur.education;
  updates['talent_pool'] = Math.min(200, cur.talentPool + (newEdu > 70 ? 2 : 0));

  updates['updated_at'] = new Date().toISOString();
  const { data, error } = await supabase.from('city_metrics').update(updates).eq('save_id', saveId).select().maybeSingle();
  if (error || !data) return null;
  return {
    id: data.id as string, saveId: data.save_id as string,
    gdp: data.gdp as number, finance: data.finance as number,
    ecology: data.ecology as number, stability: data.stability as number,
    education: data.education as number, healthcare: data.healthcare as number,
    investBonus: data.invest_bonus as number,
    petitionReduction: data.petition_reduction as number,
    talentPool: data.talent_pool as number,
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// 下属管理新机制 API
// ══════════════════════════════════════════════════════════════════════════════

/** 启动干部考察（组织部审查流程），设置 nomination_status = reviewing */
export async function startNomination(
  subId: string,
  deptKey: DeptKey,
  position: 'head' | 'deputy',
  currentDay: number,
): Promise<boolean> {
  const { error } = await supabase
    .from('subordinates')
    .update({
      nomination_status: 'reviewing',
      nomination_dept: deptKey,
      nomination_position: position,
      nomination_start_day: currentDay,
    })
    .eq('id', subId);
  return !error;
}

/** 取消提名（撤回考察程序） */
export async function cancelNomination(subId: string): Promise<boolean> {
  const { error } = await supabase
    .from('subordinates')
    .update({
      nomination_status: 'idle',
      nomination_dept: null,
      nomination_position: null,
      nomination_start_day: null,
    })
    .eq('id', subId);
  return !error;
}

/**
 * 推进所有处于 reviewing 状态的提名：
 * - 正职考察期 5 天，副职 2 天
 * - 通过条件：ability >= 45 && integrity >= 40 && loyalty >= 30（随机扰动±10）
 * - 通过 → approved（调用 appointSubordinate），否则 rejected
 * 返回 { approved, rejected } 两组干部名称列表
 */
export async function processNominations(
  saveId: string,
  userId: string,
  currentDay: number,
  rankLevel: number,
): Promise<{ approved: string[]; rejected: string[] }> {
  const { data } = await supabase
    .from('subordinates')
    .select('*')
    .eq('save_id', saveId)
    .eq('nomination_status', 'reviewing');
  if (!data) return { approved: [], rejected: [] };

  const approved: string[] = [];
  const rejected: string[] = [];

  for (const row of data as Record<string, unknown>[]) {
    const sub = rowToSubordinate(row);
    const waitDays = currentDay - (sub.nominationStartDay ?? currentDay);
    const reqDays = sub.nominationPosition === 'head' ? 5 : 2;
    if (waitDays < reqDays) continue; // 未到期

    // 随机扰动（反映上级态度与派系博弈）
    const noise = Math.floor(Math.random() * 20) - 10;
    const pass = (sub.ability + noise) >= 45 && sub.integrity >= 38 && sub.loyalty >= 28;

    if (pass && sub.nominationDept && sub.nominationPosition) {
      // 正式任命
      await appointSubordinate(
        sub.id,
        `${sub.nominationDept}_${sub.nominationPosition}`,
        sub.nominationPosition === 'head'
          ? getDeptHeadTitle(sub.nominationDept, rankLevel)
          : getDeptDeputyTitle(sub.nominationDept, rankLevel),
        sub.nominationDept,
        sub.nominationPosition,
        rankLevel,
      );
      await supabase.from('subordinates').update({
        nomination_status: 'approved',
        nomination_dept: null,
        nomination_position: null,
        nomination_start_day: null,
        satisfaction: Math.min(100, sub.satisfaction + 10),
      }).eq('id', sub.id);
      // 自动补充科员
      await fillDeptStaff(saveId, userId, sub.nominationDept);
      approved.push(sub.name);
    } else {
      await supabase.from('subordinates').update({
        nomination_status: 'rejected',
        nomination_dept: null,
        nomination_position: null,
        nomination_start_day: null,
        satisfaction: Math.max(0, sub.satisfaction - 15),
      }).eq('id', sub.id);
      rejected.push(sub.name);
    }
  }
  // 将已通知的 rejected 重置为 idle（告知玩家后）
  return { approved, rejected };
}

/** 重置干部的 nominated rejected 状态为 idle */
export async function resetNominationRejected(subId: string): Promise<void> {
  await supabase.from('subordinates').update({ nomination_status: 'idle' }).eq('id', subId);
}

/** 设置/取消后备干部标记 */
export async function setReserveStatus(subId: string, isReserve: boolean): Promise<boolean> {
  const { error } = await supabase
    .from('subordinates')
    .update({ is_reserve: isReserve })
    .eq('id', subId);
  return !error;
}

/** 获取所有待处理事件的下属 */
export async function getSubsWithEvents(saveId: string): Promise<Subordinate[]> {
  const { data } = await supabase
    .from('subordinates')
    .select('*')
    .eq('save_id', saveId)
    .eq('event_handled', false)
    .order('event_day', { ascending: true });
  if (!data) return [];
  return (data as Record<string, unknown>[]).map(rowToSubordinate);
}

/**
 * 处理干部随机事件
 * @param action 'approve'|'reject'|'punish'|'protect'
 */
export async function handleSubEvent(
  subId: string,
  eventType: string,
  action: 'approve' | 'reject' | 'punish' | 'protect',
): Promise<{ abilityDelta: number; loyaltyDelta: number; integrityDelta: number; satisfactionDelta: number; meritDelta: number; feedback: string }> {
  const effectMap: Record<string, Record<string, { a: number; l: number; i: number; s: number; m: number; msg: string }>> = {
    transfer_request: {
      approve: { a: 0, l: 5, i: 0, s: 15, m: 0,  msg: '同意调动申请，干部满意度提升，调出后编制空缺' },
      reject:  { a: 0, l: -10, i: 0, s: -20, m: 0, msg: '驳回调动申请，干部满意度下降，有离心风险' },
    },
    corruption_risk: {
      punish:  { a: 0, l: -5, i: 10, s: -10, m: 5,  msg: '果断处置，廉洁风气好转，获得政绩加成' },
      protect: { a: 0, l: 10, i: -15, s: 5,  m: -8, msg: '包庇袒护，廉洁指数下降，存在政治风险' },
    },
    achievement: {
      approve: { a: 2, l: 5, i: 0, s: 10, m: 12, msg: '表彰立功干部，政绩显著提升，树立标杆效应' },
      reject:  { a: 0, l: -5, i: 0, s: -8, m: 0,  msg: '未予表彰，干部积极性受损' },
    },
    complaint: {
      punish:  { a: -2, l: -5, i: 0, s: -10, m: 2,  msg: '责令整改，平息群众矛盾，获得信访治理加成' },
      protect: { a: 0,  l: 5,  i: -5, s: 0,  m: -5, msg: '压制投诉，短期维稳，长期埋下隐患' },
    },
    borrow: {
      approve: { a: 3, l: 3, i: 0, s: 5, m: 8, msg: '同意借调，干部开阔视野，获得上级好感加成' },
      reject:  { a: 0, l: 0, i: 0, s: 0, m: -3, msg: '拒绝借调，上级部门关系略有影响' },
    },
  };

  const eff = effectMap[eventType]?.[action] ?? { a: 0, l: 0, i: 0, s: 0, m: 0, msg: '已处理' };

  const { data } = await supabase.from('subordinates')
    .select('ability, loyalty, integrity, satisfaction')
    .eq('id', subId).single();
  if (data) {
    const r = data as Record<string, unknown>;
    await supabase.from('subordinates').update({
      ability:      Math.max(0, Math.min(100, (r.ability as number) + eff.a)),
      loyalty:      Math.max(0, Math.min(100, (r.loyalty as number) + eff.l)),
      integrity:    Math.max(0, Math.min(100, (r.integrity as number) + eff.i)),
      satisfaction: Math.max(0, Math.min(100, (r.satisfaction as number) + eff.s)),
      event_handled: true,
      event_type:    null,
      event_day:     null,
      // 同意调动则立即转移
      ...(eventType === 'transfer_request' && action === 'approve'
        ? { transferred_city: '上级机关', is_appointed: false, appointed_role: null, appointed_dept: null }
        : {}),
      // 同意借调则标记
      ...(eventType === 'borrow' && action === 'approve'
        ? { borrowed_to: '上级机关' }
        : {}),
    }).eq('id', subId);
  }

  return { abilityDelta: eff.a, loyaltyDelta: eff.l, integrityDelta: eff.i, satisfactionDelta: eff.s, meritDelta: eff.m, feedback: eff.msg };
}

/**
 * 五维考核（德能勤绩廉）：
 * 产生随机扰动后记录快照，更新各指标，返回本次五维分数
 */
export async function conductFiveDimReview(
  subId: string,
  currentDay: number,
  grade: '优秀' | '称职' | '基本称职' | '不称职',
): Promise<{ de: number; neng: number; qin: number; ji: number; lian: number; total: number; meritGain: number }> {
  const gradeBase: Record<string, { base: number; merit: number }> = {
    '优秀':   { base: 85, merit: 15 },
    '称职':   { base: 70, merit: 8  },
    '基本称职': { base: 55, merit: 3 },
    '不称职': { base: 40, merit: 0  },
  };
  const g = gradeBase[grade] ?? gradeBase['称职'];
  const r = () => Math.floor(Math.random() * 15) - 7;
  const de   = Math.min(100, Math.max(0, g.base + r()));
  const neng = Math.min(100, Math.max(0, g.base + r()));
  const qin  = Math.min(100, Math.max(0, g.base + r()));
  const ji   = Math.min(100, Math.max(0, g.base + r()));
  const lian = Math.min(100, Math.max(0, g.base + r()));
  const total = Math.round((de + neng + qin + ji + lian) / 5);

  const scores = JSON.stringify({ de, neng, qin, ji, lian, grade, day: currentDay });
  // 指标映射：能→ability，廉→integrity，经→experience，忠诚轻微浮动
  const loyDelta = grade === '优秀' ? 4 : grade === '称职' ? 1 : grade === '基本称职' ? -2 : -6;
  const abiDelta = grade === '优秀' ? 3 : grade === '称职' ? 1 : grade === '基本称职' ? 0 : -3;
  const intDelta = grade === '优秀' ? 2 : grade === '称职' ? 0 : grade === '基本称职' ? -1 : -4;
  const expDelta = grade === '优秀' ? 8 : grade === '称职' ? 5 : grade === '基本称职' ? 2 : 0;

  const { data } = await supabase.from('subordinates').select('ability, loyalty, integrity, experience, satisfaction').eq('id', subId).single();
  if (data) {
    const row = data as Record<string, unknown>;
    const satDelta = grade === '优秀' ? 8 : grade === '称职' ? 2 : grade === '基本称职' ? -3 : -10;
    await supabase.from('subordinates').update({
      ability:           Math.max(0, Math.min(100, (row.ability as number) + abiDelta)),
      loyalty:           Math.max(0, Math.min(100, (row.loyalty as number) + loyDelta)),
      integrity:         Math.max(0, Math.min(100, (row.integrity as number) + intDelta)),
      experience:        Math.max(0, Math.min(100, (row.experience as number) + expDelta)),
      satisfaction:      Math.max(0, Math.min(100, (row.satisfaction as number) + satDelta)),
      last_assessed_day: currentDay,
      last_review_scores: scores,
    }).eq('id', subId);
  }

  return { de, neng, qin, ji, lian, total, meritGain: g.merit };
}

/**
 * 触发干部随机事件（游戏推进时调用，按概率生成）
 * 每个干部每365天最多触发一次事件
 */
export async function triggerSubEvents(saveId: string, currentDay: number): Promise<number> {
  const { data } = await supabase
    .from('subordinates')
    .select('id, ability, loyalty, integrity, sub_level, event_handled, event_day, last_assessed_day, is_appointed, borrowed_to, transferred_city')
    .eq('save_id', saveId)
    .is('transferred_city', null)
    .eq('event_handled', true);
  if (!data) return 0;

  let triggered = 0;
  const eventPool: import('@/types/game').SubEventType[] = ['transfer_request', 'corruption_risk', 'achievement', 'complaint', 'borrow'];

  for (const row of data as Record<string, unknown>[]) {
    const daysSinceEvent = currentDay - ((row.event_day as number) ?? 0);
    if (daysSinceEvent < 365) continue;
    if (Math.random() > 0.08) continue; // 8% 概率触发

    const ability    = (row.ability as number) ?? 50;
    const integrity  = (row.integrity as number) ?? 50;
    const loyalty    = (row.loyalty as number) ?? 50;
    const isAppointed = row.is_appointed as boolean;

    // 权重：廉洁低→更容易腐败风险；能力高→更易被借调；不满→调动请求
    let weights = [10, integrity < 50 ? 30 : 5, ability > 70 ? 25 : 5, 20, ability > 60 ? 20 : 5];
    if (!isAppointed) weights[0] += 20; // 没有职务更想走
    if (loyalty < 40)  weights[0] += 15;
    const total = weights.reduce((a, b) => a + b, 0);
    let rand = Math.random() * total;
    let idx = 0;
    for (let i = 0; i < weights.length; i++) {
      rand -= weights[i];
      if (rand <= 0) { idx = i; break; }
    }

    await supabase.from('subordinates').update({
      event_type:    eventPool[idx],
      event_day:     currentDay,
      event_handled: false,
    }).eq('id', row.id as string);
    triggered++;
  }
  return triggered;
}

/** 召回借调干部（需忠诚>65才可召回） */
export async function recallBorrowedSub(subId: string): Promise<boolean> {
  const { error } = await supabase.from('subordinates')
    .update({ borrowed_to: null }).eq('id', subId);
  return !error;
}

/**
 * 应急编制到期处理：
 * 将超过有效编制上限的科员（dept_position='staff'）标记为调走。
 * effectiveQuota = 每部门上限（perDeptLimit）
 * 每个部门最多保留 perDeptLimit 人，超出部分下月自动离岗。
 */
export async function expireEmergencyStaff(
  saveId: string,
  perDeptLimit: number,
): Promise<number> {
  // 获取所有在岗科员，按部门统计
  const { data: allStaff } = await supabase
    .from('subordinates')
    .select('id, appointed_dept, dept_position')
    .eq('save_id', saveId)
    .eq('is_appointed', true)
    .eq('dept_position', 'staff')
    .not('appointed_dept', 'is', null);

  if (!allStaff || allStaff.length === 0) return 0;

  // 按部门分组，超过 perDeptLimit 的科员标记为离岗
  const byDept: Record<string, string[]> = {};
  for (const r of allStaff as { id: string; appointed_dept: string; dept_position: string }[]) {
    if (!byDept[r.appointed_dept]) byDept[r.appointed_dept] = [];
    byDept[r.appointed_dept].push(r.id);
  }

  const toDispatch: string[] = [];
  for (const [, ids] of Object.entries(byDept)) {
    if (ids.length > perDeptLimit) {
      // 超出部分（尾部）标记离岗
      toDispatch.push(...ids.slice(perDeptLimit));
    }
  }

  if (toDispatch.length === 0) return 0;

  await supabase.from('subordinates')
    .update({
      is_appointed: false,
      transferred_city: '应急编制到期·自动离岗',
      appointed_dept: null,
      dept_position: null,
      appointed_role: null,
    })
    .in('id', toDispatch);

  return toDispatch.length;
}

// ─── NPC 代会换届自动执行 ──────────────────────────────────────────────────
/**
 * 每届（5年 = 1825天）届满时，NPC 班子自动完成代会换届。
 * - 检查 player_saves.last_congress_day，如果距今 ≥ 1825天则触发
 * - 重新生成整个 npc_band（完整换届），更新 last_congress_day
 * - 返回 true 表示发生了换届，false 表示未触发
 */
export async function npcTriggerCongressIfDue(
  saveId: string,
  userId: string,
  currentGameDay: number,
  rankLevel: number,
  playerName: string,
  playerPosition: string,
  lastCongressDay: number,
  playerCityName?: string,
  playerBirthProvince?: string,
  playerBirthCity?: string,
): Promise<boolean> {
  const CONGRESS_INTERVAL = 1825; // 5年
  if (currentGameDay - lastCongressDay < CONGRESS_INTERVAL) return false;

  // 触发换届：重建 npc_band（agingLeadershipBand 已处理逐个退休，这里做整届换届）
  await initLeadershipBand(saveId, rankLevel, playerName, playerPosition,
    (playerBirthProvince && playerBirthCity)
      ? { province: playerBirthProvince, city: playerBirthCity, universityName: '' }
      : undefined,
    playerCityName,
  );

  // 更新 last_congress_day
  await supabase.from('player_saves').update({ last_congress_day: currentGameDay }).eq('id', saveId);

  return true;
}

/**
 * 月度 NPC 干部自动任命：在换届期（last_congress_day 距今 ≥ 5年）到来前 90 天开始，
 * NPC 持续修订人事安排（对 npc_band 中退休/空缺职位补充继任）。
 * 这是对 agingLeadershipBand 的月度补充版本，处理非年度边界的补缺。
 */
export async function npcMonthlyCongressAppoint(
  saveId: string,
  currentGameDay: number,
  rankLevel: number,
  playerCityName?: string,
  playerBirthProvince?: string,
  playerBirthCity?: string,
): Promise<void> {
  // 查找已退休但尚未补缺的职位（has no active replacement）
  const { data } = await supabase
    .from('npc_band')
    .select('position_key, position_label, band_group, rank_level')
    .eq('save_id', saveId)
    .eq('is_retired', true);
  if (!data || data.length === 0) return;

  const retiredRows = data as Array<{ position_key: string; position_label: string; band_group: string; rank_level: number }>;

  // 拉取现有在任成员名字，防止新继任者与现有成员重名
  const { data: activeMembers } = await supabase
    .from('npc_band')
    .select('name')
    .eq('save_id', saveId)
    .eq('is_retired', false);
  const _appointUsedNames = new Set<string>((activeMembers ?? []).map((r: Record<string, unknown>) => r.name as string));

  // 对每个退休职位，检查是否已有继任者（同 position_key 的未退休记录）
  for (const r of retiredRows) {
    const { data: active } = await supabase
      .from('npc_band')
      .select('id')
      .eq('save_id', saveId)
      .eq('position_key', r.position_key)
      .eq('is_retired', false)
      .maybeSingle();
    if (active) continue; // 已有继任，跳过

    // 生成继任 NPC
    const npcRankAdj = r.band_group === 'party' ? rankLevel : Math.max(1, rankLevel - 1);
    const ageRange = NPC_AGE_RANGE[npcRankAdj] ?? [38, 55];
    const gender = Math.random() < 0.25 ? '女' : '男';
    const age = ageRange[0] + Math.floor(Math.random() * (ageRange[1] - ageRange[0]));
    const factions: Array<'reform' | 'pragmatic' | 'neutral'> = ['reform', 'pragmatic', 'neutral'];

    const playerBirthGeo = (playerBirthProvince && playerBirthCity)
      ? { prov: playerBirthProvince, city: playerBirthCity }
      : undefined;
    const careerHistory = _genNpcCareerHistory(npcRankAdj, age, playerCityName, playerBirthGeo);
    const { province: npcProvince, city: npcCity } = randBirthPlace();
    const tier = npcSchoolTier(npcRankAdj);
    const uniName = pickUniversityName(tier, npcProvince);
    const degreeLabel = npcDegreeLabel(tier, npcRankAdj);
    const studyYears = degreeLabel === '博士' ? 9 : degreeLabel === '硕士' ? 6 : 4;
    const birthYear = 2025 - age;
    const gradYear = birthYear + 18 + studyYears;

    await supabase.from('npc_band').insert({
      save_id:         saveId,
      position_key:    r.position_key,
      position_label:  r.position_label,
      rank_level:      npcRankAdj,
      name:            _randNpcName(gender, _appointUsedNames),
      gender,
      age,
      faction:         factions[Math.floor(Math.random() * factions.length)],
      ability:         50 + Math.floor(Math.random() * 40),
      loyalty:         40 + Math.floor(Math.random() * 31),
      integrity:       40 + Math.floor(Math.random() * 41),
      career_history:  careerHistory,
      is_retired:      false,
      retire_game_day: null,
      birth_province:  npcProvince,
      birth_city:      npcCity,
      university_name: `${uniName}（${degreeLabel}）`,
      graduation_year: gradYear,
      birth_year:      birthYear,
      band_group:      r.band_group,
    });
  }
}

// =====================================================================
// ★ 部门编制满员（升职/平调后批量补全）
// =====================================================================

/**
 * 为所有 14 个工作部门批量调用 fillDeptStaff，
 * 确保每部门至少有 NPC 员工（正职/副职/科员）填满额定编制。
 */
export async function fillAllDeptsStaff(saveId: string, userId: string): Promise<void> {
  const deptKeys = Object.keys(DEPT_CONFIG) as DeptKey[];
  for (const deptKey of deptKeys) {
    await fillDeptStaff(saveId, userId, deptKey);
  }
}

// =====================================================================
// ★ 月度施政行动（一键施政 / 单部门施政）
// =====================================================================

/**
 * 查询本月（monthKey = floor(gameDays/30)）已执行施政的部门 key 集合。
 */
export async function getDeptActionLog(
  saveId: string,
  monthKey: number,
): Promise<Set<string>> {
  const { data } = await supabase
    .from('dept_gov_actions')
    .select('dept_key')
    .eq('save_id', saveId)
    .eq('month_key', monthKey);
  const used = new Set<string>();
  for (const row of (data ?? [])) used.add(row.dept_key as string);
  return used;
}

/**
 * 对单个部门执行本月施政行动。
 * - 返回 null 表示本月已施政或部门无正职；
 * - 返回效果对象表示施政成功，调用方需自行写入 player_saves。
 */
export async function execSingleDeptAction(
  saveId: string,
  deptKey: DeptKey,
  monthKey: number,
): Promise<{
  cityGdp: number; cityLivelihood: number; cityEcology: number;
  cityBusiness: number; securityIndex: number; meritPoints: number;
  bossFavor: number; fundBalance: number; taxRevenue: number;
  log: string;
} | null> {
  // 防重：本月已施政
  const { data: existing } = await supabase
    .from('dept_gov_actions')
    .select('id')
    .eq('save_id', saveId)
    .eq('dept_key', deptKey)
    .eq('month_key', monthKey)
    .maybeSingle();
  if (existing) return null;

  // 查找该部门正职
  const { data: headRow } = await supabase
    .from('subordinates')
    .select('name, ability')
    .eq('save_id', saveId)
    .eq('appointed_dept', deptKey)
    .eq('dept_position', 'head')
    .eq('is_appointed', true)
    .maybeSingle();

  const cfg = DEPT_CONFIG[deptKey];
  if (!cfg?.autoEffect) return null;

  // 能力系数（有正职用其能力，无正职保底30%）
  const ability = headRow ? (headRow.ability as number) ?? 50 : 30;
  const factor = Math.max(0.3, Math.min(1.0, ability / 100));
  const fx = cfg.autoEffect;
  const apply = (v?: number) => v ? Math.round(v * factor * 10) / 10 : 0;

  const result = {
    cityGdp: apply(fx.cityGdp), cityLivelihood: apply(fx.cityLivelihood),
    cityEcology: apply(fx.cityEcology), cityBusiness: apply(fx.cityBusiness),
    securityIndex: apply(fx.securityIndex), meritPoints: apply(fx.meritPoints),
    bossFavor: apply(fx.bossFavor), fundBalance: apply(fx.fundBalance),
    taxRevenue: apply(fx.taxRevenue),
    log: headRow
      ? `${cfg.name}[${headRow.name as string}]执行了【${cfg.autoActionName}】`
      : `${cfg.name}【${cfg.autoActionName}】（暂无一把手，效能折减）`,
  };

  // 记录施政日志（upsert 防并发重复）
  await supabase.from('dept_gov_actions').upsert({
    save_id: saveId, dept_key: deptKey, month_key: monthKey,
    merit_gain: result.meritPoints,
  }, { onConflict: 'save_id,dept_key,month_key' });

  return result;
}

/**
 * 一键施政：对本月所有尚未施政的部门批量执行，汇总效果后写入 player_saves。
 * 返回汇总效果和各部门日志。
 */
export async function execAllDeptActionsManual(
  saveId: string,
  gameDays: number,
): Promise<{
  actioned: number;
  alreadyDone: number;
  totalMerit: number;
  logs: string[];
}> {
  const monthKey = Math.floor(gameDays / 30);
  const deptKeys = Object.keys(DEPT_CONFIG) as DeptKey[];
  const done = await getDeptActionLog(saveId, monthKey);

  const totals = {
    cityGdp: 0, cityLivelihood: 0, cityEcology: 0,
    cityBusiness: 0, securityIndex: 0, meritPoints: 0,
    bossFavor: 0, fundBalance: 0, taxRevenue: 0,
  };
  const logs: string[] = [];
  let actioned = 0;

  for (const deptKey of deptKeys) {
    if (done.has(deptKey)) continue;
    const r = await execSingleDeptAction(saveId, deptKey, monthKey);
    if (!r) continue;
    totals.cityGdp        += r.cityGdp;
    totals.cityLivelihood += r.cityLivelihood;
    totals.cityEcology    += r.cityEcology;
    totals.cityBusiness   += r.cityBusiness;
    totals.securityIndex  += r.securityIndex;
    totals.meritPoints    += r.meritPoints;
    totals.bossFavor      += r.bossFavor;
    totals.fundBalance    += r.fundBalance;
    totals.taxRevenue     += r.taxRevenue;
    logs.push(r.log);
    actioned++;
  }

  // 写入 player_saves
  if (actioned > 0) {
    const { data: cur } = await supabase
      .from('player_saves')
      .select('merit_points, city_gdp, city_livelihood, city_ecology, city_business, security_index, boss_favor, fund_balance, tax_revenue')
      .eq('id', saveId).maybeSingle();
    if (cur) {
      const c = cur as Record<string, number>;
      await supabase.from('player_saves').update({
        merit_points:    (c.merit_points    ?? 0) + totals.meritPoints,
        city_gdp:        Math.min(100, (c.city_gdp        ?? 50) + totals.cityGdp),
        city_livelihood: Math.min(100, (c.city_livelihood ?? 50) + totals.cityLivelihood),
        city_ecology:    Math.min(100, (c.city_ecology    ?? 50) + totals.cityEcology),
        city_business:   Math.min(100, (c.city_business   ?? 50) + totals.cityBusiness),
        security_index:  Math.min(100, (c.security_index  ?? 50) + totals.securityIndex),
        boss_favor:      Math.min(100, (c.boss_favor      ?? 50) + totals.bossFavor),
        fund_balance:    Math.max(0,   (c.fund_balance    ?? 0)  + totals.fundBalance),
        tax_revenue:     Math.max(0,   (c.tax_revenue     ?? 0)  + totals.taxRevenue),
      }).eq('id', saveId);
    }
  }

  return { actioned, alreadyDone: done.size, totalMerit: Math.round(totals.meritPoints * 10) / 10, logs };
}

// =====================================================================
// ★ AI 治理：每月自动推进辖区 devIndex / favorIndex
// =====================================================================

/**
 * 每月 AI 自动推进玩家所有管辖区域：
 * - devIndex 小幅自然增长（+1~3）
 * - favorIndex 小幅自然增长（+0~2）
 * - 已达到上限(100)的区域不再增长
 * 不消耗玩家行动配额，不影响月度次数计数。
 */
export async function aiGoverningAreasMonthly(saveId: string): Promise<void> {
  const { data: areas } = await supabase
    .from('governing_areas')
    .select('id, dev_index, favor_index, dev_history')
    .eq('save_id', saveId);

  if (!areas || areas.length === 0) return;

  for (const area of areas as { id: string; dev_index: number; favor_index: number; dev_history: string }[]) {
    const devGain  = area.dev_index  < 100 ? 1 + Math.floor(Math.random() * 3) : 0;
    const favGain  = area.favor_index < 100 ? Math.floor(Math.random() * 3)     : 0;
    const newDev   = Math.min(100, area.dev_index + devGain);
    if (devGain === 0 && favGain === 0) continue;

    // 追加历史记录，最多保留24条
    let history: { m: number; v: number }[] = [];
    try { history = JSON.parse(area.dev_history || '[]'); } catch { history = []; }
    const nextM = history.length > 0 ? history[history.length - 1].m + 1 : 1;
    history = [...history, { m: nextM, v: newDev }].slice(-24);

    await supabase.from('governing_areas').update({
      dev_index:   newDev,
      favor_index: Math.min(100, area.favor_index + favGain),
      dev_history: JSON.stringify(history),
    }).eq('id', area.id);
  }
}

/**
 * 晋升/平调时：批量确保所有部门正副职满员（调用 fillAllDeptsStaff）。
 * 同时保留已在岗（is_appointed=true）下属不被清空。
 */
export async function ensureAllDeptsFullOnTransfer(saveId: string, userId: string, rankLevel: number): Promise<void> {
  await fillAllDeptsStaff(saveId, userId);
  // 未任命下属补充（确保总量充足）
  const { data: existing } = await supabase.from('subordinates').select('id').eq('save_id', saveId).is('transferred_city', null);
  const { SUBORDINATE_LIMIT } = await import('@/types/game');
  const target = SUBORDINATE_LIMIT[rankLevel] ?? 10;
  const current = (existing ?? []).length;
  if (current < target) {
    await import('@/db/gameApi').then(m => m.supplementSubordinates(saveId, userId, rankLevel, current));
  }
}

// ──────────────────────────────────────────────────────────────────
// 多存档槽系统（最多3个存档位）
// ──────────────────────────────────────────────────────────────────

export interface SaveSlotInfo {
  id: string;
  slotNumber: number;
  slotName: string;
  rankName: string;
  rankLevel: number;
  cityName: string;
  gameDays: number;
  updatedAt: string;
}

/** 查询当前用户所有存档槽 */
export async function listSaveSlots(): Promise<SaveSlotInfo[]> {
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) return [];
  const { data, error } = await supabase
    .from('save_slots')
    .select('id, slot_number, slot_name, rank_name, rank_level, city_name, game_days, updated_at')
    .eq('user_id', user.user.id)
    .order('slot_number');
  if (error || !data) return [];
  return data.map(r => ({
    id: r.id as string,
    slotNumber: r.slot_number as number,
    slotName: r.slot_name as string,
    rankName: r.rank_name as string,
    rankLevel: r.rank_level as number,
    cityName: r.city_name as string,
    gameDays: r.game_days as number,
    updatedAt: r.updated_at as string,
  }));
}

/** 保存当前游戏到指定存档槽（1-3），slotName 为描述标签 */
export async function writeSaveSlot(
  saveId: string,
  slotNumber: 1 | 2 | 3,
  slotName: string,
): Promise<boolean> {
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) return false;
  // 读取当前存档行作为快照
  const { data: row, error: readErr } = await supabase
    .from('player_saves')
    .select('*')
    .eq('id', saveId)
    .single();
  if (readErr || !row) return false;
  const snapshot = row as Record<string, unknown>;
  // upsert 到存档槽
  const { error } = await supabase
    .from('save_slots')
    .upsert(
      {
        user_id: user.user.id,
        slot_number: slotNumber,
        snapshot,
        slot_name: slotName,
        rank_name:  String(snapshot.rank_name  ?? ''),
        rank_level: Number(snapshot.rank_level ?? 1),
        city_name:  String(snapshot.city_name  ?? ''),
        game_days:  Number(snapshot.game_days  ?? 0),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,slot_number' },
    );
  return !error;
}

/** 从指定槽位恢复存档（覆盖 saveId 行） */
export async function loadSaveSlot(
  saveId: string,
  slotNumber: 1 | 2 | 3,
): Promise<PlayerSave | null> {
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) return null;
  const { data: slot, error } = await supabase
    .from('save_slots')
    .select('snapshot')
    .eq('user_id', user.user.id)
    .eq('slot_number', slotNumber)
    .maybeSingle();
  if (error || !slot?.snapshot) return null;
  const snap = slot.snapshot as Record<string, unknown>;
  // 用快照数据覆写 player_saves 行（保留 id / user_id）
  const { id: _id, user_id: _uid, created_at: _ca, ...rest } = snap;
  void _id; void _uid; void _ca;
  const { data: updated, error: upErr } = await supabase
    .from('player_saves')
    .update({ ...rest, updated_at: new Date().toISOString() })
    .eq('id', saveId)
    .select('*')
    .single();
  if (upErr || !updated) return null;
  return rowToPlayerSave(updated as Record<string, unknown>);
}


// ============ NPC干部月度人事处理（退休 + 落马）============

/**
 * 每月对下属干部执行两类人事事件：
 * 1. 到龄退休：cadreAge >= RETIREMENT_AGE_MAP[subLevel]
 * 2. 落马被查：5~10% 概率（廉洁度越低概率越高），退休人员豁免
 * 返回发生的事件摘要（供调用方写通知）
 */
export async function processNpcPersonnelEvents(
  saveId: string,
  userId: string,
  gameDays: number,
): Promise<{ retiredCount: number; purgedCount: number; events: string[] }> {
  const { RETIREMENT_AGE_MAP } = await import('@/types/game');

  // 查询所有未退休下属
  const { data, error } = await supabase
    .from('subordinates')
    .select('id, name, sub_level, cadre_age, integrity, birth_year')
    .eq('save_id', saveId)
    .eq('is_retired', false);
  if (error || !data || data.length === 0) return { retiredCount: 0, purgedCount: 0, events: [] };

  const retiredIds: string[] = [];
  const purgedIds: string[] = [];
  const events: string[] = [];
  const gameYear = Math.floor(gameDays / 365);

  for (const row of data) {
    const subLevel = (row.sub_level as number) ?? 1;
    // 计算干部年龄：优先 cadre_age，其次用出生年推算
    const cadreAge = (row.cadre_age as number) ?? (row.birth_year ? gameYear + 2000 - (row.birth_year as number) : null);
    const retireAge = RETIREMENT_AGE_MAP[subLevel] ?? 60;
    const name = (row.name as string) ?? '某干部';
    const integrity = (row.integrity as number) ?? 60;

    // ── 到龄退休 ──────────────────────────────────────────────
    if (cadreAge !== null && cadreAge >= retireAge) {
      retiredIds.push(row.id as string);
      events.push(`🎖️ ${name}（${getLevelLabel(subLevel)}）到龄退休，释放职数名额`);
      continue;
    }

    // ── 落马被查（退休人员豁免）────────────────────────────────
    // 基础概率 5%，廉洁度<40再加 5%；用 id 哈希 + gameDays 月份做种子，避免每月都对同一人触发
    const monthSeed = Math.floor(gameDays / 30);
    const idHash = [...(row.id as string)].reduce((h, c) => (h * 31 + c.charCodeAt(0)) & 0xffff, 0);
    const deterministicRandom = Math.abs(Math.sin(idHash * 7 + monthSeed * 31)) % 1;
    const purgeProb = integrity < 40 ? 0.10 : 0.05;
    if (deterministicRandom < purgeProb) {
      purgedIds.push(row.id as string);
      events.push(`⚖️ ${name}（${getLevelLabel(subLevel)}）因腐败问题被立案调查，免职处理`);
    }
  }

  // 批量写 DB：退休
  if (retiredIds.length > 0) {
    await supabase.from('subordinates')
      .update({ is_retired: true, retire_game_day: gameDays })
      .in('id', retiredIds);
  }
  // 批量写 DB：落马（也标记退休，不再参与职数占用）
  if (purgedIds.length > 0) {
    await supabase.from('subordinates')
      .update({ is_retired: true, retire_game_day: gameDays, integrity: 0 })
      .in('id', purgedIds);
  }

  // 写事件日志（供月度报告展示）
  if (events.length > 0) {
    await saveEventRecord({
      saveId, userId,
      eventType: 'corruption',
      title: '本月人事变动',
      description: events.join('\n'),
      choiceIndex: null, choiceText: null,
      meritChange: 0, moralChange: 0,
      gdpChange: 0, livelihoodChange: 0,
      ecologyChange: 0, businessChange: 0,
      gameDay: gameDays,
    });
  }

  return { retiredCount: retiredIds.length, purgedCount: purgedIds.length, events };
}

function getLevelLabel(subLevel: number): string {
  const labels: Record<number, string> = {
    1: '科员', 2: '副科', 3: '正科', 4: '副处', 5: '正处', 6: '副处',
    7: '副厅', 8: '正厅', 9: '副部', 10: '正部', 11: '副省', 12: '正省',
  };
  return labels[subLevel] ?? `${subLevel}级`;
}

/** 删除指定槽位 */
export async function deleteSaveSlot(slotNumber: 1 | 2 | 3): Promise<boolean> {
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) return false;
  const { error } = await supabase
    .from('save_slots')
    .delete()
    .eq('user_id', user.user.id)
    .eq('slot_number', slotNumber);
  return !error;
}

/** 仅更新存档槽位的名称标签，不改动快照内容 */
export async function updateSaveSlotName(slotId: string, newName: string): Promise<boolean> {
  const { error } = await supabase
    .from('save_slots')
    .update({ slot_name: newName })
    .eq('id', slotId);
  return !error;
}
