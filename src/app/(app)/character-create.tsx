// 角色创建页面 — 干部履历登记表（翻页式重设计版 v5，6步流程，四线选择）
import { useState, useMemo } from 'react';
import {
  View, Text, TextInput, Pressable, ScrollView,
  KeyboardAvoidingView, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { completeCharacterCreation, updateSave } from '@/db/gameApi';
import { useGame } from '@/ctx/GameContext';
import {
  MALE_AVATARS, FEMALE_AVATARS, SCHOOL_BONUS,
  canApplyZhongXuanDiao,
  PROVINCE_LIST, PROVINCE_CITY_MAP,
  UNIVERSITY_985, UNIVERSITY_211, UNIVERSITY_NORMAL,
  UNIVERSITY_ZHUANKE_SUFFIXES,
  FAMILY_BACKGROUNDS,
  INIT_FACTIONS,
} from '@/types/game';
import type { DegreeType } from '@/types/game';
import type { CareerLine } from '@/lib/lineGameplay';
import { useGameSounds, useThrottledFlip } from '@/hooks/useGameSounds';

/* ─────────── 高考分数 / 院校层次配置（2024年参考录取线）─────────── */
type SchoolTier = '985院校' | '211院校' | '普通本科' | '大专院校';

const SCORE_TIERS: {
  tier: SchoolTier; min: number; icon: string; color: string; bg: string; border: string; label: string; desc: string;
}[] = [
  { tier: '985院校', min: 620, icon: '🏛️', color: '#7C3AED', bg: '#F5F3FF', border: '#DDD6FE',
    label: '985重点院校', desc: '录取线 620+ · 名校精英，初始能力 +10' },
  { tier: '211院校', min: 580, icon: '🎓', color: '#1E40AF', bg: '#EFF6FF', border: '#BFDBFE',
    label: '211重点院校', desc: '录取线 580+ · 重点高校，初始能力 +5' },
  { tier: '普通本科', min: 430, icon: '📚', color: '#166534', bg: '#F0FDF4', border: '#BBF7D0',
    label: '普通本科', desc: '录取线 430+ · 扎实基础，均衡发展' },
  { tier: '大专院校', min: 150, icon: '📖', color: '#92400E', bg: '#FFFBEB', border: '#FCD34D',
    label: '大专院校', desc: '录取线 150+ · 基层起步，初始能力 -5' },
];

function getHighestTier(score: number): SchoolTier {
  if (score >= 620) return '985院校';
  if (score >= 580) return '211院校';
  if (score >= 430) return '普通本科';
  return '大专院校';
}

/** 学历提升随机：本科30%、硕士50%、博士20% */
function randomDegree(): DegreeType {
  const r = Math.random();
  if (r < 0.30) return '本科';
  if (r < 0.80) return '硕士';
  return '博士';
}

/** 大专院校名生成 */
function genZhuankeList(province: string): string[] {
  const cities = PROVINCE_CITY_MAP[province] ?? [];
  const set = new Set<string>();
  while (set.size < 8) {
    const prefix = cities.length > 0
      ? cities[Math.floor(Math.random() * cities.length)].replace(/市|区|县/, '')
      : ['江南', '淮海', '云岭', '南湖', '桂江', '平原', '滨海'][Math.floor(Math.random() * 7)];
    const suffix = UNIVERSITY_ZHUANKE_SUFFIXES[Math.floor(Math.random() * UNIVERSITY_ZHUANKE_SUFFIXES.length)];
    set.add(prefix + suffix);
  }
  return [...set];
}

function getUniversityList(tier: SchoolTier, province: string): string[] {
  if (tier === '985院校') return UNIVERSITY_985;
  if (tier === '211院校') return UNIVERSITY_211;
  if (tier === '普通本科') return UNIVERSITY_NORMAL;
  return genZhuankeList(province);
}

/* ─────────── 配色系统 ─────────── */
const C = {
  pageBg:       '#EDEBE4',
  headerBg:     '#A31919',
  headerBg2:    '#7B0D0D',
  gold:         '#C9953A',
  goldLight:    '#F5E9CC',
  goldBorder:   '#D4A843',
  navy:         '#1A2B3C',
  navyMid:      '#2E4A6A',
  label:        '#4A3F2F',
  muted:        '#8A7F6E',
  faint:        '#BCB5A6',
  red:          '#B91C1C',
  redLight:     '#FEF2F2',
  redMid:       '#FECACA',
  blue:         '#1E40AF',
  blueLight:    '#EFF6FF',
  blueMid:      '#BFDBFE',
  green:        '#166534',
  greenLight:   '#F0FDF4',
  greenMid:     '#BBF7D0',
  cardBg:       '#FDFAF5',
  cardBorder:   '#D6CFBF',
  inputBg:      '#FEFCF8',
  inputBorder:  '#C8BFA8',
  divider:      '#DDD6C8',
  dividerLight: '#EDE8DF',
  disabled:     '#E8E3D9',
  disabledText: '#A8A099',
};

/* ─────────── 步骤进度条 ─────────── */
const STEP_LABELS = ['基本信息', '出生地', '高考分数', '院校选择', '家庭背景', '仕途路线'];

function StepBar({ current }: { current: number }) {
  return (
    <View style={{ flexDirection: 'row', paddingHorizontal: 14, paddingVertical: 10, gap: 3 }}>
      {STEP_LABELS.map((label, i) => {
        const done = i < current - 1;
        const active = i === current - 1;
        return (
          <View key={i} style={{ flex: 1, alignItems: 'center', gap: 3 }}>
            <View style={{
              height: 3, borderRadius: 2, width: '100%',
              backgroundColor: done ? C.gold : active ? C.red : 'rgba(255,255,255,0.25)',
            }} />
            <Text style={{
              fontSize: 8, fontWeight: active ? '800' : '400',
              color: active ? '#fff' : done ? C.goldLight : 'rgba(255,255,255,0.45)',
            }}>
              {label}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

/* ─────────── 通用子组件 ─────────── */
function FieldLabel({ label, hint, required }: { label: string; hint?: string; required?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 8 }}>
      {required && <Text style={{ fontSize: 12, color: C.red, fontWeight: '900' }}>*</Text>}
      <Text style={{ fontSize: 11, color: C.label, fontWeight: '800', letterSpacing: 2 }}>{label}</Text>
      {hint && <Text style={{ fontSize: 10, color: C.muted }}>{hint}</Text>}
    </View>
  );
}

function Card({ children, style }: { children: React.ReactNode; style?: object }) {
  return (
    <View style={{
      backgroundColor: C.cardBg, borderWidth: 1, borderColor: C.cardBorder,
      borderRadius: 4, padding: 16, marginBottom: 12,
      borderLeftWidth: 3, borderLeftColor: C.goldBorder,
      ...style,
    }}>
      {children}
    </View>
  );
}

/* ─────────── 主组件 ─────────── */
export default function CharacterCreateScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { save, refreshSave } = useGame();
  const { playStamp, playFanfare } = useGameSounds();
  const playFlip = useThrottledFlip(280);

  /* ── 翻页状态 ── */
  const [page, setPage] = useState(1);
  const TOTAL_PAGES = 6;

  /* ── Page 1: 基本信息 ── */
  const [name, setName] = useState('');
  const [gender, setGender] = useState<'男' | '女'>('男');
  const [avatarIdx, setAvatarIdx] = useState(0);

  /* ── Page 2: 出生地 ── */
  const [birthProvince, setBirthProvince] = useState(PROVINCE_LIST[0]!);
  const [birthCity, setBirthCity] = useState(PROVINCE_CITY_MAP[PROVINCE_LIST[0]!]![0]!);
  const [showProvinceList, setShowProvinceList] = useState(false);
  const [showCityList, setShowCityList] = useState(false);

  /* ── Page 3: 高考分数 ── */
  const [gaokaoScore, setGaokaoScore] = useState<number | null>(null);

  /* ── Page 4: 院校 & 学历 ── */
  const [schoolTier, setSchoolTier] = useState<SchoolTier>('普通本科');
  const [universityName, setUniversityName] = useState('');
  const [showUniversityList, setShowUniversityList] = useState(false);
  const [degree, setDegree] = useState<DegreeType>('本科');
  const [degreeRolled, setDegreeRolled] = useState(false);

  /* ── Page 5: 家庭背景 & 晋升通道 ── */
  const [familyBackground, setFamilyBackground] = useState('普通家庭');
  const [isZhongXuanDiao, setIsZhongXuanDiao] = useState(false);
  const [isMilitary, setIsMilitary] = useState(false);

  /* ── Page 6: 仕途路线选择 & 提交 ── */
  const [selectedCareerLine, setSelectedCareerLine] = useState<CareerLine>('行政线');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [submitPressed, setSubmitPressed] = useState(false);

  /* ── 衍生值 ── */
  const avatarPool = gender === '女' ? FEMALE_AVATARS : MALE_AVATARS;

  // 军转干部解锁：根据 save.id 哈希，每存档固定30%概率
  const militaryUnlocked = useMemo(() => {
    if (!save?.id) return false;
    let h = 0;
    for (let i = 0; i < save.id.length; i++) h = (h * 31 + save.id.charCodeAt(i)) % 100;
    return h < 30;
  }, [save?.id]);

  // 选调生解锁：需要985 + 分数620+
  const zhongXuanUnlocked = schoolTier === '985院校' && (gaokaoScore ?? 0) >= 620;

  // 院校列表
  const universityList = useMemo(
    () => getUniversityList(schoolTier, birthProvince),
    [schoolTier, birthProvince],
  );

  const age = 18;
  const birthYear = 2025 - age;
  const studyYears = degree === '博士' ? 9 : degree === '硕士' ? 6 : 4;
  const gradYear = birthYear + 18 + (schoolTier === '大专院校' ? 3 : studyYears);
  const displayUniversity = universityName || universityList[0] || '请选择院校';
  const schoolBonus = SCHOOL_BONUS[schoolTier] ?? 0;

  /* ─── 下拉选择器 ─── */
  function DropdownPicker({ value, onPress, placeholder }: { value: string; onPress: () => void; placeholder: string }) {
    return (
      <Pressable
        onPress={onPress}
        cssInterop={false}
        style={{
          borderWidth: 1, borderColor: C.inputBorder, borderRadius: 4,
          backgroundColor: C.inputBg, paddingHorizontal: 12, paddingVertical: 13,
          flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        }}
      >
        <Text style={{ fontSize: 14, color: value ? C.navy : C.faint, flex: 1 }} numberOfLines={1}>
          {value || placeholder}
        </Text>
        <Text style={{ color: C.red, fontSize: 12, fontWeight: '700' }}>▾</Text>
      </Pressable>
    );
  }

  function DropdownList({ items, selected, onSelect }: { items: string[]; selected: string; onSelect: (v: string) => void }) {
    return (
      <View style={{ borderWidth: 1, borderColor: C.inputBorder, borderTopWidth: 0, borderRadius: 4,
        borderTopLeftRadius: 0, borderTopRightRadius: 0, backgroundColor: C.cardBg, maxHeight: 200 }}>
        <ScrollView nestedScrollEnabled showsVerticalScrollIndicator={false}>
          {items.map(item => (
            <Pressable key={item} onPress={() => onSelect(item)} style={{
              paddingHorizontal: 14, paddingVertical: 12,
              borderBottomWidth: 1, borderBottomColor: C.dividerLight,
              backgroundColor: selected === item ? C.redLight : C.cardBg,
              flexDirection: 'row', alignItems: 'center', gap: 8,
            }}>
              {selected === item && <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: C.red }} />}
              <Text style={{ fontSize: 13, flex: 1, color: selected === item ? C.red : C.navy,
                fontWeight: selected === item ? '700' : '400' }}>{item}</Text>
              {selected === item && <Text style={{ color: C.red, fontSize: 12, fontWeight: '900' }}>✓</Text>}
            </Pressable>
          ))}
        </ScrollView>
      </View>
    );
  }

  /* ─── 导航 ─── */
  const canGoNext = () => {
    if (page === 1) return name.trim().length > 0;
    if (page === 3) return gaokaoScore !== null;
    if (page === 4) return universityName !== '';
    return true;
  };

  const goNext = () => {
    if (page < TOTAL_PAGES) {
      // 离开 page3 时自动设定 tier
      if (page === 3 && gaokaoScore !== null) {
        const best = getHighestTier(gaokaoScore);
        setSchoolTier(best);
        setUniversityName('');
        setDegreeRolled(false);
        setDegree('本科');
      }
      setPage(p => p + 1);
      setShowProvinceList(false);
      setShowCityList(false);
      setShowUniversityList(false);
      setError('');
      playFlip();
    }
  };

  const goPrev = () => {
    if (page > 1) { setPage(p => p - 1); setError(''); playFlip(); }
  };

  /* ─── 提交建档 ─── */
  const handleCreate = async () => {
    if (!name.trim()) { setError('请填写姓名'); return; }
    if (!save) { setError('存档未就绪，请稍后重试'); return; }
    playStamp();
    setTimeout(() => playFanfare(), 600);
    setLoading(true); setError('');
    const finalDegree = schoolTier === '大专院校' ? '专科' : degree;
    const finalUniversity = universityName || displayUniversity;
    const initFaction = INIT_FACTIONS[Math.floor(Math.random() * INIT_FACTIONS.length)]!.key;
    const result = await completeCharacterCreation(save.id, {
      playerName:         name.trim(),
      playerGender:       gender,
      playerAge:          age,
      avatarId:           avatarIdx,
      school:             schoolTier,
      isZhongXuanDiao:    zhongXuanUnlocked && isZhongXuanDiao,
      degree,
      birthYear,
      birthProvince,
      birthCity,
      universityName:     `${finalUniversity}（${finalDegree}）`,
      careerLine:         '地方',
      ministryName:       '',
      familyBackground,
      isMilitaryTransfer: militaryUnlocked && isMilitary,
      initFaction,
    });
    if (!result) { setError('建档失败，请重试'); setLoading(false); return; }
    // 写入玩家选择的仕途路线
    await updateSave(result.id, { careerPathLine: selectedCareerLine });
    await refreshSave();
    router.replace('/(app)/home');
  };

  /* ══════════════════════════════════════════
     各页面渲染
  ══════════════════════════════════════════ */

  /* ── PAGE 1：基本信息 ── */
  function renderPage1() {
    return (
      <Card>
        <View style={{ alignItems: 'center', marginBottom: 20, gap: 6 }}>
          <Text style={{ fontSize: 44 }}>📋</Text>
          <Text style={{ fontSize: 20, fontWeight: '900', color: C.navy, letterSpacing: 4 }}>基本信息</Text>
          <Text style={{ fontSize: 11, color: C.muted }}>请填写真实姓名并选择性别</Text>
        </View>

        {/* 姓名 */}
        <FieldLabel label="姓　　名" required />
        <TextInput
          style={{
            borderWidth: 1, borderColor: C.inputBorder, borderRadius: 4,
            backgroundColor: C.inputBg, paddingHorizontal: 14, paddingVertical: 14,
            fontSize: 22, color: C.navy, letterSpacing: 4, fontWeight: '700', marginBottom: 20,
          }}
          placeholder="请输入真实姓名"
          placeholderTextColor={C.faint}
          value={name}
          onChangeText={setName}
          maxLength={6}
        />

        {/* 性别 */}
        <FieldLabel label="性　　别" required />
        <View style={{ flexDirection: 'row', gap: 12, marginBottom: 20 }}>
          {(['男', '女'] as const).map(g => (
            <Pressable
              key={g}
              onPress={() => { setGender(g); setAvatarIdx(0); playFlip(); }}
              style={{
                flex: 1, paddingVertical: 18, alignItems: 'center', gap: 6,
                borderRadius: 8, borderWidth: gender === g ? 2.5 : 1.5,
                borderColor: gender === g ? C.red : C.inputBorder,
                backgroundColor: gender === g ? C.redLight : C.inputBg,
              }}
            >
              <Text style={{ fontSize: 32 }}>{g === '男' ? '👨' : '👩'}</Text>
              <Text style={{ fontSize: 18, fontWeight: '900', color: gender === g ? C.red : C.navy, letterSpacing: 2 }}>{g}</Text>
              {gender === g && (
                <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: C.red, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ color: '#fff', fontSize: 10, fontWeight: '900' }}>✓</Text>
                </View>
              )}
            </Pressable>
          ))}
        </View>

        {/* 证件头像 */}
        <FieldLabel label="证件头像" hint="（点击选择）" />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {avatarPool.map((emoji, idx) => (
            <Pressable
              key={idx}
              onPress={() => setAvatarIdx(idx)}
              style={{
                width: 54, height: 54, alignItems: 'center', justifyContent: 'center',
                borderRadius: 4, borderWidth: avatarIdx === idx ? 2.5 : 1,
                borderColor: avatarIdx === idx ? C.red : C.inputBorder,
                backgroundColor: avatarIdx === idx ? C.redLight : C.inputBg,
              }}
            >
              <Text style={{ fontSize: 30 }}>{emoji}</Text>
              {avatarIdx === idx && (
                <View style={{ position: 'absolute', bottom: 2, right: 2, width: 14, height: 14,
                  borderRadius: 7, backgroundColor: C.red, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontSize: 8, color: '#fff', fontWeight: '900' }}>✓</Text>
                </View>
              )}
            </Pressable>
          ))}
        </View>
      </Card>
    );
  }

  /* ── PAGE 2：出生地 ── */
  function renderPage2() {
    return (
      <Card>
        <View style={{ alignItems: 'center', marginBottom: 20, gap: 6 }}>
          <Text style={{ fontSize: 44 }}>📍</Text>
          <Text style={{ fontSize: 20, fontWeight: '900', color: C.navy, letterSpacing: 4 }}>出生地信息</Text>
          <Text style={{ fontSize: 11, color: C.muted }}>请选择户籍省份及城市</Text>
        </View>

        <FieldLabel label="省　　份" required />
        <DropdownPicker
          value={birthProvince}
          placeholder="选择省份"
          onPress={() => { setShowProvinceList(!showProvinceList); setShowCityList(false); }}
        />
        {showProvinceList && (
          <DropdownList
            items={PROVINCE_LIST}
            selected={birthProvince}
            onSelect={(p) => {
              setBirthProvince(p);
              const cities = PROVINCE_CITY_MAP[p] ?? [];
              setBirthCity(cities[0] ?? '');
              setShowProvinceList(false);
              setUniversityName('');
              playFlip();
            }}
          />
        )}
        <View style={{ height: 14 }} />

        <FieldLabel label="城　　市" required />
        <DropdownPicker
          value={birthCity}
          placeholder="选择城市"
          onPress={() => { setShowCityList(!showCityList); setShowProvinceList(false); }}
        />
        {showCityList && (
          <DropdownList
            items={PROVINCE_CITY_MAP[birthProvince] ?? []}
            selected={birthCity}
            onSelect={(c) => { setBirthCity(c); setShowCityList(false); }}
          />
        )}

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 16,
          padding: 10, backgroundColor: C.goldLight, borderRadius: 4, borderWidth: 1, borderColor: C.goldBorder }}>
          <Text style={{ fontSize: 14 }}>📅</Text>
          <Text style={{ fontSize: 11, color: C.label }}>
            出生年份自动推算为{' '}
            <Text style={{ fontWeight: '900', color: C.navy }}>{birthYear}</Text> 年
            （入职年龄统一为 <Text style={{ fontWeight: '900', color: C.navy }}>18</Text> 岁）
          </Text>
        </View>
      </Card>
    );
  }

  /* ── PAGE 3：高考分数 ── */
  function renderPage3() {
    const tierConf = gaokaoScore !== null ? SCORE_TIERS.find(t => gaokaoScore >= t.min) : null;
    return (
      <Card>
        <View style={{ alignItems: 'center', marginBottom: 20, gap: 6 }}>
          <Text style={{ fontSize: 44 }}>📝</Text>
          <Text style={{ fontSize: 20, fontWeight: '900', color: C.navy, letterSpacing: 4 }}>高考成绩</Text>
          <Text style={{ fontSize: 11, color: C.muted }}>点击按钮随机生成您的高考分数</Text>
        </View>

        {/* 分数大字展示 */}
        <View style={{
          alignItems: 'center', justifyContent: 'center',
          paddingVertical: 32, marginBottom: 20,
          backgroundColor: gaokaoScore !== null ? (tierConf?.bg ?? C.goldLight) : C.cardBg,
          borderRadius: 12, borderWidth: 2,
          borderColor: gaokaoScore !== null ? (tierConf?.border ?? C.goldBorder) : C.divider,
        }}>
          {gaokaoScore !== null ? (
            <>
              <Text style={{ fontSize: 64, fontWeight: '900', color: tierConf?.color ?? C.navy, letterSpacing: 2 }}>
                {gaokaoScore}
              </Text>
              <Text style={{ fontSize: 14, color: tierConf?.color ?? C.muted, fontWeight: '700', marginTop: 4 }}>
                {tierConf?.icon} {tierConf?.label}
              </Text>
              <Text style={{ fontSize: 11, color: C.muted, marginTop: 6 }}>{tierConf?.desc}</Text>
            </>
          ) : (
            <>
              <Text style={{ fontSize: 48, color: C.faint }}>—</Text>
              <Text style={{ fontSize: 13, color: C.faint, marginTop: 8 }}>尚未生成分数</Text>
            </>
          )}
        </View>

        {/* 随机按钮 */}
        <Pressable
          onPress={() => {
            const score = Math.floor(Math.random() * (700 - 150 + 1)) + 150;
            setGaokaoScore(score);
            setUniversityName('');
            setDegreeRolled(false);
            setDegree('本科');
            playStamp();
          }}
          style={{
            backgroundColor: C.headerBg, borderRadius: 8,
            paddingVertical: 18, alignItems: 'center', gap: 4,
          }}
        >
          <View style={{ height: 2, position: 'absolute', top: 0, left: 0, right: 0, backgroundColor: C.gold }} />
          <Text style={{ color: '#fff', fontSize: 18, fontWeight: '900', letterSpacing: 3 }}>
            {gaokaoScore !== null ? '🎲 重新生成' : '🎲 随机生成分数'}
          </Text>
          <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11 }}>分数范围：150 ~ 700 分</Text>
          <View style={{ height: 2, position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: C.gold }} />
        </Pressable>

        {/* 分数线说明 */}
        <View style={{ marginTop: 16, gap: 6 }}>
          <Text style={{ fontSize: 11, color: C.muted, fontWeight: '700', letterSpacing: 1, marginBottom: 4 }}>2024年参考录取线</Text>
          {SCORE_TIERS.map(t => (
            <View key={t.tier} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 5,
              paddingHorizontal: 10, borderRadius: 4, backgroundColor: t.bg, borderWidth: 1, borderColor: t.border }}>
              <Text style={{ fontSize: 14 }}>{t.icon}</Text>
              <Text style={{ fontSize: 12, fontWeight: '700', color: t.color, flex: 1 }}>{t.label}</Text>
              <Text style={{ fontSize: 11, color: t.color, fontWeight: '700' }}>{t.min}+</Text>
            </View>
          ))}
        </View>
      </Card>
    );
  }

  /* ── PAGE 4：院校选择 ── */
  function renderPage4() {
    const score = gaokaoScore ?? 0;
    return (
      <Card>
        <View style={{ alignItems: 'center', marginBottom: 20, gap: 6 }}>
          <Text style={{ fontSize: 44 }}>🏫</Text>
          <Text style={{ fontSize: 20, fontWeight: '900', color: C.navy, letterSpacing: 4 }}>院校选择</Text>
          <Text style={{ fontSize: 11, color: C.muted }}>根据您的高考分数解锁对应院校层次</Text>
        </View>

        {/* 分数提示条 */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10,
          backgroundColor: C.blueLight, borderRadius: 6, borderWidth: 1, borderColor: C.blueMid, marginBottom: 16 }}>
          <Text style={{ fontSize: 14 }}>📊</Text>
          <Text style={{ fontSize: 12, color: C.blue, flex: 1 }}>
            您的高考成绩：<Text style={{ fontWeight: '900', fontSize: 16 }}>{score}</Text> 分
          </Text>
        </View>

        {/* 院校层次选择 */}
        <FieldLabel label="院校层次" required />
        <View style={{ gap: 8, marginBottom: 18 }}>
          {SCORE_TIERS.map(t => {
            const unlocked = score >= t.min;
            const isSelected = schoolTier === t.tier;
            const bonus = SCHOOL_BONUS[t.tier] ?? 0;
            return (
              <Pressable
                key={t.tier}
                onPress={() => {
                  if (!unlocked) return;
                  setSchoolTier(t.tier);
                  setUniversityName('');
                  setDegreeRolled(false);
                  setDegree('本科');
                  playFlip();
                }}
                style={{
                  flexDirection: 'row', alignItems: 'center', gap: 12,
                  padding: 12, borderRadius: 6,
                  borderWidth: isSelected ? 2.5 : 1.5,
                  borderColor: isSelected ? t.color : unlocked ? t.border : C.divider,
                  backgroundColor: isSelected ? t.bg : unlocked ? C.inputBg : C.disabled,
                  opacity: unlocked ? 1 : 0.55,
                }}
              >
                <View style={{ width: 44, height: 44, borderRadius: 8,
                  backgroundColor: isSelected ? t.color : t.bg, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontSize: 22 }}>{unlocked ? t.icon : '🔒'}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={{ fontSize: 14, fontWeight: '800', color: isSelected ? t.color : unlocked ? C.navy : C.disabledText }}>
                      {t.label}
                    </Text>
                    {!unlocked && (
                      <View style={{ backgroundColor: '#E0E0E0', paddingHorizontal: 5, paddingVertical: 1, borderRadius: 3 }}>
                        <Text style={{ fontSize: 9, color: '#757575', fontWeight: '700' }}>需{t.min}+分</Text>
                      </View>
                    )}
                  </View>
                  <Text style={{ fontSize: 10, color: isSelected ? t.color : C.muted, marginTop: 2 }}>{t.desc}</Text>
                </View>
                <View style={{ paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4,
                  backgroundColor: isSelected ? (bonus >= 0 ? '#FEF9C3' : '#FEE2E2') : C.cardBg,
                  borderWidth: 1, borderColor: isSelected ? (bonus >= 0 ? '#FDE047' : C.redMid) : C.divider }}>
                  <Text style={{ fontSize: 13, fontWeight: '900',
                    color: bonus >= 0 ? (isSelected ? '#854D0E' : C.blue) : C.red }}>
                    {bonus >= 0 ? `+${bonus}` : `${bonus}`}
                  </Text>
                </View>
                {isSelected && (
                  <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: t.color,
                    alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ fontSize: 11, color: '#fff', fontWeight: '900' }}>✓</Text>
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>

        {/* 就读院校 */}
        <FieldLabel label="就读院校" required />
        <DropdownPicker
          value={universityName}
          placeholder="点击选择就读院校"
          onPress={() => setShowUniversityList(!showUniversityList)}
        />
        {showUniversityList && (
          <DropdownList
            items={universityList}
            selected={universityName}
            onSelect={(u) => { setUniversityName(u); setShowUniversityList(false); }}
          />
        )}
        {universityName !== '' && (
          <Text style={{ fontSize: 10, color: C.muted, marginTop: 6 }}>
            预计毕业年份：<Text style={{ color: C.navyMid, fontWeight: '700' }}>{gradYear}</Text> 年
          </Text>
        )}

        {/* 学历提升 */}
        {schoolTier !== '大专院校' && universityName !== '' && (
          <View style={{ marginTop: 16 }}>
            <View style={{ height: 1, backgroundColor: C.divider, marginBottom: 16 }} />
            <FieldLabel label="最高学历" hint="（录取后可申请学历提升）" />
            {!degreeRolled ? (
              <Pressable
                onPress={() => {
                  const d = randomDegree();
                  setDegree(d);
                  setDegreeRolled(true);
                  playStamp();
                }}
                style={{
                  backgroundColor: C.navy, borderRadius: 8, paddingVertical: 16,
                  alignItems: 'center', gap: 4,
                }}
              >
                <Text style={{ color: C.gold, fontSize: 16, fontWeight: '900', letterSpacing: 2 }}>
                  📜 点击申请学历提升
                </Text>
                <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11 }}>
                  本科 30% · 硕士 50% · 博士 20%
                </Text>
              </Pressable>
            ) : (
              <View>
                <View style={{
                  flexDirection: 'row', alignItems: 'center', gap: 12,
                  padding: 14, borderRadius: 8, borderWidth: 2,
                  borderColor: degree === '博士' ? '#7C3AED' : degree === '硕士' ? C.blue : C.green,
                  backgroundColor: degree === '博士' ? '#F5F3FF' : degree === '硕士' ? C.blueLight : C.greenLight,
                }}>
                  <Text style={{ fontSize: 36 }}>
                    {degree === '博士' ? '🎓' : degree === '硕士' ? '📗' : '📘'}
                  </Text>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 20, fontWeight: '900',
                      color: degree === '博士' ? '#7C3AED' : degree === '硕士' ? C.blue : C.green }}>
                      {degree}学历
                    </Text>
                    <Text style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>
                      {degree === '博士' ? '可报选调生，正科起步' : degree === '硕士' ? '可报选调生，副科起步' : '基础学历'}
                    </Text>
                  </View>
                  <View style={{ backgroundColor: '#FEF9C3', paddingHorizontal: 8, paddingVertical: 4,
                    borderRadius: 4, borderWidth: 1, borderColor: '#FDE047' }}>
                    <Text style={{ fontSize: 11, fontWeight: '900', color: '#854D0E' }}>已获得</Text>
                  </View>
                </View>
                {/* 重新抽取 */}
                <Pressable
                  onPress={() => { setDegreeRolled(false); setDegree('本科'); playFlip(); }}
                  style={{ marginTop: 8, alignItems: 'center', paddingVertical: 8,
                    borderRadius: 6, borderWidth: 1, borderColor: C.divider, backgroundColor: C.cardBg }}>
                  <Text style={{ fontSize: 12, color: C.muted }}>重新申请</Text>
                </Pressable>
              </View>
            )}
          </View>
        )}
      </Card>
    );
  }

  /* ── PAGE 5：家庭背景 + 晋升通道 ── */
  function renderPage5() {
    const canZhongXuan = zhongXuanUnlocked;
    const canMilitary = militaryUnlocked;
    return (
      <ScrollView showsVerticalScrollIndicator={false} nestedScrollEnabled>
        {/* 家庭背景 */}
        <Card>
          <View style={{ alignItems: 'center', marginBottom: 20, gap: 6 }}>
            <Text style={{ fontSize: 44 }}>👨‍👩‍👦</Text>
            <Text style={{ fontSize: 20, fontWeight: '900', color: C.navy, letterSpacing: 4 }}>家庭背景</Text>
            <Text style={{ fontSize: 11, color: C.muted }}>影响初期人脉关系与道德基础</Text>
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            {FAMILY_BACKGROUNDS.map(fb => {
              const active = familyBackground === fb.key;
              return (
                <Pressable
                  key={fb.key}
                  onPress={() => { setFamilyBackground(fb.key); playFlip(); }}
                  style={{
                    width: '47%', padding: 14, borderRadius: 8,
                    borderWidth: active ? 2.5 : 1.5,
                    borderColor: active ? C.red : C.cardBorder,
                    backgroundColor: active ? '#FFF5F5' : C.cardBg, gap: 6,
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={{ fontSize: 22 }}>{fb.icon}</Text>
                    <Text style={{ fontSize: 13, fontWeight: '800', color: active ? C.red : C.navy, flex: 1 }}>{fb.label}</Text>
                    {active && (
                      <View style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: C.red,
                        alignItems: 'center', justifyContent: 'center' }}>
                        <Text style={{ color: '#fff', fontSize: 9, fontWeight: '900' }}>✓</Text>
                      </View>
                    )}
                  </View>
                  <Text style={{ fontSize: 10, color: C.muted, lineHeight: 14 }}>{fb.desc}</Text>
                  <View style={{ backgroundColor: active ? C.redLight : C.goldLight, borderRadius: 4,
                    paddingHorizontal: 6, paddingVertical: 3, borderWidth: 1,
                    borderColor: active ? C.redMid : C.goldBorder }}>
                    <Text style={{ fontSize: 9, color: active ? C.red : C.gold, fontWeight: '700' }}>{fb.tag}</Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        </Card>

        {/* 特殊晋升通道 */}
        <Card>
          <View style={{ alignItems: 'center', marginBottom: 16, gap: 4 }}>
            <Text style={{ fontSize: 38 }}>🌟</Text>
            <Text style={{ fontSize: 18, fontWeight: '900', color: C.navy, letterSpacing: 3 }}>特殊晋升通道</Text>
            <Text style={{ fontSize: 11, color: C.muted }}>两条通道互斥，启用一个将自动关闭另一个</Text>
          </View>

          {/* 互斥提示 */}
          {(isMilitary || isZhongXuanDiao) && (
            <View style={{ flexDirection: 'row', gap: 6, padding: 10, backgroundColor: '#FFFBEB',
              borderRadius: 6, borderWidth: 1, borderColor: '#FCD34D', marginBottom: 12 }}>
              <Text style={{ fontSize: 13 }}>💡</Text>
              <Text style={{ fontSize: 10, color: '#78350F', flex: 1, lineHeight: 16 }}>
                已启用{isMilitary ? '军转干部' : '中央选调生'}通道，另一通道已自动关闭。
              </Text>
            </View>
          )}

          {/* 中央选调生 */}
          <Pressable
            onPress={() => {
              if (!canZhongXuan) return;
              const next = !isZhongXuanDiao;
              setIsZhongXuanDiao(next);
              if (next) setIsMilitary(false);
              playStamp();
            }}
            style={{
              marginBottom: 12, borderRadius: 8, overflow: 'hidden',
              borderWidth: isZhongXuanDiao ? 2.5 : 1.5,
              borderColor: isZhongXuanDiao ? C.red : canZhongXuan ? C.cardBorder : C.divider,
              opacity: canZhongXuan ? 1 : 0.55,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12,
              paddingHorizontal: 14, paddingVertical: 14,
              backgroundColor: isZhongXuanDiao ? C.red : canZhongXuan ? '#FFF5F5' : '#F5F5F5' }}>
              <View style={{ width: 44, height: 44, borderRadius: 10,
                backgroundColor: isZhongXuanDiao ? 'rgba(255,255,255,0.22)' : canZhongXuan ? C.redLight : '#EEE',
                alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 22 }}>{canZhongXuan ? '🏅' : '🔒'}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={{ fontSize: 14, fontWeight: '800',
                    color: isZhongXuanDiao ? '#fff' : canZhongXuan ? C.red : C.disabledText }}>
                    中央选调生
                  </Text>
                  {!canZhongXuan && (
                    <View style={{ backgroundColor: '#E0E0E0', paddingHorizontal: 5, paddingVertical: 1, borderRadius: 3 }}>
                      <Text style={{ fontSize: 9, color: '#757575', fontWeight: '700' }}>需985且620+分</Text>
                    </View>
                  )}
                  {canZhongXuan && !isZhongXuanDiao && (
                    <View style={{ backgroundColor: C.redLight, paddingHorizontal: 5, paddingVertical: 1, borderRadius: 3 }}>
                      <Text style={{ fontSize: 9, color: C.red, fontWeight: '700' }}>已解锁</Text>
                    </View>
                  )}
                </View>
                <Text style={{ fontSize: 10, marginTop: 2,
                  color: isZhongXuanDiao ? 'rgba(255,255,255,0.65)' : canZhongXuan ? C.muted : C.faint }}>
                  {canZhongXuan ? `985院校 · ${degree}学历 · 中央组织部专项计划` : '需选择985院校且分数达620+'}
                </Text>
              </View>
              {canZhongXuan && (
                <View style={{ width: 24, height: 24, borderRadius: 12, borderWidth: 2,
                  borderColor: isZhongXuanDiao ? '#fff' : C.inputBorder,
                  backgroundColor: isZhongXuanDiao ? '#fff' : 'transparent',
                  alignItems: 'center', justifyContent: 'center' }}>
                  {isZhongXuanDiao && <Text style={{ color: C.red, fontSize: 12, fontWeight: '900' }}>✓</Text>}
                </View>
              )}
            </View>
            {canZhongXuan && (
              <View style={{ backgroundColor: isZhongXuanDiao ? '#FFF1F2' : '#FFFAFB', padding: 12 }}>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 5 }}>
                  {[
                    { icon: '⭐', text: degree === '博士' ? '正科起步（乡镇长）' : '副科起步（副乡镇长）', color: C.red, bg: C.redLight, border: C.redMid },
                    { icon: '📈', text: '初始能力 +20', color: C.blue, bg: C.blueLight, border: C.blueMid },
                    { icon: '🏆', text: degree === '博士' ? '初始政绩 +50' : '初始政绩 +30', color: C.green, bg: C.greenLight, border: C.greenMid },
                  ].map(item => (
                    <View key={item.text} style={{ flexDirection: 'row', alignItems: 'center', gap: 4,
                      paddingHorizontal: 8, paddingVertical: 4,
                      backgroundColor: item.bg, borderRadius: 4, borderWidth: 1, borderColor: item.border }}>
                      <Text style={{ fontSize: 11 }}>{item.icon}</Text>
                      <Text style={{ fontSize: 10, color: item.color, fontWeight: '600' }}>{item.text}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </Pressable>

          {/* 军转干部 */}
          <Pressable
            onPress={() => {
              if (!canMilitary) return;
              const next = !isMilitary;
              setIsMilitary(next);
              if (next) setIsZhongXuanDiao(false);
              playStamp();
            }}
            style={{
              borderRadius: 8, overflow: 'hidden',
              borderWidth: isMilitary ? 2.5 : 1.5,
              borderColor: isMilitary ? '#1E3A5F' : canMilitary ? C.cardBorder : C.divider,
              opacity: canMilitary ? 1 : 0.55,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12,
              paddingHorizontal: 14, paddingVertical: 14,
              backgroundColor: isMilitary ? '#1E3A5F' : canMilitary ? '#F0F7FF' : '#F5F5F5' }}>
              <View style={{ width: 44, height: 44, borderRadius: 10,
                backgroundColor: isMilitary ? 'rgba(255,255,255,0.18)' : canMilitary ? '#DBEAFE' : '#EEE',
                alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 22 }}>{canMilitary ? '🎖️' : '🔒'}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={{ fontSize: 14, fontWeight: '800',
                    color: isMilitary ? '#fff' : canMilitary ? '#1E3A5F' : C.disabledText }}>
                    军转干部
                  </Text>
                  {!canMilitary && (
                    <View style={{ backgroundColor: '#E0E0E0', paddingHorizontal: 5, paddingVertical: 1, borderRadius: 3 }}>
                      <Text style={{ fontSize: 9, color: '#757575', fontWeight: '700' }}>本档未解锁（30%概率）</Text>
                    </View>
                  )}
                  {canMilitary && !isMilitary && (
                    <View style={{ backgroundColor: '#DBEAFE', paddingHorizontal: 5, paddingVertical: 1, borderRadius: 3 }}>
                      <Text style={{ fontSize: 9, color: '#1D4ED8', fontWeight: '700' }}>已解锁</Text>
                    </View>
                  )}
                </View>
                <Text style={{ fontSize: 10, marginTop: 2,
                  color: isMilitary ? 'rgba(255,255,255,0.65)' : canMilitary ? C.muted : C.faint }}>
                  {canMilitary ? '军队转业干部 · 破格晋升+10%' : '每个存档仅有30%概率可解锁'}
                </Text>
              </View>
              {canMilitary && (
                <View style={{ width: 24, height: 24, borderRadius: 12, borderWidth: 2,
                  borderColor: isMilitary ? '#fff' : C.inputBorder,
                  backgroundColor: isMilitary ? '#fff' : 'transparent',
                  alignItems: 'center', justifyContent: 'center' }}>
                  {isMilitary && <Text style={{ color: '#1E3A5F', fontSize: 12, fontWeight: '900' }}>✓</Text>}
                </View>
              )}
            </View>
            {canMilitary && (
              <View style={{ backgroundColor: isMilitary ? '#EFF6FF' : '#FAFCFF', padding: 12 }}>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 5 }}>
                  {[
                    { icon: '⭐', text: '破格晋升+10%', color: '#1E3A5F', bg: '#EFF6FF', border: '#BFDBFE' },
                    { icon: '🛡️', text: '初始道德 +10', color: C.green, bg: C.greenLight, border: C.greenMid },
                    { icon: '🤝', text: '初始人脉 +15', color: '#7C3AED', bg: '#F5F3FF', border: '#DDD6FE' },
                  ].map(item => (
                    <View key={item.text} style={{ flexDirection: 'row', alignItems: 'center', gap: 4,
                      paddingHorizontal: 8, paddingVertical: 4,
                      backgroundColor: item.bg, borderRadius: 4, borderWidth: 1, borderColor: item.border }}>
                      <Text style={{ fontSize: 11 }}>{item.icon}</Text>
                      <Text style={{ fontSize: 10, color: item.color, fontWeight: '600' }}>{item.text}</Text>
                    </View>
                  ))}
                </View>
                {isMilitary && familyBackground === '军人家庭' && (
                  <View style={{ marginTop: 8, backgroundColor: '#FEF3C7', borderRadius: 4,
                    borderWidth: 1, borderColor: '#FCD34D', padding: 7 }}>
                    <Text style={{ fontSize: 10, color: '#92400E', fontWeight: '700' }}>
                      🌟 军人家庭 × 军转干部 · 双重加成！破格晋升概率 +20%
                    </Text>
                  </View>
                )}
              </View>
            )}
          </Pressable>
        </Card>
      </ScrollView>
    );
  }

  /* ── PAGE 6：仕途路线选择 + 预览 + 提交 ── */
  function renderPage6() {
    const schoolBadge = SCORE_TIERS.find(t => t.tier === schoolTier)!;

    // 四条仕途路线配置
    type LineOption = {
      key: CareerLine;
      icon: string;
      label: string;
      slogan: string;
      tags: string[];
      accentColor: string;
      bgColor: string;
      borderColor: string;
    };
    const LINE_OPTIONS: LineOption[] = [
      {
        key: '行政线',
        icon: '🏛️',
        label: '行政线',
        slogan: '主政一方，经略山河',
        tags: ['城建规划', '财政管理', '民生治理', '区域治理'],
        accentColor: '#1a5fa8',
        bgColor: '#EBF4FB',
        borderColor: '#2980b9',
      },
      {
        key: '党务线',
        icon: '🔴',
        label: '党务线',
        slogan: '党旗引领，组织先行',
        tags: ['党建工作', '组织建设', '思想宣传', '干部培育'],
        accentColor: '#c0392b',
        bgColor: '#FDECEC',
        borderColor: '#e74c3c',
      },
      {
        key: '纪检线',
        icon: '⚖️',
        label: '纪检线',
        slogan: '铁腕肃纪，清廉为本',
        tags: ['案件查处', '廉政监察', '风险管控', '审查调查'],
        accentColor: '#7d6608',
        bgColor: '#FEF9EC',
        borderColor: '#d4ac0d',
      },
      {
        key: '团派线',
        icon: '🌱',
        label: '团派线',
        slogan: '青春领航，服务青年',
        tags: ['青年工作', '团组织建设', '社会动员', '基层服务'],
        accentColor: '#1a7a4a',
        bgColor: '#EAFAF1',
        borderColor: '#27ae60',
      },
    ];

    return (
      <ScrollView showsVerticalScrollIndicator={false} nestedScrollEnabled>
        {/* 仕途路线选择 */}
        <Card>
          <View style={{ alignItems: 'center', marginBottom: 16, gap: 4 }}>
            <Text style={{ fontSize: 20, fontWeight: '900', color: C.navy, letterSpacing: 4 }}>仕途路线选择</Text>
            <Text style={{ fontSize: 11, color: C.muted }}>路线一经确定，将影响全部晋升称谓与专属玩法</Text>
          </View>

          <View style={{ gap: 10 }}>
            {LINE_OPTIONS.map(opt => {
              const selected = selectedCareerLine === opt.key;
              return (
                <Pressable
                  key={opt.key}
                  onPress={() => { setSelectedCareerLine(opt.key); playStamp(); }}
                  style={{
                    borderRadius: 8, overflow: 'hidden',
                    borderWidth: selected ? 2.5 : 1.5,
                    borderColor: selected ? opt.borderColor : C.cardBorder,
                  }}
                >
                  {/* 主体行 */}
                  <View style={{
                    flexDirection: 'row', alignItems: 'center', gap: 12,
                    paddingHorizontal: 14, paddingVertical: 12,
                    backgroundColor: selected ? opt.bgColor : C.cardBg,
                  }}>
                    {/* 图标 */}
                    <View style={{
                      width: 44, height: 44, borderRadius: 10,
                      backgroundColor: selected ? opt.accentColor + '22' : '#F0EDE6',
                      alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Text style={{ fontSize: 22 }}>{opt.icon}</Text>
                    </View>
                    {/* 文字 */}
                    <View style={{ flex: 1, gap: 3 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={{
                          fontSize: 15, fontWeight: '900', letterSpacing: 1,
                          color: selected ? opt.accentColor : C.navy,
                        }}>
                          {opt.label}
                        </Text>
                        {selected && (
                          <View style={{
                            backgroundColor: opt.accentColor, paddingHorizontal: 6, paddingVertical: 1,
                            borderRadius: 3,
                          }}>
                            <Text style={{ fontSize: 9, color: '#fff', fontWeight: '800' }}>已选定</Text>
                          </View>
                        )}
                      </View>
                      <Text style={{ fontSize: 10, color: C.muted, fontStyle: 'italic' }}>{opt.slogan}</Text>
                      {/* 专属玩法标签 */}
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 2 }}>
                        {opt.tags.map(tag => (
                          <View key={tag} style={{
                            paddingHorizontal: 6, paddingVertical: 2, borderRadius: 3,
                            backgroundColor: selected ? opt.accentColor + '18' : '#F0EDE6',
                            borderWidth: 1,
                            borderColor: selected ? opt.accentColor + '44' : C.divider,
                          }}>
                            <Text style={{ fontSize: 9, fontWeight: '600', color: selected ? opt.accentColor : C.muted }}>
                              {tag}
                            </Text>
                          </View>
                        ))}
                      </View>
                    </View>
                    {/* 单选圆圈 */}
                    <View style={{
                      width: 22, height: 22, borderRadius: 11, borderWidth: 2,
                      borderColor: selected ? opt.accentColor : C.inputBorder,
                      backgroundColor: selected ? opt.accentColor : 'transparent',
                      alignItems: 'center', justifyContent: 'center',
                    }}>
                      {selected && <Text style={{ color: '#fff', fontSize: 11, fontWeight: '900' }}>✓</Text>}
                    </View>
                  </View>
                  {/* 选中时展示专属说明条 */}
                  {selected && (
                    <View style={{ backgroundColor: opt.accentColor + '14', paddingHorizontal: 14, paddingVertical: 7,
                      borderTopWidth: 1, borderTopColor: opt.accentColor + '33' }}>
                      <Text style={{ fontSize: 10, color: opt.accentColor, fontWeight: '700', letterSpacing: 0.5 }}>
                        路线锁定后，晋升称谓、绩效考核与专属页面均以此路线为准，不可中途更改
                      </Text>
                    </View>
                  )}
                </Pressable>
              );
            })}
          </View>

          {/* 提示：路线与仕途一体 */}
          <View style={{ marginTop: 12, backgroundColor: '#1C1917', borderRadius: 6,
            paddingHorizontal: 14, paddingVertical: 10, flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
            <Text style={{ fontSize: 14, marginTop: 1 }}>📌</Text>
            <Text style={{ fontSize: 10, color: 'rgba(255,255,255,0.8)', lineHeight: 16, flex: 1 }}>
              四条仕途路线相互独立，进入游戏后仅显示所属路线的专属页面与功能，其余路线全部隐藏。路线一旦确认，贯穿整个仕途生涯。
            </Text>
          </View>
        </Card>

        {/* 档案预览 */}
        <View style={{ borderRadius: 6, overflow: 'hidden', borderWidth: 1.5, borderColor: C.goldBorder, marginBottom: 14 }}>
          <View style={{ backgroundColor: C.navy, flexDirection: 'row', alignItems: 'center',
            paddingHorizontal: 14, paddingVertical: 10, gap: 8 }}>
            <View style={{ width: 2, height: 16, backgroundColor: C.gold }} />
            <Text style={{ fontSize: 11, color: C.gold, letterSpacing: 2, fontWeight: '800', flex: 1 }}>档  案  预  览</Text>
            <View style={{ backgroundColor: 'rgba(201,149,58,0.2)', paddingHorizontal: 7, paddingVertical: 2,
              borderWidth: 1, borderColor: 'rgba(201,149,58,0.4)' }}>
              <Text style={{ color: C.gold, fontSize: 9, fontWeight: '700' }}>实时更新</Text>
            </View>
          </View>
          <View style={{ backgroundColor: C.cardBg, padding: 14, flexDirection: 'row', gap: 14 }}>
            <View style={{ width: 70, height: 88, backgroundColor: C.blueLight, alignItems: 'center', justifyContent: 'center',
              borderWidth: 1.5, borderColor: C.cardBorder }}>
              <Text style={{ fontSize: 44 }}>{(gender === '女' ? FEMALE_AVATARS : MALE_AVATARS)[avatarIdx]}</Text>
            </View>
            <View style={{ flex: 1, gap: 6 }}>
              <Text style={{ fontSize: 20, fontWeight: '900', color: name ? C.navy : C.faint, letterSpacing: 1.5 }}>
                {name || '（未填写）'}
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4 }}>
                {[gender, `${birthYear}年生`, `${birthProvince}${birthCity}`].map(item => (
                  <View key={item} style={{ backgroundColor: C.blueLight, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 3 }}>
                    <Text style={{ fontSize: 10, color: C.navyMid, fontWeight: '600' }}>{item}</Text>
                  </View>
                ))}
              </View>
              {universityName && (
                <Text style={{ fontSize: 11, color: C.muted }}>
                  {gradYear}年毕业于 {universityName}（{schoolTier === '大专院校' ? '专科' : degree}）
                </Text>
              )}
              {gaokaoScore !== null && (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginTop: 2 }}>
                  <View style={{ backgroundColor: schoolBadge.bg, paddingHorizontal: 7, paddingVertical: 2,
                    borderRadius: 3, borderWidth: 1, borderColor: schoolBadge.border }}>
                    <Text style={{ fontSize: 9, fontWeight: '700', color: schoolBadge.color }}>
                      {schoolBadge.icon} {schoolTier} · {gaokaoScore}分
                    </Text>
                  </View>
                  <View style={{ backgroundColor: C.green, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 3 }}>
                    <Text style={{ color: '#fff', fontSize: 9, fontWeight: '800' }}>
                      {selectedCareerLine === '行政线' ? '🏛️' : selectedCareerLine === '党务线' ? '🔴' : selectedCareerLine === '纪检线' ? '⚖️' : '🌱'} {selectedCareerLine}
                    </Text>
                  </View>
                  {isMilitary && militaryUnlocked && (
                    <View style={{ backgroundColor: '#EFF6FF', paddingHorizontal: 7, paddingVertical: 2,
                      borderRadius: 3, borderWidth: 1, borderColor: '#BFDBFE' }}>
                      <Text style={{ fontSize: 9, fontWeight: '700', color: '#1E3A5F' }}>🎖️ 军转干部</Text>
                    </View>
                  )}
                  {isZhongXuanDiao && zhongXuanUnlocked && (
                    <View style={{ backgroundColor: C.redLight, paddingHorizontal: 7, paddingVertical: 2,
                      borderRadius: 3, borderWidth: 1, borderColor: C.redMid }}>
                      <Text style={{ fontSize: 9, fontWeight: '700', color: C.red }}>🏅 选调生</Text>
                    </View>
                  )}
                </View>
              )}
              <View style={{ marginTop: 2, borderRadius: 4, alignSelf: 'flex-start',
                backgroundColor: (isZhongXuanDiao && zhongXuanUnlocked) ? C.redLight : C.greenLight,
                paddingHorizontal: 9, paddingVertical: 5,
                borderLeftWidth: 3, borderLeftColor: (isZhongXuanDiao && zhongXuanUnlocked) ? C.red : C.green }}>
                <Text style={{ fontSize: 11, fontWeight: '800',
                  color: (isZhongXuanDiao && zhongXuanUnlocked) ? C.red : C.green }}>
                  {(isZhongXuanDiao && zhongXuanUnlocked)
                    ? (degree === '博士' ? '🏅 乡镇长（选调生·正科起步）' : '🏅 副乡镇长（选调生·副科起步）')
                    : (isMilitary && militaryUnlocked)
                      ? '🎖️ 乡镇机关科员（军转干部）'
                      : '🏙️ 乡镇机关科员（AI随机分配部门）'}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* 错误提示 */}
        {error !== '' && (
          <View style={{ backgroundColor: C.redLight, borderRadius: 6, borderLeftWidth: 4, borderLeftColor: C.red,
            paddingHorizontal: 12, paddingVertical: 10, marginBottom: 12, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={{ fontSize: 14 }}>⚠️</Text>
            <Text style={{ fontSize: 12, color: C.red, flex: 1, fontWeight: '600' }}>{error}</Text>
          </View>
        )}

        {/* 提交按钮 */}
        <Pressable
          onPress={handleCreate}
          disabled={loading}
          cssInterop={false}
          onPressIn={() => setSubmitPressed(true)}
          onPressOut={() => setSubmitPressed(false)}
          style={{
            borderRadius: 6, overflow: 'hidden',
            backgroundColor: submitPressed ? C.headerBg2 : C.headerBg,
            opacity: loading ? 0.7 : 1, marginBottom: 10,
          }}
        >
          <View style={{ height: 2, backgroundColor: C.gold }} />
          <View style={{ paddingVertical: 18, paddingHorizontal: 20, alignItems: 'center', gap: 4 }}>
            {loading ? (
              <View style={{ alignItems: 'center', gap: 6 }}>
                <ActivityIndicator color={C.gold} />
                <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11 }}>正在建立档案，即将进入游戏…</Text>
              </View>
            ) : (
              <>
                <Text style={{ color: '#fff', fontWeight: '900', fontSize: 17, letterSpacing: 6 }}>确认建档 · 开始仕途</Text>
                <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 10, letterSpacing: 2 }}>青云之路 · 从科员到国家领导人</Text>
              </>
            )}
          </View>
          <View style={{ height: 2, backgroundColor: C.gold }} />
        </Pressable>

        <Text style={{ textAlign: 'center', fontSize: 10, color: C.muted, marginBottom: 14 }}>
          提交后游戏正式开始，档案数据不可修改
        </Text>

        {/* 开发者信息 */}
        <View style={{ borderWidth: 1, borderColor: C.divider, borderRadius: 4, padding: 12,
          backgroundColor: C.cardBg, alignItems: 'center', gap: 4, marginBottom: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View style={{ width: 20, height: 1, backgroundColor: C.gold, opacity: 0.5 }} />
            <Text style={{ fontSize: 10, color: C.muted, letterSpacing: 1 }}>开发者信息</Text>
            <View style={{ width: 20, height: 1, backgroundColor: C.gold, opacity: 0.5 }} />
          </View>
          <Text style={{ fontSize: 11, color: C.gold, fontWeight: '700', letterSpacing: 0.5 }}>官方QQ交流群：1037034003</Text>
          <Text style={{ fontSize: 11, color: '#A07834', letterSpacing: 0.5 }}>开发者 高仙客来  QQ：2794045093</Text>
        </View>
      </ScrollView>
    );
  }

  /* ─────────── 主渲染 ─────────── */
  const pageValid = canGoNext();

  return (
    <KeyboardAvoidingView
      behavior={process.env.EXPO_OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1, backgroundColor: C.pageBg }}
    >
      <StatusBar style="light" backgroundColor={C.headerBg} />

      {/* ── 顶部红头 ── */}
      <View style={{ backgroundColor: C.headerBg, paddingTop: insets.top + 6, overflow: 'hidden' }}>
        <View style={{ position: 'absolute', top: 0, right: -30, width: 120, height: 140,
          backgroundColor: C.headerBg2, opacity: 0.4, transform: [{ rotate: '15deg' }] }} />
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
          paddingHorizontal: 18, marginBottom: 6 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <View style={{ width: 6, height: 6, backgroundColor: C.gold, borderRadius: 3 }} />
            <Text style={{ fontSize: 10, color: 'rgba(255,255,255,0.65)', letterSpacing: 1.5 }}>
              华夏人民共和国 · 中央组织部
            </Text>
          </View>
          <View style={{ backgroundColor: 'rgba(201,149,58,0.2)', paddingHorizontal: 7, paddingVertical: 2,
            borderWidth: 1, borderColor: 'rgba(201,149,58,0.5)' }}>
            <Text style={{ fontSize: 9, color: C.goldBorder, fontWeight: '700', letterSpacing: 1 }}>绝密★长期</Text>
          </View>
        </View>
        <View style={{ marginHorizontal: 18, marginBottom: 10 }}>
          <View style={{ height: 2, backgroundColor: C.gold }} />
          <View style={{ height: 1, backgroundColor: C.gold, marginTop: 2, opacity: 0.45 }} />
        </View>
        <View style={{ alignItems: 'center', paddingHorizontal: 18, marginBottom: 10 }}>
          <Text style={{ fontSize: 22, fontWeight: '900', color: '#FFFFFF', letterSpacing: 8, textAlign: 'center',
            textShadowColor: 'rgba(0,0,0,0.3)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 }}>
            干部履历登记表
          </Text>
        </View>
        {/* 步骤进度条 */}
        <StepBar current={page} />
      </View>

      {/* ── 页面内容 ── */}
      <ScrollView
        contentContainerStyle={{ padding: 14, paddingBottom: 20, flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {page === 1 && renderPage1()}
        {page === 2 && renderPage2()}
        {page === 3 && renderPage3()}
        {page === 4 && renderPage4()}
        {page === 5 && renderPage5()}
        {page === 6 && renderPage6()}
      </ScrollView>

      {/* ── 底部导航按钮（第6页无下一步按钮）── */}
      {page < 6 && (
        <View style={{
          flexDirection: 'row', gap: 10,
          paddingHorizontal: 16, paddingVertical: 12,
          paddingBottom: insets.bottom + 12,
          backgroundColor: C.pageBg,
          borderTopWidth: 1, borderTopColor: C.divider,
        }}>
          {page > 1 ? (
            <Pressable
              onPress={goPrev}
              style={{ flex: 1, paddingVertical: 14, borderRadius: 6, alignItems: 'center',
                borderWidth: 1.5, borderColor: C.inputBorder, backgroundColor: C.cardBg }}
            >
              <Text style={{ fontSize: 15, fontWeight: '700', color: C.navyMid, letterSpacing: 1 }}>← 上一步</Text>
            </Pressable>
          ) : <View style={{ flex: 1 }} />}

          <Pressable
            onPress={goNext}
            disabled={!pageValid}
            style={{
              flex: 2, paddingVertical: 14, borderRadius: 6, alignItems: 'center',
              backgroundColor: pageValid ? C.headerBg : C.disabled,
            }}
          >
            <Text style={{ fontSize: 15, fontWeight: '900', letterSpacing: 2,
              color: pageValid ? '#fff' : C.disabledText }}>
              {page === 5 ? '下一步 → 选择仕途路线' : '下一步 →'}
            </Text>
            {page === 1 && !pageValid && (
              <Text style={{ fontSize: 10, color: C.disabledText, marginTop: 2 }}>请先填写姓名</Text>
            )}
            {page === 3 && !pageValid && (
              <Text style={{ fontSize: 10, color: C.disabledText, marginTop: 2 }}>请先生成高考分数</Text>
            )}
            {page === 4 && !pageValid && (
              <Text style={{ fontSize: 10, color: C.disabledText, marginTop: 2 }}>请先选择就读院校</Text>
            )}
          </Pressable>
        </View>
      )}

      {/* 第6页时留底部安全区 */}
      {page === 6 && <View style={{ height: insets.bottom }} />}
    </KeyboardAvoidingView>
  );
}
