import React from 'react';
import { render } from '@testing-library/react-native';
import PromotionScreen from '../promotion';
import { canAttemptExceptionalPromotion } from '../promotion';
import { useGame } from '@/ctx/GameContext';
import { createMockSave } from '@/test/factories';

// ── reanimated mock (factory must be self-contained — hoisted) ──
jest.mock('react-native-reanimated', () => {
  const AnimatedView = ({ children, ...props }: any) => {
    const { entering, exiting, ...rest } = props;
    return <>{children}</>;
  };
  return {
    __esModule: true,
    default: {
      View: AnimatedView,
      Text: AnimatedView,
      Image: AnimatedView,
      ScrollView: AnimatedView,
    },
    View: AnimatedView,
    Text: AnimatedView,
    Image: AnimatedView,
    ScrollView: AnimatedView,
    useSharedValue: jest.fn(() => ({ value: 0 })),
    useAnimatedStyle: jest.fn(() => ({})),
    withTiming: jest.fn(() => 0),
    withSpring: jest.fn(() => 0),
    withSequence: jest.fn(() => 0),
    withRepeat: jest.fn(() => 0),
    withDelay: jest.fn(() => 0),
    Easing: { in: jest.fn(), out: jest.fn(), inOut: jest.fn(), linear: jest.fn() },
    runOnJS: jest.fn((fn: (...args: unknown[]) => unknown) => fn),
    createAnimatedComponent: (comp: React.ComponentType) => comp,
    FadeInDown: { duration: jest.fn(() => ({ springify: jest.fn(() => ({ delay: jest.fn() })) })) },
    FadeIn: { duration: jest.fn(() => ({})) },
    ZoomIn: { duration: jest.fn(() => ({ springify: jest.fn(() => ({ damping: jest.fn(() => ({})) })) })) },
    FadeOut: { duration: jest.fn(() => ({})) },
  };
});

// ── Module mocks ─────────────────────────────────────────────────
jest.mock('@/ctx/GameContext', () => ({
  useGame: jest.fn(),
  GameProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), replace: jest.fn() }),
  useFocusEffect: jest.fn(),
  Stack: { Screen: 'StackScreen' },
  Redirect: ({ href }: { href: string }) => null,
}));

jest.mock('expo-status-bar', () => ({
  StatusBar: () => null,
}));

jest.mock('expo/fetch', () => ({
  fetch: jest.fn(),
}));

jest.mock('eventsource-parser', () => ({
  createParser: jest.fn(),
}));

jest.mock('@/lib/rankTheme', () => ({
  getRankThemeWithLine: jest.fn(() => ({ primary: '#FFB800', bg: '#0d111f' })),
}));

jest.mock('@/lib/lineRankTitles', () => ({
  getLineRankTitle: jest.fn(() => ({ title: '测试职位', promotionAnnouncement: '恭喜晋升' })),
  getLineNameByPath: jest.fn(() => '行政线' as const),
}));

jest.mock('@/lib/kpiEngine', () => ({
  getLineKpiSystem: jest.fn(() => ({
    totalBonus: 50,
    lineName: '行政线',
    bonusLabel: 'B',
    summary: 'KPI summary',
  })),
  computeKpi: jest.fn(() => ({ totalScore: 70 })),
  getKpiPanel: jest.fn(() => [
    { label: '政绩', score: 70 },
    { label: '道德', score: 80 },
  ]),
  getPromotionSummary: jest.fn(() => '晋升总结'),
  getDeptKpiResult: jest.fn(() => null as any),
}));

jest.mock('@/lib/lineGameplay', () => ({
  LINE_PITCH: {},
  PREFERRED_LINE_PROMO_BONUS: 0.2,
}));

jest.mock('@/lib/lineTheme', () => ({
  LINE_ICON: { '党务线': '🔴', '行政线': '🏛️', '纪检线': '⚖️', '团派线': '🌱' },
  getLineBaseColor: jest.fn(() => '#70A870'),
}));

jest.mock('@/db/gameApi', () => ({
  initBossTasks: jest.fn(),
  getFollowCandidates: jest.fn(),
  refreshSubordinatesForNewPost: jest.fn(),
  initLeadershipBand: jest.fn(),
  recordPlayerCareer: jest.fn(),
  writeSaveSlot: jest.fn(),
  recallSecretary: jest.fn(),
  getOrCreateSecretary: jest.fn(),
  getSubordinates: jest.fn(),
  appointSubAsSecretary: jest.fn(),
}));

// ── Tests ────────────────────────────────────────────────────────
beforeEach(() => {
  jest.clearAllMocks();
});

