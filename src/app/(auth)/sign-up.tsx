import { useState } from 'react';
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

/* ─── 蓝色渐变配色（与登录页保持一致）─── */
const C = {
  bgTop:        '#0A1628',
  bgBot:        '#0D2347',
  card:         '#FFFFFF',
  cardBorder:   '#DDEAF8',
  primary:      '#1A56B0',
  primaryLight: '#2D6FCC',
  primaryDim:   '#0E3A7A',
  textDark:     '#0D1E38',
  textMid:      '#4A6080',
  textLight:    '#8AA0BA',
  textWhite:    '#FFFFFF',
  border:       '#C8D8EC',
  borderFocus:  '#1A56B0',
  inputBg:      '#F5F9FF',
  errBg:        'rgba(220,38,38,0.06)',
  errBorder:    '#DC2626',
  errText:      '#DC2626',
  successBg:    'rgba(22,163,74,0.06)',
  successBorder:'#16A34A',
  successText:  '#16A34A',
};

/* ─── 顶部徽标 ─── */
function HeaderBadge() {
  return (
    <View style={{ alignItems: 'center', marginBottom: 28 }}>
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
      <Text style={{ fontSize: 11, color: 'rgba(200,220,255,0.7)', letterSpacing: 3, marginBottom: 8 }}>
        HUAXIA REPUBLIC · CADRE SYSTEM
      </Text>
      <Text style={{
        fontSize: 20, fontWeight: '800', color: C.textWhite,
        letterSpacing: 2, textAlign: 'center', lineHeight: 28,
      }}>
        华夏共和国干部模拟系
      </Text>
    </View>
  );
}

