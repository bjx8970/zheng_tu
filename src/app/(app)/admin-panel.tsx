// 后台管理面板 — 仅管理员可访问
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import { supabase } from '@/client/supabase';

/* ─── 配色 ─── */
const C = {
  bg:         '#0A1628',
  bgCard:     '#0D1F35',
  primary:    '#1A56B0',
  accent:     '#C82829',
  border:     '#1E3458',
  text:       '#E8F0FA',
  textMid:    '#8AA0BA',
  textDim:    '#4A6080',
  gold:       '#C8A84B',
  success:    '#2a7a3b',
  successBg:  'rgba(42,122,59,0.12)',
  errBg:      'rgba(200,40,40,0.12)',
  errText:    '#FF6B6B',
};

type UserRow = {
  id: string;
  email: string;
  username: string;
  created_at: string;
  player_name: string | null;
  player_position: string | null;
  rank_level: number | null;
  city_name: string | null;
  is_admin: boolean;
  is_orphan?: boolean; // player_saves存在但auth账号已注销
};

/** 兑换码记录类型 */
type RedeemCodeRow = {
  id: string;
  code: string;
  display_name: string;
  reward_type: string;
  batch_note: string;
  is_used: boolean;
  used_at: string | null;
  created_at: string;
};

const REWARD_LABELS: Record<string, string> = {
  rank_up: '⬆️ 晋升一级',
  auto_unlock: '⏯ 解锁自动推进（永久·单档一次）',
};

