// Edge Function：生成兑换码
// 调用文心大模型生成一个官场风格诗意名称，随后写入 redeem_codes 表
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/** 生成随机码：大写字母+数字，12位 */
function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 12; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

/** 调用文心大模型生成官场风格诗意名称（4~6字） */
async function genDisplayName(rewardType: string, batchNote: string): Promise<string> {
  const apiKey = Deno.env.get('INTEGRATIONS_API_KEY');
  if (!apiKey) return '鱼跃龙门';

  const rewardDesc = rewardType === 'rank_up'
    ? '晋升一级官职'
    : rewardType === 'auto_unlock'
      ? '解锁自动推进（高仙级特权）'
      : rewardType;
  const prompt = `你是一款官场模拟游戏的文案设计师。请为一张"${rewardDesc}"的兑换码生成一个4到6字的官场风格雅称，要求：
1. 有古典仕途意境（如"扶摇直上"、"鱼跃龙门"、"平步青云"等风格）
2. 正面积极，彰显晋升气象
3. 只输出名称本身，不加任何标点、说明或引号
4. 备注参考：${batchNote || '普通兑换码'}`;

  try {
    const resp = await fetch(
      'https://app-clnvk8mg04qp-api-zYkZz8qovQ1L-gateway.appmiaoda.com/v2/chat/completions',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Gateway-Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          messages: [{ role: 'user', content: prompt }],
          enable_thinking: false,
        }),
      }
    );
    if (!resp.ok || !resp.body) return '鱼跃龙门';

    const reader = resp.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let fullText = '';
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const raw = line.slice(6).trim();
        if (raw === '[DONE]') break;
        try {
          const chunk = JSON.parse(raw);
          fullText += chunk.choices?.[0]?.delta?.content ?? '';
        } catch { /* 跳过无效帧 */ }
      }
    }
    const name = fullText.trim().replace(/["""''《》【】\n\r]/g, '').slice(0, 8);
    return name || '鱼跃龙门';
  } catch {
    return '鱼跃龙门';
  }
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405, headers: corsHeaders });
  }

  // 鉴权：必须携带 service_key（管理员调用）
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  const authHeader = req.headers.get('authorization') ?? '';
  const token = authHeader.replace(/^Bearer\s+/i, '');
  if (!token || token !== serviceKey) {
    return new Response(
      JSON.stringify({ error: '无权限：仅管理员可调用' }),
      { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  let rewardType = 'rank_up';
  let batchNote = '';
  let count = 1;

  try {
    const body = await req.json() as { rewardType?: string; batchNote?: string; count?: number };
    if (body.rewardType) rewardType = body.rewardType;
    if (body.batchNote) batchNote = body.batchNote;
    if (body.count && typeof body.count === 'number') count = Math.min(20, Math.max(1, body.count));
  } catch {
    return new Response(
      JSON.stringify({ error: '请求体格式错误' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    serviceKey,
    { auth: { persistSession: false } }
  );

  const results: { code: string; displayName: string }[] = [];

  for (let i = 0; i < count; i++) {
    // 生成唯一码（最多重试3次）
    let code = '';
    for (let retry = 0; retry < 3; retry++) {
      const candidate = generateCode();
      const { data: existing } = await supabase
        .from('redeem_codes')
        .select('id')
        .eq('code', candidate)
        .maybeSingle();
      if (!existing) { code = candidate; break; }
    }
    if (!code) continue;

    // 调用文心生成名称（多个码时只调用一次，共用同一个名称 + 序号区分）
    const displayName = i === 0
      ? await genDisplayName(rewardType, batchNote)
      : results[0]?.displayName ?? '鱼跃龙门';

    const { error } = await supabase.from('redeem_codes').insert({
      code,
      display_name: displayName,
      reward_type: rewardType,
      batch_note: batchNote,
    });

    if (!error) results.push({ code, displayName });
  }

  return new Response(
    JSON.stringify({ success: true, codes: results }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
});