describe('canAttemptExceptionalPromotion', () => {
  it('ageGatePass=true → always returns true regardless of other flags', () => {
    expect(canAttemptExceptionalPromotion(true, 0.15, false)).toBe(true);
    expect(canAttemptExceptionalPromotion(true, 0.15, true)).toBe(true);
    expect(canAttemptExceptionalPromotion(true, 0, false)).toBe(true);
    expect(canAttemptExceptionalPromotion(true, 0, true)).toBe(true);
  });

  it('ageGatePass=false + exceptionalChance=0 → returns true', () => {
    expect(canAttemptExceptionalPromotion(false, 0, false)).toBe(true);
    expect(canAttemptExceptionalPromotion(false, 0, true)).toBe(true);
  });

  it('ageGatePass=false + exceptionalChance>0 + not failed → returns true', () => {
    expect(canAttemptExceptionalPromotion(false, 0.10, false)).toBe(true);
    expect(canAttemptExceptionalPromotion(false, 0.25, false)).toBe(true);
    expect(canAttemptExceptionalPromotion(false, 0.30, false)).toBe(true);
  });

  it('ageGatePass=false + exceptionalChance>0 + already failed → returns false', () => {
    expect(canAttemptExceptionalPromotion(false, 0.10, true)).toBe(false);
    expect(canAttemptExceptionalPromotion(false, 0.25, true)).toBe(false);
    expect(canAttemptExceptionalPromotion(false, 0.30, true)).toBe(false);
  });

  it('edge case: exceptionalChance at boundary 0 still returns true even when failed', () => {
    expect(canAttemptExceptionalPromotion(false, 0, true)).toBe(true);
  });
});

describe('PromotionScreen component', () => {
  const mockSave = createMockSave();

  it('isLoading=true → renders ActivityIndicator', () => {
    (useGame as jest.Mock).mockReturnValue({
      save: null,
      isLoading: true,
      updateGameSave: jest.fn(),
      refreshSave: jest.fn(),
      forceRefreshSave: jest.fn(),
      waitForAdvance: jest.fn(),
      lockAdvance: jest.fn(),
      unlockAdvance: jest.fn(),
      commitPromotion: jest.fn(),
    });
    const { getByTestId } = render(<PromotionScreen />);
    expect(getByTestId('promotion-loading')).toBeTruthy();
  });

  it('save=null, isLoading=false → renders error message with back button', () => {
    (useGame as jest.Mock).mockReturnValue({
      save: null,
      isLoading: false,
      updateGameSave: jest.fn(),
      refreshSave: jest.fn(),
      forceRefreshSave: jest.fn(),
      waitForAdvance: jest.fn(),
      lockAdvance: jest.fn(),
      unlockAdvance: jest.fn(),
      commitPromotion: jest.fn(),
    });
    const { getByText } = render(<PromotionScreen />);
    expect(getByText('加载存档失败，请返回重试')).toBeTruthy();
    expect(getByText('返回')).toBeTruthy();
  });

  it('save loaded, canPromote=false → renders promotion UI with locked state', () => {
    (useGame as jest.Mock).mockReturnValue({
      save: { ...mockSave, isPromotionAvailable: false },
      isLoading: false,
      updateGameSave: jest.fn(),
      refreshSave: jest.fn(),
      forceRefreshSave: jest.fn(),
      waitForAdvance: jest.fn(),
      lockAdvance: jest.fn(),
      unlockAdvance: jest.fn(),
      commitPromotion: jest.fn(),
    });
    const { getByText } = render(<PromotionScreen />);
    expect(getByText('干部晋升评审')).toBeTruthy();
    expect(getByText('条件待完善')).toBeTruthy();
  });

  it('save loaded, canPromote=true → renders apply promotion button', () => {
    const save = createMockSave({
      isPromotionAvailable: true,
      tenureYears: 5,
      meritPoints: 9999,
      moralValue: 80,
      assessmentGrade: '优秀',
      democraticEvalScore: 80,
      specialAssessScore: 80,
      grassrootsExpYears: 5,
      bossFavor: 80,
      boss2Favor: 80,
      boss3Favor: 80,
      reformFaction: 50,
      pragmaticFaction: 50,
      abilityValue: 80,
      securityIndex: 80,
      cityLivelihood: 80,
      massIncidentCount: 3,
    });
    (useGame as jest.Mock).mockReturnValue({
      save,
      isLoading: false,
      updateGameSave: jest.fn(),
      refreshSave: jest.fn(),
      forceRefreshSave: jest.fn(),
      waitForAdvance: jest.fn(),
      lockAdvance: jest.fn(),
      unlockAdvance: jest.fn(),
      commitPromotion: jest.fn(),
    });
    const { getByText } = render(<PromotionScreen />);
    expect(getByText(/申请晋升/)).toBeTruthy();
    expect(getByText('可申请晋升')).toBeTruthy();
  });
});