/* ─── 输入行 ─── */
function InputRow({
  label, icon, value, onChangeText, placeholder,
  secureTextEntry, onFocus, onBlur, focused, returnKeyType, onSubmitEditing,
  autoCapitalize,
}: {
  label: string; icon: string; value: string;
  onChangeText: (v: string) => void; placeholder: string;
  secureTextEntry?: boolean;
  onFocus: () => void; onBlur: () => void; focused: boolean;
  returnKeyType?: 'next' | 'done';
  onSubmitEditing?: () => void;
  autoCapitalize?: 'none' | 'sentences';
}) {
  const [showSecret, setShowSecret] = useState(false);
  const isSecret = secureTextEntry;
  return (
    <View style={{ gap: 6 }}>
      <Text style={{ fontSize: 12, color: C.textMid, fontWeight: '600', letterSpacing: 0.5 }}>{label}</Text>
      <View style={{
        borderWidth: 1.5,
        borderColor: focused ? C.borderFocus : C.border,
        borderRadius: 10,
        backgroundColor: focused ? '#F0F7FF' : C.inputBg,
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: 14,
      }}>
        <Text style={{ fontSize: 16, marginRight: 8, color: C.textLight }}>{icon}</Text>
        <TextInput
          style={{ flex: 1, height: 48, fontSize: 15, color: C.textDark }}
          placeholder={placeholder}
          placeholderTextColor={C.textLight}
          value={value}
          onChangeText={onChangeText}
          onFocus={onFocus}
          onBlur={onBlur}
          secureTextEntry={isSecret && !showSecret}
          autoCapitalize={autoCapitalize ?? 'none'}
          autoCorrect={false}
          returnKeyType={returnKeyType ?? 'next'}
          onSubmitEditing={onSubmitEditing}
        />
        {isSecret && (
          <Pressable onPress={() => setShowSecret(!showSecret)} style={{ padding: 4 }}>
            <Text style={{ fontSize: 15, color: C.textLight }}>{showSecret ? '🙈' : '👁️'}</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

/* ─── 主组件 ─── */
export default function SignUp() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [username, setUsername]   = useState('');
  const [password, setPassword]   = useState('');
  const [confirm,  setConfirm]    = useState('');
  const [loading,  setLoading]    = useState(false);
  const [error,    setError]      = useState('');
  const [success,  setSuccess]    = useState('');
  const [btnPressed, setBtnPressed] = useState(false);

  /* focus 状态 */
  const [fUser, setFUser] = useState(false);
  const [fPw,   setFPw]   = useState(false);
  const [fCfm,  setFCfm]  = useState(false);

  /* 表单校验 */
  const validate = (): string | null => {
    if (!username.trim())             return '请输入用户名';
    if (username.trim().includes('@')) return '用户名不能包含@符号，请直接输入用户名（如：zhangsan）';
    if (username.trim().length < 3)   return '用户名至少需要3位字符';
    if (username.trim().length > 20)  return '用户名不能超过20位字符';
    if (!password)                    return '请输入密码';
    if (password.length < 6)          return '密码至少需要6位字符';
    if (password !== confirm)         return '两次输入的密码不一致';
    return null;
  };

  /* 注册 */
  const handleRegister = async () => {
    const msg = validate();
    if (msg) { setError(msg); return; }
    setLoading(true);
    setError('');
    setSuccess('');
    const email = username.trim() + '@miaoda.com';
    const { error: signUpError } = await supabase.auth.signUp({ email, password });
    setLoading(false);
    if (signUpError) {
      if (signUpError.message.includes('already registered') || signUpError.message.includes('already been')) {
        setError('该用户名已被注册，请换一个');
      } else {
        setError('注册失败：' + signUpError.message);
      }
      return;
    }
    setSuccess('注册成功！正在跳转登录…');
    setTimeout(() => router.replace('/(auth)/sign-in'), 1200);
  };

  return (
    <View style={{ flex: 1 }}>
      <StatusBar style="light" backgroundColor={C.bgTop} />

      {/* 蓝色渐变背景 */}
      <View style={{ position: 'absolute', inset: 0 }} pointerEvents="none">
        <View style={{ flex: 1, backgroundColor: C.bgTop }} />
        <View style={{ flex: 1, backgroundColor: C.bgBot }} />
      </View>
      {/* 装饰圆 */}
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
          <HeaderBadge />

          {/* 注册卡片 */}
          <View style={{
            width: '100%', maxWidth: 440,
            backgroundColor: C.card,
            borderRadius: 16, borderWidth: 1, borderColor: C.cardBorder,
            shadowColor: '#000', shadowOffset: { width: 0, height: 12 },
            shadowOpacity: 0.25, shadowRadius: 24,
            overflow: 'hidden',
          }}>
            {/* 顶部蓝色条 */}
            <View style={{ height: 4, backgroundColor: C.primary }} />

            <View style={{ padding: 28, gap: 20 }}>
              {/* 卡片标题 */}
              <View style={{ alignItems: 'center', marginBottom: 4 }}>
                <Text style={{ fontSize: 16, fontWeight: '700', color: C.textDark, letterSpacing: 1 }}>
                  干部档案注册
                </Text>
                <Text style={{ fontSize: 12, color: C.textLight, marginTop: 4 }}>
                  建立您的组织系统账号
                </Text>
              </View>

              <InputRow
                label="用户名" icon="👤"
                value={username} onChangeText={setUsername}
                placeholder="3-20位字符，字母/数字，勿含@"
                focused={fUser} onFocus={() => setFUser(true)} onBlur={() => setFUser(false)}
                returnKeyType="next"
              />
              <InputRow
                label="密码" icon="🔒"
                value={password} onChangeText={setPassword}
                placeholder="至少6位字符"
                secureTextEntry
                focused={fPw} onFocus={() => setFPw(true)} onBlur={() => setFPw(false)}
                returnKeyType="next"
              />
              <InputRow
                label="确认密码" icon="🔑"
                value={confirm} onChangeText={setConfirm}
                placeholder="再次输入密码"
                secureTextEntry
                focused={fCfm} onFocus={() => setFCfm(true)} onBlur={() => setFCfm(false)}
                returnKeyType="done"
                onSubmitEditing={handleRegister}
              />

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

              {/* 成功提示 */}
              {!!success && (
                <View style={{
                  backgroundColor: C.successBg,
                  borderWidth: 1, borderColor: C.successBorder,
                  borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8,
                  flexDirection: 'row', alignItems: 'center', gap: 6,
                }}>
                  <Text style={{ fontSize: 14, color: C.successText }}>✓</Text>
                  <Text style={{ fontSize: 13, color: C.successText, flex: 1 }}>{success}</Text>
                </View>
              )}

              {/* 注册按钮 */}
              <Pressable
                onPress={handleRegister}
                disabled={loading}
                onPressIn={() => setBtnPressed(true)}
                onPressOut={() => setBtnPressed(false)}
                style={{
                  backgroundColor: btnPressed ? C.primaryDim : C.primary,
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
                  : <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: 2 }}>注  册</Text>
                }
              </Pressable>

              <Text style={{ fontSize: 11, color: C.textLight, textAlign: 'center' }}>
                注册即代表同意《用户协议》及《隐私政策》
              </Text>
            </View>

            {/* 卡片底部 */}
            <View style={{ borderTopWidth: 1, borderTopColor: C.cardBorder, paddingVertical: 14, alignItems: 'center', backgroundColor: '#F8FBFF' }}>
              <Pressable onPress={() => router.replace('/(auth)/sign-in')}>
                <Text style={{ fontSize: 13, color: C.textMid }}>
                  已有账号？{' '}
                  <Text style={{ color: C.primary, fontWeight: '700' }}>立即登录</Text>
                </Text>
              </Pressable>
            </View>
          </View>

          {/* 底部信息 */}
          <View style={{ marginTop: 24, alignItems: 'center', gap: 4 }}>
            <Text style={{ fontSize: 11, color: 'rgba(180,210,255,0.6)', letterSpacing: 1 }}>
              华夏共和国干部晋升模拟系统 · v3.5
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