export default function AdminPanel() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'accounts' | 'redeem'>('accounts');
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [searchFocus, setSearchFocus] = useState(false);

  // ── 兑换码管理状态 ──
  const [redeemCodes, setRedeemCodes] = useState<RedeemCodeRow[]>([]);
  const [redeemLoading, setRedeemLoading] = useState(false);
  const [redeemError, setRedeemError] = useState('');
  const [genRewardType, setGenRewardType] = useState<string>('rank_up');
  const [genBatchNote, setGenBatchNote] = useState('');
  const [genCount, setGenCount] = useState('1');
  const [generating, setGenerating] = useState(false);
  const [genMsg, setGenMsg] = useState('');
  const [genError, setGenError] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [redeemFilter, setRedeemFilter] = useState<'all' | 'unused' | 'used'>('all');

  // 加载兑换码列表
  const loadRedeemCodes = useCallback(async () => {
    setRedeemLoading(true);
    setRedeemError('');
    try {
      const { data, error: err } = await supabase
        .from('redeem_codes')
        .select('id, code, display_name, reward_type, batch_note, is_used, used_at, created_at')
        .order('created_at', { ascending: false })
        .limit(200);
      if (err) throw new Error(err.message);
      setRedeemCodes((data ?? []) as RedeemCodeRow[]);
    } catch (e) {
      setRedeemError(e instanceof Error ? e.message : '加载失败');
    } finally {
      setRedeemLoading(false);
    }
  }, []);

  // 生成兑换码（调用 Edge Function）
  const handleGenerate = async () => {
    if (generating) return;
    setGenerating(true);
    setGenMsg('');
    setGenError('');
    const countNum = Math.max(1, Math.min(20, parseInt(genCount) || 1));
    try {
      const serviceKey = process.env.EXPO_PUBLIC_SUPABASE_SERVICE_KEY ?? '';
      const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
      const resp = await fetch(`${supabaseUrl}/functions/v1/generate-redeem-code`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${serviceKey}`,
        },
        body: JSON.stringify({
          rewardType: genRewardType,
          batchNote: genBatchNote.trim(),
          count: countNum,
        }),
      });
      const json = await resp.json() as { success: boolean; codes?: { code: string; displayName: string }[]; error?: string };
      if (!json.success) throw new Error(json.error ?? '生成失败');
      const newCodes = json.codes ?? [];
      setGenMsg(`✅ 成功生成 ${newCodes.length} 个兑换码` + (newCodes[0]?.displayName ? `「${newCodes[0].displayName}」` : ''));
      setGenBatchNote('');
      setGenCount('1');
      await loadRedeemCodes();
    } catch (e) {
      setGenError(`❌ ${e instanceof Error ? e.message : '生成失败，请重试'}`);
    } finally {
      setGenerating(false);
    }
  };

  // 复制码到剪贴板（Web 可用）
  const handleCopy = (code: string, id: string) => {
    if (process.env.EXPO_OS === 'web' && navigator?.clipboard) {
      void navigator.clipboard.writeText(code).then(() => {
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
      });
    }
  };

  const filteredCodes = redeemCodes.filter(r => {
    if (redeemFilter === 'unused') return !r.is_used;
    if (redeemFilter === 'used') return r.is_used;
    return true;
  });

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const serviceKey = process.env.EXPO_PUBLIC_SUPABASE_SERVICE_KEY ?? '';
      const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';

      // 1. 从 auth.users 获取所有用户（可能不含已注销账号）
      const authRes = await fetch(`${supabaseUrl}/auth/v1/admin/users?page=1&per_page=500`, {
        headers: {
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
        },
      });
      const authUsers: { id: string; email: string; created_at: string }[] = authRes.ok
        ? ((await authRes.json() as { users: { id: string; email: string; created_at: string }[] }).users ?? [])
        : [];

      // 2. 查询 player_saves（永久保留玩家存档，即使auth账号已注销）
      const { data: saves } = await supabase
        .from('player_saves')
        .select('user_id, player_name, player_position, rank_level, city_name, created_at');

      // 3. 查询管理员白名单
      const { data: admins } = await supabase.from('admin_users').select('username');
      const adminSet = new Set((admins ?? []).map(a => a.username as string));

      // 4. 合并：以 auth.users（含@miaoda.com）为主，缺失的 player_saves 条目作 orphan 追加
      const saveMap = new Map<string, { player_name: string; player_position: string; rank_level: number; city_name: string; created_at: string }>(
        (saves ?? []).map(s => [s.user_id as string, s as { player_name: string; player_position: string; rank_level: number; city_name: string; created_at: string }])
      );

      const authUserMap = new Map<string, { id: string; email: string; created_at: string }>(
        authUsers
          .filter(u => u.email && u.email.endsWith('@miaoda.com'))
          .map(u => [u.id, u])
      );

      // auth用户合并
      const merged: UserRow[] = [...authUserMap.values()].map(u => {
        const username = u.email.replace('@miaoda.com', '');
        const save = saveMap.get(u.id);
        return {
          id: u.id,
          email: u.email,
          username,
          created_at: u.created_at,
          player_name: save?.player_name ?? null,
          player_position: save?.player_position ?? null,
          rank_level: save?.rank_level ?? null,
          city_name: save?.city_name ?? null,
          is_admin: adminSet.has(username),
          is_orphan: false,
        };
      });

      // 追加：player_saves有记录但不在auth列表中的孤立玩家（账号已注销但存档永久保留）
      for (const [uid, save] of saveMap.entries()) {
        if (!authUserMap.has(uid) && save.player_name) {
          merged.push({
            id: uid,
            email: `（账号已注销）`,
            username: save.player_name,
            created_at: save.created_at ?? '',
            player_name: save.player_name,
            player_position: save.player_position,
            rank_level: save.rank_level,
            city_name: save.city_name,
            is_admin: false,
            is_orphan: true,
          });
        }
      }

      // 按注册时间降序排列（最新注册在前）
      merged.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      setUsers(merged);
    } catch (e) {
      setError(e instanceof Error ? e.message : '加载失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    void loadUsers();
    void loadRedeemCodes();
  }, [loadUsers, loadRedeemCodes]));

  const filteredUsers = users.filter(u =>
    u.username.toLowerCase().includes(search.toLowerCase()) ||
    (u.player_name ?? '').includes(search)
  );

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <StatusBar style="light" backgroundColor={C.bg} />

      {/* 顶栏 */}
      <View style={{
        backgroundColor: C.bgCard,
        paddingTop: insets.top + 8,
        paddingBottom: 14,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: C.border,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
      }}>
        <Pressable
          onPress={() => router.back()}
          style={{ width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.08)' }}
        >
          <Text style={{ color: C.text, fontSize: 18 }}>‹</Text>
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={{ color: C.textMid, fontSize: 10, letterSpacing: 2 }}>系统后台</Text>
          <Text style={{ color: C.text, fontSize: 17, fontWeight: '700', marginTop: 1 }}>账号管理中心</Text>
        </View>
        <View style={{ backgroundColor: C.accent, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 }}>
          <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700', letterSpacing: 1 }}>ADMIN</Text>
        </View>
      </View>

      {/* 功能Tab切换 */}
      <View style={{ flexDirection: 'row', backgroundColor: C.bgCard, borderBottomWidth: 1, borderBottomColor: C.border }}>
        {([
          { key: 'accounts', label: '👤 账号管理' },
          { key: 'redeem',   label: '🎟️ 兑换码' },
        ] as const).map(tab => (
          <Pressable
            key={tab.key}
            onPress={() => setActiveTab(tab.key)}
            style={{ flex: 1, paddingVertical: 11, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: activeTab === tab.key ? C.primary : 'transparent' }}
          >
            <Text style={{ fontSize: 13, fontWeight: activeTab === tab.key ? '700' : '400', color: activeTab === tab.key ? C.primary : C.textMid }}>
              {tab.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {activeTab === 'accounts' ? (
        <>
          {/* 统计栏 */}
          <View style={{ flexDirection: 'row', backgroundColor: C.bgCard, borderBottomWidth: 1, borderBottomColor: C.border }}>
            {[
              { label: '注册用户', value: users.filter(u => !u.is_orphan).length },
              { label: '已建角色', value: users.filter(u => u.player_name).length },
              { label: '存档保留', value: users.filter(u => u.is_orphan).length },
              { label: '管理员', value: users.filter(u => u.is_admin).length },
            ].map((item, i) => (
              <View key={item.label} style={{
                flex: 1, alignItems: 'center', paddingVertical: 12,
                borderRightWidth: i < 3 ? 1 : 0, borderRightColor: C.border,
              }}>
                <Text style={{ color: C.gold, fontSize: 20, fontWeight: '700' }}>{item.value}</Text>
                <Text style={{ color: C.textMid, fontSize: 10, marginTop: 2 }}>{item.label}</Text>
              </View>
            ))}
          </View>

          {/* 搜索框 */}
          <View style={{ paddingHorizontal: 12, paddingVertical: 10, backgroundColor: C.bgCard, borderBottomWidth: 1, borderBottomColor: C.border }}>
            <View style={{
              flexDirection: 'row', alignItems: 'center',
              backgroundColor: 'rgba(255,255,255,0.06)',
              borderWidth: 1,
              borderColor: searchFocus ? C.primary : C.border,
              borderRadius: 8,
              paddingHorizontal: 10, gap: 8,
            }}>
              <Text style={{ color: C.textDim, fontSize: 14 }}>🔍</Text>
              <TextInput
                style={{ flex: 1, height: 38, color: C.text, fontSize: 13 }}
                placeholder="搜索账号或角色名…"
                placeholderTextColor={C.textDim}
                value={search}
                onChangeText={setSearch}
                onFocus={() => setSearchFocus(true)}
                onBlur={() => setSearchFocus(false)}
                autoCapitalize="none"
                autoCorrect={false}
              />
              {search.length > 0 && (
                <Pressable onPress={() => setSearch('')}>
                  <Text style={{ color: C.textMid, fontSize: 16 }}>✕</Text>
                </Pressable>
              )}
            </View>
          </View>

          {/* 账号列表 */}
          {loading ? (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 }}>
              <ActivityIndicator size="large" color={C.primary} />
              <Text style={{ color: C.textMid, fontSize: 13 }}>正在加载账号列表…</Text>
            </View>
          ) : error ? (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, gap: 12 }}>
              <Text style={{ color: C.errText, fontSize: 14, textAlign: 'center' }}>⚠ {error}</Text>
              <Pressable
                onPress={() => void loadUsers()}
                style={{ backgroundColor: C.primary, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 }}
              >
                <Text style={{ color: '#fff', fontSize: 14, fontWeight: '600' }}>重新加载</Text>
              </Pressable>
            </View>
          ) : (
            <ScrollView
              style={{ flex: 1 }}
              contentInsetAdjustmentBehavior="automatic"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: insets.bottom + 20, paddingTop: 4 }}
            >
              {filteredUsers.length === 0 ? (
                <View style={{ alignItems: 'center', paddingTop: 60 }}>
                  <Text style={{ color: C.textMid, fontSize: 14 }}>未找到匹配账号</Text>
                </View>
              ) : filteredUsers.map((user, idx) => (
                <UserCard key={user.id} user={user} index={idx} />
              ))}
            </ScrollView>
          )}
        </>
      ) : (
        /* ── 兑换码管理子页面 ── */
        <View style={{ flex: 1 }}>
          {/* 生成表单区 */}
          <ScrollView
            style={{ flex: 1 }}
            contentInsetAdjustmentBehavior="automatic"
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
          >
            {/* 生成区域 */}
            <View style={{ backgroundColor: C.bgCard, borderBottomWidth: 1, borderBottomColor: C.border, padding: 16, gap: 12 }}>
              <Text style={{ color: C.gold, fontSize: 11, fontWeight: '700', letterSpacing: 2 }}>🎟️ 生成新兑换码</Text>

              {/* 奖励类型 */}
              <View style={{ gap: 6 }}>
                <Text style={{ color: C.textMid, fontSize: 11 }}>奖励类型</Text>
                <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                  {Object.entries(REWARD_LABELS).map(([key, label]) => (
                    <Pressable
                      key={key}
                      onPress={() => setGenRewardType(key)}
                      style={{
                        paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8,
                        borderWidth: genRewardType === key ? 2 : 1,
                        borderColor: genRewardType === key ? C.gold : C.border,
                        backgroundColor: genRewardType === key ? 'rgba(200,168,75,0.15)' : 'rgba(255,255,255,0.04)',
                      }}
                    >
                      <Text style={{ color: genRewardType === key ? C.gold : C.textMid, fontSize: 13, fontWeight: genRewardType === key ? '700' : '400' }}>
                        {label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              {/* 批次备注 */}
              <View style={{ gap: 6 }}>
                <Text style={{ color: C.textMid, fontSize: 11 }}>批次备注（可选，用于文心生成命名参考）</Text>
                <TextInput
                  value={genBatchNote}
                  onChangeText={setGenBatchNote}
                  placeholder="如：活动奖励、测试码…"
                  placeholderTextColor={C.textDim}
                  style={{ backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: C.border, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 9, color: C.text, fontSize: 13 }}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              {/* 生成数量 */}
              <View style={{ gap: 6 }}>
                <Text style={{ color: C.textMid, fontSize: 11 }}>生成数量（1-20）</Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {['1', '3', '5', '10'].map(n => (
                    <Pressable
                      key={n}
                      onPress={() => setGenCount(n)}
                      style={{
                        paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8,
                        borderWidth: genCount === n ? 2 : 1,
                        borderColor: genCount === n ? C.primary : C.border,
                        backgroundColor: genCount === n ? C.primary : 'rgba(255,255,255,0.04)',
                      }}
                    >
                      <Text style={{ color: genCount === n ? '#fff' : C.textMid, fontSize: 13, fontWeight: genCount === n ? '700' : '400' }}>{n}</Text>
                    </Pressable>
                  ))}
                  <TextInput
                    value={genCount}
                    onChangeText={t => setGenCount(t.replace(/\D/g, '').slice(0, 2))}
                    keyboardType="number-pad"
                    placeholder="自定义"
                    placeholderTextColor={C.textDim}
                    style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: C.border, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, color: C.text, fontSize: 13, textAlign: 'center' }}
                  />
                </View>
              </View>

              {/* 操作反馈 */}
              {genMsg ? (
                <View style={{ backgroundColor: C.successBg, borderWidth: 1, borderColor: C.success, borderRadius: 8, padding: 10 }}>
                  <Text style={{ color: '#4CAF50', fontSize: 12 }}>{genMsg}</Text>
                </View>
              ) : null}
              {genError ? (
                <View style={{ backgroundColor: C.errBg, borderWidth: 1, borderColor: C.errText, borderRadius: 8, padding: 10 }}>
                  <Text style={{ color: C.errText, fontSize: 12 }}>{genError}</Text>
                </View>
              ) : null}

              <Pressable
                onPress={() => void handleGenerate()}
                disabled={generating}
                style={{ backgroundColor: generating ? C.textDim : C.gold, borderRadius: 10, paddingVertical: 13, alignItems: 'center' }}
              >
                {generating
                  ? <ActivityIndicator size="small" color="#000" />
                  : <Text style={{ color: '#000', fontSize: 14, fontWeight: '700', letterSpacing: 0.5 }}>✨ 生成兑换码（文心命名）</Text>
                }
              </Pressable>
            </View>

            {/* 兑换码列表 */}
            <View style={{ padding: 12, gap: 10 }}>
              {/* 状态筛选 + 数量统计 */}
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  {([
                    { key: 'all', label: `全部 ${redeemCodes.length}` },
                    { key: 'unused', label: `未用 ${redeemCodes.filter(r => !r.is_used).length}` },
                    { key: 'used', label: `已用 ${redeemCodes.filter(r => r.is_used).length}` },
                  ] as const).map(f => (
                    <Pressable
                      key={f.key}
                      onPress={() => setRedeemFilter(f.key)}
                      style={{
                        paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20,
                        backgroundColor: redeemFilter === f.key ? C.primary : 'rgba(255,255,255,0.06)',
                        borderWidth: 1,
                        borderColor: redeemFilter === f.key ? C.primary : C.border,
                      }}
                    >
                      <Text style={{ color: redeemFilter === f.key ? '#fff' : C.textMid, fontSize: 11, fontWeight: redeemFilter === f.key ? '700' : '400' }}>{f.label}</Text>
                    </Pressable>
                  ))}
                </View>
                <Pressable onPress={() => void loadRedeemCodes()}>
                  <Text style={{ color: C.textDim, fontSize: 11 }}>🔄 刷新</Text>
                </Pressable>
              </View>

              {redeemLoading ? (
                <View style={{ alignItems: 'center', paddingVertical: 30, gap: 8 }}>
                  <ActivityIndicator size="small" color={C.primary} />
                  <Text style={{ color: C.textMid, fontSize: 12 }}>加载中…</Text>
                </View>
              ) : redeemError ? (
                <View style={{ backgroundColor: C.errBg, borderRadius: 8, padding: 12 }}>
                  <Text style={{ color: C.errText, fontSize: 12 }}>⚠ {redeemError}</Text>
                </View>
              ) : filteredCodes.length === 0 ? (
                <View style={{ alignItems: 'center', paddingVertical: 30 }}>
                  <Text style={{ color: C.textMid, fontSize: 13 }}>暂无兑换码，点击上方「生成」按钮创建</Text>
                </View>
              ) : (
                filteredCodes.map(item => (
                  <View
                    key={item.id}
                    style={{
                      backgroundColor: item.is_used ? 'rgba(255,255,255,0.02)' : C.bgCard,
                      borderWidth: 1,
                      borderColor: item.is_used ? C.border : 'rgba(200,168,75,0.35)',
                      borderRadius: 10,
                      padding: 12,
                      gap: 6,
                      opacity: item.is_used ? 0.65 : 1,
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                      {/* 码值 */}
                      <Pressable
                        onPress={() => handleCopy(item.code, item.id)}
                        style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}
                      >
                        <Text style={{ color: item.is_used ? C.textDim : C.gold, fontSize: 14, fontWeight: '700', letterSpacing: 1.5, fontFamily: 'monospace' }}>
                          {item.code}
                        </Text>
                        {copiedId === item.id && (
                          <Text style={{ color: '#4CAF50', fontSize: 10 }}>已复制✓</Text>
                        )}
                      </Pressable>
                      {/* 状态标签 */}
                      <View style={{
                        paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12,
                        backgroundColor: item.is_used ? 'rgba(100,100,100,0.25)' : 'rgba(42,122,59,0.2)',
                        borderWidth: 1,
                        borderColor: item.is_used ? '#555' : '#2a7a3b',
                      }}>
                        <Text style={{ color: item.is_used ? '#888' : '#4CAF50', fontSize: 10, fontWeight: '700' }}>
                          {item.is_used ? '已使用' : '待兑换'}
                        </Text>
                      </View>
                    </View>
                    {/* 诗意名称 + 奖励 */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      {item.display_name ? (
                        <View style={{ backgroundColor: 'rgba(200,168,75,0.1)', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 4, borderWidth: 1, borderColor: 'rgba(200,168,75,0.3)' }}>
                          <Text style={{ color: C.gold, fontSize: 10, fontWeight: '700' }}>「{item.display_name}」</Text>
                        </View>
                      ) : null}
                      <Text style={{ color: C.textMid, fontSize: 11 }}>{REWARD_LABELS[item.reward_type] ?? item.reward_type}</Text>
                    </View>
                    {/* 备注 + 时间 */}
                    <View style={{ flexDirection: 'row', gap: 12 }}>
                      {item.batch_note ? <Text style={{ color: C.textDim, fontSize: 10 }}>备注：{item.batch_note}</Text> : null}
                      <Text style={{ color: C.textDim, fontSize: 10 }}>创建：{formatDate(item.created_at)}</Text>
                      {item.is_used && item.used_at ? <Text style={{ color: C.textDim, fontSize: 10 }}>使用：{formatDate(item.used_at)}</Text> : null}
                    </View>
                  </View>
                ))
              )}
            </View>
          </ScrollView>
        </View>
      )}
    </View>
  );
}

/* ─── 单条账号卡片 ─── */
function UserCard({ user, index }: { user: UserRow; index: number }) {
  const [expanded, setExpanded] = useState(false);
  const [newPwd, setNewPwd] = useState('');
  const [pwdFocus, setPwdFocus] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [resetMsg, setResetMsg] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  // 职务晋升
  const [showPromote, setShowPromote] = useState(false);
  const [promoteTarget, setPromoteTarget] = useState<number | null>(null);
  const [promoteTrack, setPromoteTrack] = useState<'economy' | 'social' | 'hmt' | 'military' | null>(null);
  const [promoting, setPromoting] = useState(false);
  const [promoteMsg, setPromoteMsg] = useState('');

  const RANK_NAMES: Record<number, string> = {
    1: '乡科级副职', 2: '乡科级正职', 3: '乡科级正职', 4: '县处级副职',
    5: '县处级正职', 6: '县处级正职', 7: '地厅级副职', 8: '地厅级正职',
    9: '地厅级正职', 10: '副部省级', 11: '副部省级', 12: '正部省级', 13: '正部省级',
    14: '国家级副职', 15: '国家级正职',
  };
  const CABINET_TRACK_LABELS: Record<string, string> = {
    economy: '📈 经济金融线（第一副总理）',
    social:  '🏥 社会民生线（第二副总理）',
    hmt:     '🤝 港澳台外交线（第三副总理）',
    military:'⚔️ 枢武府线（国防安全）',
  };
  const rankName = user.rank_level ? (RANK_NAMES[user.rank_level] ?? `${user.rank_level}级`) : null;

  const handleResetPwd = async () => {
    if (newPwd.trim().length < 6) {
      setResetMsg('❌ 密码至少6位');
      return;
    }
    setResetting(true);
    setResetMsg('');
    try {
      const serviceKey = process.env.EXPO_PUBLIC_SUPABASE_SERVICE_KEY ?? '';
      const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
      const res = await fetch(`${supabaseUrl}/auth/v1/admin/users/${user.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
        },
        body: JSON.stringify({ password: newPwd.trim() }),
      });
      if (!res.ok) {
        const errBody = await res.json() as { message?: string };
        throw new Error(errBody.message ?? '重置失败');
      }
      setResetMsg('✅ 密码已更新');
      setNewPwd('');
      setExpanded(false);
    } catch (e) {
      setResetMsg(`❌ ${e instanceof Error ? e.message : '操作失败'}`);
    } finally {
      setResetting(false);
    }
  };

  // 职务晋升：更新 player_saves 中的 rank_level
  const handlePromote = async () => {
    if (!promoteTarget) return;
    setPromoting(true);
    setPromoteMsg('');
    try {
      // rank13 需要指定分管线；rank14+ 清除分管线（全管）
      const needsTrack = promoteTarget === 13;
      if (needsTrack && !promoteTrack) {
        setPromoteMsg('❌ 晋升至13级（副总理）需先选择分管线');
        setPromoting(false);
        return;
      }
      const updateData: Record<string, unknown> = { rank_level: promoteTarget };
      if (promoteTarget === 13) {
        updateData.cabinet_track = promoteTrack;
      } else if (promoteTarget >= 14) {
        updateData.cabinet_track = null; // 总统全管，清除分管线限制
      }
      // 若该用户尚未创建角色（player_saves 无该 user_id 行），先插入最小存档行
      const { data: existingSave } = await supabase
        .from('player_saves')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();
      if (!existingSave) {
        const { error: insertErr } = await supabase
          .from('player_saves')
          .insert({ user_id: user.id, player_name: user.username ?? '未命名' });
        if (insertErr) throw new Error('创建存档失败：' + insertErr.message);
      }
      const { error } = await supabase
        .from('player_saves')
        .update(updateData)
        .eq('user_id', user.id);
      if (error) throw new Error(error.message);
      const newName = RANK_NAMES[promoteTarget] ?? `${promoteTarget}级`;
      const trackLabel = promoteTarget === 13 && promoteTrack ? ` · 分管线：${CABINET_TRACK_LABELS[promoteTrack]}` : promoteTarget >= 14 ? ' · 全管（总统）' : '';
      setPromoteMsg(`✅ 已晋升为${newName}（级别${promoteTarget}）${trackLabel}`);
      setShowPromote(false);
      setPromoteTarget(null);
      setPromoteTrack(null);
      user.rank_level = promoteTarget;
    } catch (e) {
      setPromoteMsg(`❌ ${e instanceof Error ? e.message : '晋升失败'}`);
    } finally {
      setPromoting(false);
    }
  };

  return (
    <View style={{
      marginHorizontal: 10,
      marginVertical: 4,
      backgroundColor: C.bgCard,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: user.is_admin ? 'rgba(200,168,75,0.4)' : user.is_orphan ? 'rgba(100,100,100,0.35)' : C.border,
      overflow: 'hidden',
    }}>
      <View style={{ flexDirection: 'row' }}>
        {/* 序号条 */}
        <View style={{
          width: 32, alignItems: 'center', justifyContent: 'center',
          backgroundColor: user.is_admin ? 'rgba(200,168,75,0.15)' : 'rgba(255,255,255,0.03)',
          borderRightWidth: 1, borderRightColor: user.is_admin ? 'rgba(200,168,75,0.3)' : C.border,
        }}>
          <Text style={{ color: user.is_admin ? C.gold : C.textDim, fontSize: 11, fontWeight: '700' }}>
            {String(index + 1).padStart(2, '0')}
          </Text>
        </View>

        <View style={{ flex: 1, padding: 12, gap: 8 }}>
          {/* 行1：账号 + 标签 */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={{ color: C.text, fontSize: 15, fontWeight: '700', flex: 1 }}>{user.username}</Text>
            {user.is_admin && (
              <View style={{ backgroundColor: 'rgba(200,168,75,0.2)', borderWidth: 1, borderColor: C.gold, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                <Text style={{ color: C.gold, fontSize: 9, fontWeight: '700', letterSpacing: 1 }}>管理员</Text>
              </View>
            )}
            {user.is_orphan && (
              <View style={{ backgroundColor: 'rgba(100,100,100,0.25)', borderWidth: 1, borderColor: '#666', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                <Text style={{ color: '#AAA', fontSize: 9, fontWeight: '700', letterSpacing: 1 }}>存档保留</Text>
              </View>
            )}
          </View>

          {/* 行2：当前职务 */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={{ color: C.textDim, fontSize: 10, width: 32 }}>职务</Text>
            {user.player_name ? (
              <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                {rankName && (
                  <View style={{ backgroundColor: C.primary, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 3 }}>
                    <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>{rankName}</Text>
                  </View>
                )}
                <Text style={{ color: C.text, fontSize: 12 }}>{user.player_name}</Text>
                {user.player_position && <Text style={{ color: C.textMid, fontSize: 11 }}>· {user.player_position}</Text>}
                {user.city_name && <Text style={{ color: C.textMid, fontSize: 10 }}>📍{user.city_name}</Text>}
              </View>
            ) : (
              <Text style={{ color: C.textDim, fontSize: 12, fontStyle: 'italic' }}>尚未创建角色</Text>
            )}
          </View>

          {/* 行3：注册时间 */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={{ color: C.textDim, fontSize: 10, width: 32 }}>注册</Text>
            {user.is_orphan
              ? <Text style={{ color: '#666', fontSize: 11, fontStyle: 'italic' }}>账号已注销 · 存档数据永久保留</Text>
              : <Text style={{ color: C.textDim, fontSize: 11 }}>{formatDate(user.created_at)}</Text>
            }
          </View>

          {/* 操作反馈消息 */}
          {resetMsg !== '' && (
            <Text style={{
              fontSize: 11, fontWeight: '600',
              color: resetMsg.startsWith('✅') ? '#4ADE80' : C.errText,
            }}>{resetMsg}</Text>
          )}
          {promoteMsg !== '' && (
            <Text style={{
              fontSize: 11, fontWeight: '600',
              color: promoteMsg.startsWith('✅') ? '#4ADE80' : C.errText,
            }}>{promoteMsg}</Text>
          )}

          {/* ── 职务晋升展开区 ── */}
          {showPromote && user.player_name ? (
            <View style={{ gap: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: C.border, marginTop: 2 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text style={{ color: C.gold, fontSize: 11, fontWeight: '700', letterSpacing: 0.5 }}>🎖️ 职务晋升</Text>
                <Text style={{ color: C.textDim, fontSize: 10 }}>当前：{user.rank_level ?? '?'}级 · {rankName ?? '未知'}</Text>
              </View>
              {/* 1-14级选择器：分两行 */}
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                {Array.from({ length: 15 }, (_, i) => i + 1).map(lv => {
                  const isSelected = promoteTarget === lv;
                  const isCurrent = user.rank_level === lv;
                  const lvName = RANK_NAMES[lv] ?? `${lv}级`;
                  return (
                    <Pressable
                      key={lv}
                      onPress={() => setPromoteTarget(lv)}
                      style={{
                        paddingHorizontal: 8, paddingVertical: 6, borderRadius: 6,
                        borderWidth: 1,
                        borderColor: isSelected ? C.gold : isCurrent ? C.primary : C.border,
                        backgroundColor: isSelected ? 'rgba(200,168,75,0.2)' : isCurrent ? 'rgba(26,86,176,0.15)' : 'rgba(255,255,255,0.03)',
                        minWidth: 60, alignItems: 'center',
                      }}
                    >
                      <Text style={{ color: isSelected ? C.gold : isCurrent ? '#64B5F6' : C.textMid, fontSize: 10, fontWeight: isSelected ? '700' : '400' }}>
                        {lv}级
                      </Text>
                      <Text style={{ color: isSelected ? C.gold : C.textDim, fontSize: 8, marginTop: 1, textAlign: 'center' }} numberOfLines={1}>
                        {lvName.length > 5 ? lvName.slice(0, 4) + '…' : lvName}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              {/* 晋升目标预览 */}
              {promoteTarget && (
                <View style={{ backgroundColor: 'rgba(200,168,75,0.08)', borderWidth: 1, borderColor: 'rgba(200,168,75,0.3)', borderRadius: 6, padding: 8, gap: 6 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={{ fontSize: 12 }}>📋</Text>
                    <Text style={{ color: C.text, fontSize: 11, flex: 1 }}>
                      将 <Text style={{ color: C.gold, fontWeight: '700' }}>{user.player_name}</Text> 从
                      <Text style={{ color: C.textMid }}> {user.rank_level ?? '?'}级</Text> 晋升至
                      <Text style={{ color: C.gold, fontWeight: '700' }}> {promoteTarget}级·{RANK_NAMES[promoteTarget] ?? ''}</Text>
                    </Text>
                  </View>
                  {/* rank13：必须选择分管线 */}
                  {promoteTarget === 13 && (
                    <View style={{ gap: 6, paddingTop: 6, borderTopWidth: 1, borderTopColor: 'rgba(200,168,75,0.2)' }}>
                      <Text style={{ color: C.gold, fontSize: 10, fontWeight: '700' }}>⚠️ 副总理须指定分管线（在任期间仅可管理该线）</Text>
                      <View style={{ gap: 4 }}>
                        {(Object.entries(CABINET_TRACK_LABELS) as [string, string][]).map(([key, label]) => {
                          const isSelected = promoteTrack === key;
                          return (
                            <Pressable
                              key={key}
                              onPress={() => setPromoteTrack(key as 'economy' | 'social' | 'hmt' | 'military')}
                              style={{
                                flexDirection: 'row', alignItems: 'center', gap: 8,
                                paddingHorizontal: 10, paddingVertical: 8, borderRadius: 6,
                                borderWidth: 1,
                                borderColor: isSelected ? C.gold : C.border,
                                backgroundColor: isSelected ? 'rgba(200,168,75,0.15)' : 'rgba(255,255,255,0.03)',
                              }}
                            >
                              <View style={{
                                width: 14, height: 14, borderRadius: 7,
                                borderWidth: 2, borderColor: isSelected ? C.gold : C.border,
                                backgroundColor: isSelected ? C.gold : 'transparent',
                                alignItems: 'center', justifyContent: 'center',
                              }} />
                              <Text style={{ color: isSelected ? C.gold : C.textMid, fontSize: 12, fontWeight: isSelected ? '700' : '400' }}>
                                {label}
                              </Text>
                            </Pressable>
                          );
                        })}
                      </View>
                    </View>
                  )}
                  {/* rank14：总理全管 */}
                  {promoteTarget === 14 && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingTop: 4, borderTopWidth: 1, borderTopColor: 'rgba(200,168,75,0.2)' }}>
                      <Text style={{ fontSize: 11 }}>🏛️</Text>
                      <Text style={{ color: '#4ADE80', fontSize: 11, fontWeight: '700' }}>晋升联邦内阁总理 · 将解除分管限制，获得四线全管权</Text>
                    </View>
                  )}
                  {/* rank15：总统全权 */}
                  {promoteTarget === 15 && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingTop: 4, borderTopWidth: 1, borderTopColor: 'rgba(200,168,75,0.2)' }}>
                      <Text style={{ fontSize: 11 }}>👑</Text>
                      <Text style={{ color: '#FFD700', fontSize: 11, fontWeight: '700' }}>晋升联邦总统 · 解锁执政党中央 & 联邦国会专属职权</Text>
                    </View>
                  )}
                </View>
              )}
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Pressable
                  onPress={() => void handlePromote()}
                  disabled={!promoteTarget || promoting || (promoteTarget === 13 && !promoteTrack)}
                  style={{
                    flex: 1,
                    backgroundColor: (!promoteTarget || promoting || (promoteTarget === 13 && !promoteTrack)) ? C.textDim : C.gold,
                    paddingVertical: 9, borderRadius: 6,
                    alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  {promoting
                    ? <ActivityIndicator size="small" color="#000" />
                    : <Text style={{ color: '#000', fontSize: 13, fontWeight: '700' }}>确认晋升</Text>
                  }
                </Pressable>
                <Pressable
                  onPress={() => { setShowPromote(false); setPromoteTarget(null); setPromoteMsg(''); setPromoteTrack(null); }}
                  style={{ paddingHorizontal: 16, paddingVertical: 9, borderRadius: 6, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center' }}
                >
                  <Text style={{ color: C.textMid, fontSize: 13 }}>取消</Text>
                </Pressable>
              </View>
            </View>
          ) : null}

          {/* 重置密码展开区 */}
          {expanded ? (
            <View style={{ gap: 8, paddingTop: 4, borderTopWidth: 1, borderTopColor: C.border, marginTop: 2 }}>
              <Text style={{ color: C.textMid, fontSize: 11, letterSpacing: 0.5 }}>设置新密码</Text>
              <View style={{
                flexDirection: 'row', alignItems: 'center',
                backgroundColor: 'rgba(255,255,255,0.05)',
                borderWidth: 1,
                borderColor: pwdFocus ? C.primary : C.border,
                borderRadius: 6,
                paddingHorizontal: 10, gap: 6,
              }}>
                <TextInput
                  style={{ flex: 1, height: 40, color: C.text, fontSize: 13 }}
                  placeholder="新密码（至少6位）"
                  placeholderTextColor={C.textDim}
                  value={newPwd}
                  onChangeText={t => { setNewPwd(t); setResetMsg(''); }}
                  onFocus={() => setPwdFocus(true)}
                  onBlur={() => setPwdFocus(false)}
                  secureTextEntry={!showPwd}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <Pressable onPress={() => setShowPwd(v => !v)} style={{ padding: 4 }}>
                  <Text style={{ fontSize: 13, color: C.textDim }}>{showPwd ? '🙈' : '👁️'}</Text>
                </Pressable>
              </View>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Pressable
                  onPress={handleResetPwd}
                  disabled={resetting}
                  style={{
                    flex: 1, backgroundColor: resetting ? C.textDim : C.primary,
                    paddingVertical: 9, borderRadius: 6,
                    alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  {resetting
                    ? <ActivityIndicator size="small" color="#fff" />
                    : <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700' }}>确认重置</Text>
                  }
                </Pressable>
                <Pressable
                  onPress={() => { setExpanded(false); setNewPwd(''); setResetMsg(''); }}
                  style={{ paddingHorizontal: 16, paddingVertical: 9, borderRadius: 6, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center' }}
                >
                  <Text style={{ color: C.textMid, fontSize: 13 }}>取消</Text>
                </Pressable>
              </View>
            </View>
          ) : (
            /* 操作按钮行：重置密码 + 职务晋升 */
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Pressable
                onPress={() => { setExpanded(true); setResetMsg(''); setShowPromote(false); }}
                style={{
                  flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5,
                  paddingVertical: 7, paddingHorizontal: 10,
                  borderWidth: 1, borderColor: C.border, borderRadius: 6,
                  backgroundColor: 'rgba(255,255,255,0.03)',
                }}
              >
                <Text style={{ fontSize: 11 }}>🔑</Text>
                <Text style={{ color: C.textMid, fontSize: 12 }}>重置密码</Text>
              </Pressable>
              {user.player_name && (
                <Pressable
                  onPress={() => { setShowPromote(v => !v); setExpanded(false); setPromoteMsg(''); }}
                  style={{
                    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5,
                    paddingVertical: 7, paddingHorizontal: 10,
                    borderWidth: 1, borderColor: showPromote ? C.gold : C.border, borderRadius: 6,
                    backgroundColor: showPromote ? 'rgba(200,168,75,0.1)' : 'rgba(255,255,255,0.03)',
                  }}
                >
                  <Text style={{ fontSize: 11 }}>🎖️</Text>
                  <Text style={{ color: showPromote ? C.gold : C.textMid, fontSize: 12 }}>职务晋升</Text>
                </Pressable>
              )}
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

function formatDate(iso: string) {
  try {
    const d = new Date(iso);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  } catch { return iso.slice(0, 10); }
}
