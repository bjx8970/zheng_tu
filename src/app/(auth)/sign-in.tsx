import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { supabase } from '@/client/supabase';

/* ─── 蓝色渐变配色 ─── */
const C = {
  /* 背景渐变色（用两段 View 模拟） */
  bgTop:        '#0A1628',
  bgBot:        '#0D2347',
  /* 卡片 */
  card:         '#FFFFFF',
  cardBorder:   '#DDEAF8',
  /* 主色蓝 */
  primary:      '#1A56B0',
  primaryLight: '#2D6FCC',
  primaryDim:   '#0E3A7A',
  primaryBg:    'rgba(26,86,176,0.08)',
  /* 文字 */
  textDark:     '#0D1E38',
  textMid:      '#4A6080',
  textLight:    '#8AA0BA',
  textWhite:    '#FFFFFF',
  /* 边框/分割 */
  border:       '#C8D8EC',
  borderFocus:  '#1A56B0',
  inputBg:      '#F5F9FF',
  /* 错误 */
  errBg:        'rgba(220,38,38,0.06)',
  errBorder:    '#DC2626',
  errText:      '#DC2626',
};

/* ─── 顶部横幅徽标 ─── */
function HeaderBadge() {
  return (
    <View style={{ alignItems: 'center', marginBottom: 28 }}>
      {/* 国徽风格圆标 */}
      <View style={{
        width: 72, height: 72, borderRadius: 36,
        backgroundColor: C.primary,
        borderWidth: 3, borderColor: 'rgba(255,255,255,0.3)',
        alignItems: 'center', justifyContent: 'center',
        marginBottom: 16,
        shadowColor: C.primary, shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.4, shadowRadius: 16,
      }}>
        <Text style={{ fontSize: 32, lineHeight: 38 }}>☆</Text>
        <Text style={{ position: 'absolute', bottom: 8, fontSize: 7, color: 'rgba(255,255,255,0.7)', letterSpacing: 1 }}>
          HXR
        </Text>
      </View>
      {/* 副标题 */}
      <Text style={{ fontSize: 11, color: 'rgba(200,220,255,0.7)', letterSpacing: 3, marginBottom: 8 }}>
        HUAXIA REPUBLIC · CADRE SYSTEM
      </Text>
      {/* 主标题 */}
      <Text style={{
        fontSize: 20, fontWeight: '800', color: C.textWhite,
        letterSpacing: 2, textAlign: 'center', lineHeight: 28,
      }}>
        华夏共和国干部模拟系登录
      </Text>
    </View>
  );
}

/* ─── 记住我复选框 ─── */
function Checkbox({ checked, onToggle }: { checked: boolean; onToggle: () => void }) {
  return (
    <Pressable onPress={onToggle} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <View style={{
        width: 18, height: 18, borderRadius: 4,
        borderWidth: 1.5,
        borderColor: checked ? C.primary : C.border,
        backgroundColor: checked ? C.primary : 'transparent',
        alignItems: 'center', justifyContent: 'center',
      }}>
        {checked && <Text style={{ color: '#fff', fontSize: 11, fontWeight: '800', lineHeight: 14 }}>✓</Text>}
      </View>
      <Text style={{ fontSize: 13, color: C.textMid }}>记住我</Text>
    </Pressable>
  );
}

