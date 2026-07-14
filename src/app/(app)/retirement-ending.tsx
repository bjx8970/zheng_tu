// 退休结局页——功成身退 / 组织免职
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Easing, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import { supabase } from '@/client/supabase';
import { useGame } from '@/ctx/GameContext';
import { getSubordinates, deleteSave } from '@/db/gameApi';
import { gameDaysToDate, RANK_CONFIG, getAvatarEmoji, getAvatarBgColor, formatMoney, getRetirementConfig } from '@/types/game';

/** 计算仕途年数 */
function calcCareerYears(gameDays: number): number {
  return Math.floor(gameDays / 365);
}

/** 获取退休后待遇描述 */
function getRetirementBenefits(rankLevel: number): string[] {
  if (rankLevel >= 14) {
    return [
      '保留最高政治待遇，享受国家领导人礼遇',
      '可受邀出席国家重大典礼与外交活动',
      '参与国家重大战略决策咨询',
      '宏观政策建言渠道畅通，影响深远',
      '国家为您保障专职医疗保健与安保团队',
    ];
  }
  if (rankLevel >= 13) {
    return [
      '享受副国家级政治待遇与相应生活保障',
      '可受邀参与重大政策咨询',
      '在重要节假日出席党和国家领导层活动',
      '专职医疗保健与生活服务',
    ];
  }
  if (rankLevel >= 11) {
    return [
      '享受正部级或副部级退休待遇',
      '退休工资为在职工资的90%',
      '相应级别的医疗保健服务',
      '参与相关领域顾问与咨询工作',
    ];
  }
  return [
    '享受相应职级退休工资待遇',
    '基本医疗保险与社会保障',
    '地方组织优秀退休干部表彰',
  ];
}

/** 道德评价 */
function getMoralLabel(moralValue: number): { label: string; color: string } {
  if (moralValue >= 80) return { label: '廉洁奉公', color: '#2a7a3b' };
  if (moralValue >= 60) return { label: '清廉勤政', color: '#4a7c59' };
  if (moralValue >= 40) return { label: '中规中矩', color: '#888' };
  if (moralValue >= 20) return { label: '瑕不掩瑜', color: '#C87820' };
  return { label: '留有污点', color: '#C82829' };
}

/** 政绩评价 */
function getMeritLabel(meritPoints: number, rankLevel: number): { label: string; color: string } {
  const required = RANK_CONFIG[rankLevel]?.requiredMerit ?? 100;
  const ratio = meritPoints / required;
  if (ratio >= 3) return { label: '建树卓著', color: '#2a7a3b' };
  if (ratio >= 2) return { label: '政绩斐然', color: '#4a7c59' };
  if (ratio >= 1) return { label: '政绩扎实', color: '#2B4B6F' };
  return { label: '政绩平淡', color: '#888' };
}

/** 家庭幸福评价 */
function getFamilyLabel(familyHappiness: number): { label: string; color: string } {
  if (familyHappiness >= 80) return { label: '家庭美满', color: '#2a7a3b' };
  if (familyHappiness >= 60) return { label: '家庭和睦', color: '#4a7c59' };
  if (familyHappiness >= 40) return { label: '家庭尚可', color: '#888' };
  return { label: '聚少离多', color: '#C87820' };
}

export default function RetirementEndingScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{ type?: string }>();
  const isPurge = params.type === 'purge';

  const { save, isLoading, setIsRunning } = useGame();
  const [subCount, setSubCount] = useState(0);
  const [promotedCount, setPromotedCount] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  // 下马动画状态
  const [purgePhase, setPurgePhase] = useState<'stamp' | 'summary'>('stamp');
  const stampScale = useRef(new Animated.Value(0)).current;
  const stampOpacity = useRef(new Animated.Value(0)).current;
  const stampRotate = useRef(new Animated.Value(-15)).current;
  const overlayOpacity = useRef(new Animated.Value(1)).current;
  const summaryOpacity = useRef(new Animated.Value(0)).current;

  useFocusEffect(
    useCallback(() => {
      setIsRunning(false);
    }, [setIsRunning])
  );

  // 下马动画序列
  useEffect(() => {
    if (!isPurge) return;
    // 印章冲入动画
    Animated.sequence([
      Animated.delay(400),
      Animated.parallel([
        Animated.spring(stampScale, { toValue: 1, friction: 4, tension: 120, useNativeDriver: true }),
        Animated.timing(stampOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.spring(stampRotate, { toValue: -8, friction: 6, tension: 80, useNativeDriver: true }),
      ]),
      Animated.delay(1600),
      // 淡出全屏遮罩，进入总结页
      Animated.timing(overlayOpacity, { toValue: 0, duration: 600, easing: Easing.out(Easing.quad), useNativeDriver: true }),
    ]).start(() => {
      setPurgePhase('summary');
      Animated.timing(summaryOpacity, { toValue: 1, duration: 400, useNativeDriver: true }).start();
    });
  }, [isPurge, stampScale, stampOpacity, stampRotate, overlayOpacity, summaryOpacity]);

  useEffect(() => {
    if (!save) return;
    (async () => {
      const subs = await getSubordinates(save.id);
      setSubCount(subs.length);
      setPromotedCount(subs.filter(s => s.subLevel >= 2).length);
    })();
  }, [save]);

  const handleRestart = async () => {
    if (!save) return;
    setIsDeleting(true);
    await deleteSave(save.id);
    setIsRunning(false);
    await supabase.auth.signOut();
    router.replace('/(auth)/sign-in');
  };

  if (isLoading || !save) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#1a2740' }}>
        <ActivityIndicator size="large" color="#C8A84B" />
      </View>
    );
  }

  const careerYears = calcCareerYears(save.gameDays);
  const retireDate = gameDaysToDate(save.gameDays);
  const retireCfg = getRetirementConfig(save.rankLevel);
  const benefits = getRetirementBenefits(save.rankLevel);
  const moralEval = getMoralLabel(save.moralValue);
  const meritEval = getMeritLabel(save.meritPoints, save.rankLevel);
  const familyEval = getFamilyLabel(save.familyHappiness ?? 0);
  const avatarEmoji = getAvatarEmoji(save.avatarId, save.playerGender);
  const avatarBg = getAvatarBgColor(save.avatarId, isPurge ? 'reform' : 'pragmatic');

  // ══ 下马结局：全屏印章动画 ══
  if (isPurge) {
    const rotateStr = stampRotate.interpolate({ inputRange: [-30, 30], outputRange: ['-30deg', '30deg'] });
    return (
      <View style={{ flex: 1, backgroundColor: '#0A0A0A' }}>
        <StatusBar style="light" />

        {/* 印章动画遮罩（phase=stamp时显示） */}
        {purgePhase === 'stamp' && (
          <Animated.View style={{
            ...{ position: 'absolute', inset: 0, alignItems: 'center', justifyContent: 'center', zIndex: 10 },
            opacity: overlayOpacity,
          }}>
            {/* 背景纹理层 */}
            <View style={{ position: 'absolute', inset: 0, backgroundColor: '#0D0D0D' }} />
            {/* 竖向红线装饰 */}
            <View style={{ position: 'absolute', left: '20%', top: 0, bottom: 0, width: 1, backgroundColor: '#5A000022' }} />
            <View style={{ position: 'absolute', right: '20%', top: 0, bottom: 0, width: 1, backgroundColor: '#5A000022' }} />

            {/* 中央印章 */}
            <Animated.View style={{
              transform: [{ scale: stampScale }, { rotate: rotateStr }],
              opacity: stampOpacity,
              alignItems: 'center', justifyContent: 'center',
            }}>
              {/* 外圆框 */}
              <View style={{
                width: 220, height: 220, borderRadius: 110,
                borderWidth: 6, borderColor: '#B00000',
                alignItems: 'center', justifyContent: 'center',
                backgroundColor: 'transparent',
              }}>
                {/* 内层双圆 */}
                <View style={{
                  width: 196, height: 196, borderRadius: 98,
                  borderWidth: 2, borderColor: '#C82829',
                  alignItems: 'center', justifyContent: 'center',
                  gap: 4,
                }}>
                  <Text style={{ fontSize: 13, color: '#C82829', letterSpacing: 6, fontWeight: '700' }}>组织决定</Text>
                  <Text style={{ fontSize: 30, color: '#B00000', fontWeight: '900', letterSpacing: 4 }}>免职</Text>
                  <Text style={{ fontSize: 11, color: '#C82829', letterSpacing: 3 }}>即日起生效</Text>
                  <View style={{ marginTop: 6, width: 80, height: 2, backgroundColor: '#B00000' }} />
                  <Text style={{ fontSize: 9, color: '#C8282988', letterSpacing: 2, marginTop: 4 }}>{retireDate}</Text>
                </View>
              </View>

              {/* 印章文字环（上下弧线效果用直线模拟） */}
              <View style={{ position: 'absolute', top: -6, left: 0, right: 0, alignItems: 'center' }}>
                <Text style={{ fontSize: 9, color: '#C82829AA', letterSpacing: 4, fontWeight: '700' }}>
                  ★ 从政之路 · 组织人事委员会 ★
                </Text>
              </View>
            </Animated.View>

            {/* 底部说明 */}
            <Animated.View style={{ position: 'absolute', bottom: 80 + insets.bottom, alignItems: 'center', gap: 6, opacity: stampOpacity }}>
              <Text style={{ fontSize: 12, color: '#8B0000', letterSpacing: 2, fontWeight: '700' }}>政治生涯宣告终结</Text>
              <Text style={{ fontSize: 10, color: '#555', letterSpacing: 1 }}>正在生成生涯总结…</Text>
            </Animated.View>
          </Animated.View>
        )}

        {/* 总结页（phase=summary时显示） */}
        {purgePhase === 'summary' && (
          <Animated.View style={{ flex: 1, opacity: summaryOpacity }}>
            <ScrollView
              contentContainerStyle={{ paddingBottom: 60 }}
              contentInsetAdjustmentBehavior="automatic"
            >
              {/* 顶部：下马横幅 */}
              <View style={{
                backgroundColor: '#1A0000',
                paddingTop: insets.top + 8, paddingBottom: 28,
                paddingHorizontal: 24,
                alignItems: 'center',
                gap: 12,
                borderBottomWidth: 2,
                borderBottomColor: '#B00000',
              }}>
                <View style={{
                  width: 70, height: 70, borderRadius: 35,
                  backgroundColor: avatarBg,
                  alignItems: 'center', justifyContent: 'center',
                  borderWidth: 3, borderColor: '#B00000',
                }}>
                  <Text style={{ fontSize: 34 }}>{avatarEmoji}</Text>
                </View>

                <View style={{ alignItems: 'center', gap: 4 }}>
                  <Text style={{ fontSize: 20, fontWeight: '700', color: '#FFDADA', letterSpacing: 2 }}>
                    {save.playerName}
                  </Text>
                  <Text style={{ fontSize: 12, color: '#CC4444', letterSpacing: 1 }}>
                    {save.rankName}  ·  {save.playerGender}  ·  {save.playerAge}岁
                  </Text>
                  <Text style={{ fontSize: 10, color: '#664444', marginTop: 2 }}>
                    📅 免职日期：{retireDate}
                  </Text>
                </View>

                {/* 下马横幅 */}
                <View style={{
                  backgroundColor: '#B0000022', borderRadius: 2,
                  borderWidth: 1, borderColor: '#B0000088',
                  paddingVertical: 8, paddingHorizontal: 20,
                  marginTop: 4,
                }}>
                  <Text style={{ fontSize: 14, color: '#C82829', fontWeight: '700', letterSpacing: 3 }}>
                    ✦  仕途尽头  ·  组织免职  ✦
                  </Text>
                </View>
              </View>

              <View style={{ paddingHorizontal: 20, paddingTop: 20, gap: 16 }}>
                {/* 仕途数据 */}
                <View style={{
                  backgroundColor: '#1A0808', borderRadius: 4,
                  borderWidth: 1, borderColor: '#4A1010',
                  overflow: 'hidden',
                }}>
                  <View style={{ backgroundColor: '#2D0A0A', paddingVertical: 10, paddingHorizontal: 16 }}>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: '#FF8080', letterSpacing: 1 }}>◆ 仕途历程</Text>
                  </View>
                  <View style={{ padding: 16, gap: 10 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                      <SummaryItem label="从政年数" value={`${careerYears} 年`} color="#C82829" />
                      <SummaryItem label="最终职级" value={retireCfg.tier} color="#FFDADA" />
                      <SummaryItem label="最终职务" value={save.rankName} color="#FFDADA" />
                      <SummaryItem label="末任城市" value={save.cityName} color="#BB8888" />
                    </View>
                  </View>
                </View>

                {/* 政绩评鉴 */}
                <View style={{
                  backgroundColor: '#1A0808', borderRadius: 4,
                  borderWidth: 1, borderColor: '#4A1010',
                  overflow: 'hidden',
                }}>
                  <View style={{ backgroundColor: '#2D0A0A', paddingVertical: 10, paddingHorizontal: 16 }}>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: '#FF8080', letterSpacing: 1 }}>◆ 为政评鉴</Text>
                  </View>
                  <View style={{ padding: 16, gap: 12 }}>
                    <EvalRow label="累计政绩" value={`${Math.floor(save.meritPoints)} 分`} evalLabel={meritEval.label} evalColor={meritEval.color} dark />
                    <EvalRow label="道德操守" value={`${save.moralValue} / 100`} evalLabel={moralEval.label} evalColor={moralEval.color} dark />
                    <EvalRow label="家庭生活" value={`幸福度 ${save.familyHappiness ?? 0}`} evalLabel={familyEval.label} evalColor={familyEval.color} dark />
                    <EvalRow label="个人积蓄" value={formatMoney(save.personalSavings ?? 0)} evalLabel="从政所得" evalColor="#666" dark />
                    <EvalRow label="人脉积分" value={`${save.networkValue ?? 0} 点`} evalLabel="人际资本" evalColor="#9B7AFF" dark />
                  </View>
                </View>

                {/* 干部培养 */}
                <View style={{
                  backgroundColor: '#1A0808', borderRadius: 4,
                  borderWidth: 1, borderColor: '#4A1010',
                  overflow: 'hidden',
                }}>
                  <View style={{ backgroundColor: '#2D0A0A', paddingVertical: 10, paddingHorizontal: 16 }}>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: '#FF8080', letterSpacing: 1 }}>◆ 干部培养</Text>
                  </View>
                  <View style={{ padding: 16, gap: 10 }}>
                    <View style={{ flexDirection: 'row', gap: 16, flexWrap: 'wrap' }}>
                      <SummaryItem label="管辖下属" value={`${subCount} 人`} color="#BB8888" />
                      <SummaryItem label="提拔晋升" value={`${promotedCount} 人`} color="#AA6666" />
                    </View>
                  </View>
                </View>

                {/* 失职原因 */}
                <View style={{
                  backgroundColor: '#100000', borderRadius: 4,
                  borderWidth: 1, borderColor: '#B00000AA',
                  padding: 16, gap: 8,
                }}>
                  <Text style={{ fontSize: 12, color: '#C82829', fontWeight: '700', letterSpacing: 2, marginBottom: 4 }}>⚠ 组织免职原因</Text>
                  <Text style={{ fontSize: 12, color: '#FFDADA', lineHeight: 22 }}>
                    连续多届任期绩效考核不合格，未能达到组织要求的施政标准。{'\n'}
                    经党组织研究决定，对其予以免职处理，解除一切职务。
                  </Text>
                  <Text style={{ fontSize: 11, color: '#664444', marginTop: 4, lineHeight: 18 }}>
                    这是每一位仕途官员必须铭记的教训——政绩靠真干，位置靠实绩。
                  </Text>
                </View>

                {/* 结语 */}
                <View style={{
                  backgroundColor: '#0D0000', borderRadius: 4,
                  borderWidth: 1, borderColor: '#B0000044',
                  padding: 20, alignItems: 'center', gap: 8,
                }}>
                  <Text style={{ fontSize: 13, color: '#C82829', letterSpacing: 2, fontWeight: '700' }}>
                    「以史为镜，可以知兴替」
                  </Text>
                  <Text style={{ fontSize: 11, color: '#554444', textAlign: 'center', lineHeight: 18 }}>
                    {save.playerName}同志，{careerYears}年的政途就此画上句点。{'\n'}
                    愿重新出发，知耻而后勇。
                  </Text>
                </View>

                {/* 操作按钮 */}
                <View style={{ gap: 10, marginTop: 8 }}>
                  <RestartBtn onPress={handleRestart} isDeleting={isDeleting} purge />
                  <SignOutBtn onPress={async () => {
                    await supabase.auth.signOut();
                    router.replace('/(auth)/sign-in');
                  }} />
                </View>
              </View>
            </ScrollView>
          </Animated.View>
        )}
      </View>
    );
  }

  // ══ 正常退休结局 ══
  return (
    <View style={{ flex: 1, backgroundColor: '#0E1B2D' }}>
      <StatusBar style="light" />
      <ScrollView
        contentContainerStyle={{ paddingBottom: 60 }}
        contentInsetAdjustmentBehavior="automatic"
      >
        {/* 顶部英雄区 */}
        <View style={{
          backgroundColor: '#162338',
          paddingTop: insets.top + 8, paddingBottom: 32,
          paddingHorizontal: 24,
          alignItems: 'center',
          gap: 14,
          borderBottomWidth: 1,
          borderBottomColor: '#C8A84B44',
        }}>
          {/* 头像 */}
          <View style={{
            width: 80, height: 80, borderRadius: 40,
            backgroundColor: avatarBg,
            alignItems: 'center', justifyContent: 'center',
            borderWidth: 3, borderColor: '#C8A84B',
          }}>
            <Text style={{ fontSize: 40 }}>{avatarEmoji}</Text>
          </View>

          {/* 名称与职务 */}
          <View style={{ alignItems: 'center', gap: 6 }}>
            <Text style={{ fontSize: 22, fontWeight: '700', color: '#F0E8D0', letterSpacing: 2 }}>
              {save.playerName}
            </Text>
            <Text style={{ fontSize: 13, color: '#C8A84B', letterSpacing: 1 }}>
              {save.rankName}  ·  {save.playerGender}  ·  {save.playerAge}岁
            </Text>
            <Text style={{ fontSize: 11, color: '#8899AA', marginTop: 2 }}>
              📅 退休日期：{retireDate}
            </Text>
          </View>

          {/* 功成身退横幅 */}
          <View style={{
            backgroundColor: '#C8A84B22', borderRadius: 2,
            borderWidth: 1, borderColor: '#C8A84B66',
            paddingVertical: 8, paddingHorizontal: 20,
            marginTop: 4,
          }}>
            <Text style={{ fontSize: 15, color: '#C8A84B', fontWeight: '700', letterSpacing: 3 }}>
              ✦  功成身退  ·  垂范后世  ✦
            </Text>
          </View>
        </View>

        <View style={{ paddingHorizontal: 20, paddingTop: 20, gap: 16 }}>
          {/* 仕途概览 */}
          <View style={{
            backgroundColor: '#1C2E45', borderRadius: 4,
            borderWidth: 1, borderColor: '#2D4A6B',
            overflow: 'hidden',
          }}>
            <View style={{ backgroundColor: '#2B4B6F', paddingVertical: 10, paddingHorizontal: 16 }}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: '#C8E0F4', letterSpacing: 1 }}>
                ◆ 仕途历程总览
              </Text>
            </View>
            <View style={{ padding: 16, gap: 10 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                <SummaryItem label="仕途年数" value={`${careerYears} 年`} color="#C8A84B" />
                <SummaryItem label="最终职级" value={retireCfg.tier} color="#C8E0F4" />
                <SummaryItem label="最终职务" value={save.rankName} color="#C8E0F4" />
                <SummaryItem label="末任城市" value={save.cityName} color="#88BBDD" />
              </View>
            </View>
          </View>

          {/* 政绩与道德 */}
          <View style={{
            backgroundColor: '#1C2E45', borderRadius: 4,
            borderWidth: 1, borderColor: '#2D4A6B',
            overflow: 'hidden',
          }}>
            <View style={{ backgroundColor: '#2B4B6F', paddingVertical: 10, paddingHorizontal: 16 }}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: '#C8E0F4', letterSpacing: 1 }}>
                ◆ 为政评鉴
              </Text>
            </View>
            <View style={{ padding: 16, gap: 12 }}>
              <EvalRow
                label="累计政绩"
                value={`${Math.floor(save.meritPoints)} 分`}
                evalLabel={meritEval.label}
                evalColor={meritEval.color}
              />
              <EvalRow
                label="道德操守"
                value={`${save.moralValue} / 100`}
                evalLabel={moralEval.label}
                evalColor={moralEval.color}
              />
              <EvalRow
                label="家庭生活"
                value={`幸福度 ${save.familyHappiness ?? 0}`}
                evalLabel={familyEval.label}
                evalColor={familyEval.color}
              />
              <EvalRow
                label="个人积蓄"
                value={formatMoney(save.personalSavings ?? 0)}
                evalLabel="从政所得"
                evalColor="#888"
              />
            </View>
          </View>

          {/* 干部培养 */}
          <View style={{
            backgroundColor: '#1C2E45', borderRadius: 4,
            borderWidth: 1, borderColor: '#2D4A6B',
            overflow: 'hidden',
          }}>
            <View style={{ backgroundColor: '#2B4B6F', paddingVertical: 10, paddingHorizontal: 16 }}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: '#C8E0F4', letterSpacing: 1 }}>
                ◆ 干部培养成果
              </Text>
            </View>
            <View style={{ padding: 16, gap: 10 }}>
              <View style={{ flexDirection: 'row', gap: 16, flexWrap: 'wrap' }}>
                <SummaryItem label="管辖下属" value={`${subCount} 人`} color="#88BBDD" />
                <SummaryItem label="提拔晋升" value={`${promotedCount} 人`} color="#2a7a3b" />
              </View>
              <Text style={{ fontSize: 11, color: '#6688AA', lineHeight: 18, marginTop: 4 }}>
                您培养的干部将继续为党和国家事业服务，薪火相传，政治遗产长存。
              </Text>
            </View>
          </View>

          {/* 退休待遇 */}
          <View style={{
            backgroundColor: '#1C2E45', borderRadius: 4,
            borderWidth: 1, borderColor: '#C8A84B44',
            overflow: 'hidden',
          }}>
            <View style={{ backgroundColor: '#3A3010', paddingVertical: 10, paddingHorizontal: 16 }}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: '#C8A84B', letterSpacing: 1 }}>
                ◆ 退休后政治待遇
              </Text>
            </View>
            <View style={{ padding: 16, gap: 8 }}>
              {benefits.map((b, i) => (
                <View key={i} style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-start' }}>
                  <Text style={{ color: '#C8A84B', fontSize: 12, marginTop: 1 }}>✦</Text>
                  <Text style={{ fontSize: 12, color: '#AABDD0', lineHeight: 20, flex: 1 }}>{b}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* 结语 */}
          <View style={{
            backgroundColor: '#12202F', borderRadius: 4,
            borderWidth: 1, borderColor: '#C8A84B33',
            padding: 20, alignItems: 'center', gap: 8,
          }}>
            <Text style={{ fontSize: 14, color: '#C8A84B', letterSpacing: 2, fontWeight: '700' }}>
              「居庙堂之高则忧其民，处江湖之远则忧其君」
            </Text>
            <Text style={{ fontSize: 11, color: '#5A7A99', textAlign: 'center', lineHeight: 18 }}>
              {save.playerName}同志，您以{careerYears}年如一日的奉献精神，{'\n'}
              书写了属于自己的政途传奇。
            </Text>
          </View>

          {/* 操作按钮 */}
          <View style={{ gap: 10, marginTop: 8 }}>
            <RestartBtn onPress={handleRestart} isDeleting={isDeleting} />
            <SignOutBtn onPress={async () => {
              await supabase.auth.signOut();
              router.replace('/(auth)/sign-in');
            }} />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

/** 概览数据项 */
function SummaryItem({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={{ alignItems: 'center', minWidth: 80 }}>
      <Text style={{ fontSize: 10, color: '#6688AA', marginBottom: 2 }}>{label}</Text>
      <Text style={{ fontSize: 15, fontWeight: '700', color }}>{value}</Text>
    </View>
  );
}

/** 评鉴行 */
function EvalRow({
  label, value, evalLabel, evalColor, dark,
}: {
  label: string; value: string; evalLabel: string; evalColor: string; dark?: boolean;
}) {
  const borderColor = dark ? '#2E1010' : '#1E3050';
  const labelColor = dark ? '#AA6666' : '#7799BB';
  const valueColor = dark ? '#FFDADA' : '#C8E0F4';
  return (
    <View style={{
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
      paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: borderColor,
    }}>
      <Text style={{ fontSize: 12, color: labelColor }}>{label}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Text style={{ fontSize: 13, color: valueColor, fontVariant: ['tabular-nums'] }}>{value}</Text>
        <View style={{
          backgroundColor: evalColor + '22', borderRadius: 2,
          paddingHorizontal: 6, paddingVertical: 2,
          borderWidth: 1, borderColor: evalColor + '55',
        }}>
          <Text style={{ fontSize: 10, color: evalColor, fontWeight: '700' }}>{evalLabel}</Text>
        </View>
      </View>
    </View>
  );
}

/** 重新开始按钮 */
function RestartBtn({ onPress, isDeleting, purge }: { onPress: () => void; isDeleting: boolean; purge?: boolean }) {
  const [pressed, setPressed] = useState(false);
  const bg = purge ? (pressed ? '#4A0000' : '#3A0000') : (pressed ? '#8A1418' : '#7A1B1E');
  return (
    <Pressable
      onPress={onPress}
      disabled={isDeleting}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      style={{
        backgroundColor: bg,
        paddingVertical: 14, alignItems: 'center', borderRadius: 4,
        opacity: isDeleting ? 0.6 : 1,
        borderWidth: purge ? 1 : 0,
        borderColor: purge ? '#B00000' : 'transparent',
      }}
    >
      {isDeleting ? (
        <ActivityIndicator size="small" color="#fff" />
      ) : (
        <Text style={{ color: purge ? '#FFDADA' : '#fff', fontSize: 15, fontWeight: '700', letterSpacing: 1 }}>
          🔄  重新开始仕途
        </Text>
      )}
    </Pressable>
  );
}

/** 退出游戏按钮 */
function SignOutBtn({ onPress }: { onPress: () => void }) {
  const [pressed, setPressed] = useState(false);
  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      style={{
        backgroundColor: pressed ? '#0E1B2D' : 'transparent',
        paddingVertical: 14, alignItems: 'center', borderRadius: 4,
        borderWidth: 1, borderColor: '#2D4A6B',
      }}
    >
      <Text style={{ color: '#6688AA', fontSize: 14, letterSpacing: 1 }}>
        退出游戏
      </Text>
    </Pressable>
  );
}