/* ─── 主组件 ─── */
export default function SignIn() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [username, setUsername]       = useState('');
  const [password, setPassword]       = useState('');
  const [showPw, setShowPw]           = useState(false);
  const [rememberMe, setRememberMe]   = useState(false);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState('');
  const [userFocus, setUserFocus]     = useState(false);
  const [pwFocus, setPwFocus]         = useState(false);
  const [guestLoading, setGuestLoading] = useState(false);
  const [loginPressed, setLoginPressed]   = useState(false);
  const [guestPressed, setGuestPressed]   = useState(false);

  /* 读取记住的账号 */
  useEffect(() => {
    (async () => {
      try {
        if (process.env.EXPO_OS === 'web') {
          const saved = typeof localStorage !== 'undefined' ? localStorage.getItem('remembered_username') : null;
          if (saved) { setUsername(saved); setRememberMe(true); }
        } else {
          const SecureStore = await import('expo-secure-store');
          const saved = await SecureStore.getItemAsync('remembered_username');
          if (saved) { setUsername(saved); setRememberMe(true); }
        }
      } catch {}
    })();
  }, []);

  /* 保存/清除记住账号 */
  const persistRemember = async (uname: string, remember: boolean) => {
    try {
      if (process.env.EXPO_OS === 'web') {
        if (typeof localStorage !== 'undefined') {
          remember ? localStorage.setItem('remembered_username', uname) : localStorage.removeItem('remembered_username');
        }
      } else {
        const SecureStore = await import('expo-secure-store');
        remember ? await SecureStore.setItemAsync('remembered_username', uname) : await SecureStore.deleteItemAsync('remembered_username');
      }
    } catch {}
  };

  /* 登录 */
  const handleLogin = async () => {
    if (!username.trim()) { setError('请输入用户名'); return; }
    if (!password.trim()) { setError('请输入密码'); return; }
    setLoading(true);
    setError('');
    const email = username.trim() + '@miaoda.com';
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) {
        setError('账号或密码错误，请重试');
        setLoading(false);
        return;
      }
    } catch {
      setError('网络异常，请稍后重试');
      setLoading(false);
      return;
    }
    await persistRemember(username.trim(), rememberMe);
    router.replace('/');
    setLoading(false);
  };

  /* 访客登录：随机生成临时账号，无需注册即可体验 */
  const handleGuest = async () => {
    setGuestLoading(true);
    setError('');
    // 生成随机8位 hex 作为访客唯一标识
    const randHex = Math.random().toString(16).slice(2, 10).padEnd(8, '0');
    const guestEmail = `guest_${randHex}@visitor.local`;
    const guestPwd   = `Guest@${randHex}Xx9!`;
    // 直接注册（关闭邮件验证，注册即登录）
    const { error: signUpErr } = await supabase.auth.signUp({
      email: guestEmail,
      password: guestPwd,
    });
    if (signUpErr) {
      setError('访客登录失败，请稍后重试');
      setGuestLoading(false);
      return;
    }
    router.replace('/');
    setGuestLoading(false);
  };

  return (
    <View style={{ flex: 1 }}>
      <StatusBar style="light" backgroundColor={C.bgTop} />

      {/* 蓝色渐变背景（两段模拟） */}
      <View style={{ position: 'absolute', inset: 0 }} pointerEvents="none">
        <View style={{ flex: 1, backgroundColor: C.bgTop }} />
        <View style={{ flex: 1, backgroundColor: C.bgBot }} />
      </View>
      {/* 背景装饰圆 */}
      <View style={{ position: 'absolute', top: -80, right: -80, width: 240, height: 240, borderRadius: 120, backgroundColor: 'rgba(45,111,204,0.15)' }} pointerEvents="none" />
      <View style={{ position: 'absolute', bottom: -60, left: -60, width: 180, height: 180, borderRadius: 90, backgroundColor: 'rgba(26,86,176,0.12)' }} pointerEvents="none" />

      <KeyboardAvoidingView
        behavior={process.env.EXPO_OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: 'center',
            alignItems: 'center',
            paddingTop: insets.top + 32,
            paddingBottom: insets.bottom + 24,
            paddingHorizontal: 20,
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* 顶部徽标区 */}
          <HeaderBadge />

          {/* ── 登录卡片 ── */}
          <View style={{
            width: '100%',
            maxWidth: 440,
            backgroundColor: C.card,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: C.cardBorder,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 12 },
            shadowOpacity: 0.25,
            shadowRadius: 24,
            overflow: 'hidden',
          }}>
            {/* 卡片顶部蓝色条 */}
            <View style={{ height: 4, backgroundColor: C.primary }} />

            <View style={{ padding: 28, gap: 20 }}>
              {/* 卡片标题 */}
              <View style={{ alignItems: 'center', marginBottom: 4 }}>
                <Text style={{ fontSize: 16, fontWeight: '700', color: C.textDark, letterSpacing: 1 }}>
                  干部身份核验
                </Text>
                <Text style={{ fontSize: 12, color: C.textLight, marginTop: 4 }}>
                  请输入您的组织系统账号
                </Text>
              </View>

              {/* 用户名 */}
              <View style={{ gap: 6 }}>
                <Text style={{ fontSize: 12, color: C.textMid, fontWeight: '600', letterSpacing: 0.5 }}>
                  用户名
                </Text>
                <View style={{
                  borderWidth: 1.5,
                  borderColor: userFocus ? C.borderFocus : C.border,
                  borderRadius: 10,
                  backgroundColor: userFocus ? '#F0F7FF' : C.inputBg,
                  flexDirection: 'row', alignItems: 'center',
                  paddingHorizontal: 14,
                }}>
                  <Text style={{ fontSize: 16, marginRight: 8, color: C.textLight }}>👤</Text>
                  <TextInput
                    style={{ flex: 1, height: 48, fontSize: 15, color: C.textDark }}
                    placeholder="请输入用户名"
                    placeholderTextColor={C.textLight}
                    value={username}
                    onChangeText={setUsername}
                    onFocus={() => setUserFocus(true)}
                    onBlur={() => setUserFocus(false)}
                    autoCapitalize="none"
                    autoCorrect={false}
                    returnKeyType="next"
                  />
                </View>
              </View>

              {/* 密码 */}
              <View style={{ gap: 6 }}>
                <Text style={{ fontSize: 12, color: C.textMid, fontWeight: '600', letterSpacing: 0.5 }}>
                  密码
                </Text>
                <View style={{
                  borderWidth: 1.5,
                  borderColor: pwFocus ? C.borderFocus : C.border,
                  borderRadius: 10,
                  backgroundColor: pwFocus ? '#F0F7FF' : C.inputBg,
                  flexDirection: 'row', alignItems: 'center',
                  paddingHorizontal: 14,
                }}>
                  <Text style={{ fontSize: 16, marginRight: 8, color: C.textLight }}>🔒</Text>
                  <TextInput
                    style={{ flex: 1, height: 48, fontSize: 15, color: C.textDark }}
                    placeholder="请输入密码"
                    placeholderTextColor={C.textLight}
                    value={password}
                    onChangeText={setPassword}
                    onFocus={() => setPwFocus(true)}
                    onBlur={() => setPwFocus(false)}
                    secureTextEntry={!showPw}
                    returnKeyType="done"
                    onSubmitEditing={handleLogin}
                  />
                  <Pressable onPress={() => setShowPw(!showPw)} style={{ padding: 4 }}>
                    <Text style={{ fontSize: 15, color: C.textLight }}>{showPw ? '🙈' : '👁️'}</Text>
                  </Pressable>
                </View>
              </View>

              {/* 记住我 + 忘记密码 */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Checkbox checked={rememberMe} onToggle={() => setRememberMe(!rememberMe)} />
                <Pressable onPress={() => setError('请联系管理员重置密码')}>
                  <Text style={{ fontSize: 13, color: C.primary }}>忘记密码？</Text>
                </Pressable>
              </View>

              {/* 错误提示 */}
              {!!error && (
                <View style={{
                  backgroundColor: C.errBg,
                  borderWidth: 1, borderColor: C.errBorder,
                  borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8,
                  flexDirection: 'row', alignItems: 'center', gap: 6,
                }}>
                  <Text style={{ fontSize: 14, color: C.errText }}>⚠</Text>
                  <Text style={{ fontSize: 13, color: C.errText, flex: 1 }}>{error}</Text>
                </View>
              )}

              {/* 登录按钮 */}
              <Pressable
                onPress={handleLogin}
                disabled={loading}
                onPressIn={() => setLoginPressed(true)}
                onPressOut={() => setLoginPressed(false)}
                style={{
                  backgroundColor: loginPressed ? C.primaryDim : C.primary,
                  borderRadius: 10, height: 52,
                  alignItems: 'center', justifyContent: 'center',
                  opacity: loading ? 0.7 : 1,
                  shadowColor: C.primary,
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.4, shadowRadius: 10,
                }}
              >
                {loading
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: 2 }}>登  录</Text>
                }
              </Pressable>

              {/* 分割线 */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={{ flex: 1, height: 1, backgroundColor: C.border }} />
                <Text style={{ fontSize: 12, color: C.textLight }}>或</Text>
                <View style={{ flex: 1, height: 1, backgroundColor: C.border }} />
              </View>

              {/* 访客登录 */}
              <Pressable
                onPress={handleGuest}
                disabled={guestLoading}
                onPressIn={() => setGuestPressed(true)}
                onPressOut={() => setGuestPressed(false)}
                style={{
                  borderWidth: 1.5,
                  borderColor: guestPressed ? C.primaryLight : C.border,
                  borderRadius: 10, height: 48,
                  alignItems: 'center', justifyContent: 'center',
                  backgroundColor: guestPressed ? '#F0F7FF' : 'transparent',
                  flexDirection: 'row', gap: 8,
                }}
              >
                {guestLoading
                  ? <ActivityIndicator color={C.primary} size="small" />
                  : <>
                      <Text style={{ fontSize: 15 }}>🎭</Text>
                      <Text style={{ fontSize: 14, color: C.primary, fontWeight: '600' }}>访客游玩（无需注册）</Text>
                    </>
                }
              </Pressable>
              <Text style={{ textAlign: 'center', fontSize: 11, color: C.textLight }}>
                访客数据绑定设备，清除应用后将消失
              </Text>
            </View>

            {/* 卡片底部 */}
            <View style={{ borderTopWidth: 1, borderTopColor: C.cardBorder, paddingVertical: 14, alignItems: 'center', backgroundColor: '#F8FBFF' }}>
              <Pressable onPress={() => router.push('/(auth)/sign-up' as never)}>
                <Text style={{ fontSize: 13, color: C.textMid }}>
                  还没有账号？{' '}
                  <Text style={{ color: C.primary, fontWeight: '700' }}>立即注册</Text>
                </Text>
              </Pressable>
              <Text style={{ fontSize: 11, color: C.textLight, marginTop: 8 }}>
                登录即代表同意《用户协议》及《隐私政策》
              </Text>
            </View>
          </View>

          {/* 底部信息 */}
          <View style={{ marginTop: 24, alignItems: 'center', gap: 4 }}>
            <Text style={{ fontSize: 11, color: 'rgba(180,210,255,0.6)', letterSpacing: 1 }}>
              华夏共和国干部晋升模拟系统 · v3.5
            </Text>
            <Text style={{ fontSize: 12, color: 'rgba(180,210,255,0.8)', fontWeight: '600' }}>
              官方QQ交流群：1037034003
            </Text>
            <Text style={{ fontSize: 11, color: 'rgba(180,210,255,0.6)' }}>
              开发者 高仙客来  QQ：2794045093
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}


