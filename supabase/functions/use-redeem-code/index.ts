// Edge Function：使用兑换码
// 验证兑换码是否有效，执行对应奖励后标记为已使用
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405, headers: corsHeaders });
  }

  let code = '';
  let saveId = '';
  try {
    const body = await req.json() as { code: string; saveId: string };
    code = (body.code ?? '').trim().toUpperCase();
    saveId = (body.saveId ?? '').trim();
  } catch {
    return new Response(
      JSON.stringify({ error: '请求体格式错误' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  if (!code || !saveId) {
    return new Response(
      JSON.stringify({ error: '缺少 code 或 saveId 参数' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    serviceKey,
    { auth: { persistSession: false } }
  );

  // ── 内置永久码：高仙（不限次数，无需DB记录，直接解锁自动推进）──────────────
  if (code === '高仙') {
    const { data: saveRow0, error: saveErr0 } = await supabase
      .from('player_saves')
      .select('id, kpi_ranking_result')
      .eq('id', saveId)
      .maybeSingle();
    if (saveErr0 || !saveRow0) {
      return new Response(
        JSON.stringify({ success: false, message: '❌ 找不到存档，请重新登录后重试' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    const currentKpi0: string = saveRow0.kpi_ranking_result ?? '';
    // 始终将 |AUTO:1 归一化到字符串开头，防止被后续 DEPT_CD/AREA_CNT 等 builder 截断丢失
    const newKpi0 = '|AUTO:1' + currentKpi0.replace(/\|AUTO:1/g, '');
    if (newKpi0 !== currentKpi0) {
      await supabase
        .from('player_saves')
        .update({ kpi_ranking_result: newKpi0 })
        .eq('id', saveId);
    }
    return new Response(
      JSON.stringify({ success: true, message: '✅「高仙」—— 自动推进功能已永久解锁，本存档后续可随时使用！' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // 1. 查询兑换码
  const { data: codeRow, error: codeErr } = await supabase
    .from('redeem_codes')
    .select('id, reward_type, display_name, is_used, used_by_save_id')
    .eq('code', code)
    .maybeSingle();

  if (codeErr || !codeRow) {
    return new Response(
      JSON.stringify({ success: false, message: '❌ 无效兑换码，请核对后重试' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  if (codeRow.is_used) {
    return new Response(
      JSON.stringify({ success: false, message: '❌ 该兑换码已使用，每码限用一次' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // 2. 查询玩家存档
  const { data: saveRow, error: saveErr } = await supabase
    .from('player_saves')
    .select('id, rank_level, player_position, kpi_ranking_result')
    .eq('id', saveId)
    .maybeSingle();

  if (saveErr || !saveRow) {
    return new Response(
      JSON.stringify({ success: false, message: '❌ 找不到存档，请重新登录后重试' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // 3. 执行奖励
  let rewardMsg = '';

  if (codeRow.reward_type === 'rank_up') {
    // 晋升一级（最高15级）
    const RANK_NAMES: Record<number, string> = {
      1: '乡镇科员', 2: '副乡镇长', 3: '乡镇长', 4: '县委常委/副县长',
      5: '县长/区长', 6: '县委书记/区委书记', 7: '副市长', 8: '市长',
      9: '市委书记', 10: '省长/副省长', 11: '省执政委书记',
      12: '内阁部长', 13: '联邦副总统', 14: '联邦内阁总理', 15: '联邦总统',
    };
    const currentRank: number = saveRow.rank_level ?? 1;
    if (currentRank >= 15) {
      return new Response(
        JSON.stringify({ success: false, message: 'ℹ️ 您已位居联邦总统，无法继续晋升' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    const nextRank = currentRank + 1;
    const nextName = RANK_NAMES[nextRank] ?? `${nextRank}级`;
    const patch: Record<string, unknown> = {
      rank_level: nextRank,
      player_position: nextName,
      merit_points: 0,
      tenure_years: 0,
      tenure_days: 0,
      is_promotion_available: false,
    };
    // rank13 随机分配分管线
    if (nextRank === 13) {
      const tracks = ['economy', 'social', 'hmt', 'military'];
      patch.cabinet_track = tracks[Math.floor(Math.random() * tracks.length)];
    }
    if (nextRank >= 14) patch.cabinet_track = null;

    const { error: upErr } = await supabase
      .from('player_saves')
      .update(patch)
      .eq('id', saveId);

    if (upErr) {
      return new Response(
        JSON.stringify({ success: false, message: '❌ 奖励发放失败，请联系管理员' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    rewardMsg = `✅「${codeRow.display_name}」—— 恭喜晋升至${nextName}（Lv.${nextRank}）！`;

  } else if (codeRow.reward_type === 'auto_unlock') {
    // 解锁自动推进（永久有效，单个存档限用一次）
    // 始终将 |AUTO:1 归一化到字符串开头，防止被后续 builder 截断丢失
    const currentKpi: string = saveRow.kpi_ranking_result ?? '';
    if (currentKpi.startsWith('|AUTO:1')) {
      return new Response(
        JSON.stringify({ success: false, message: 'ℹ️ 当前存档已解锁自动推进，无法重复使用' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    const newKpi = '|AUTO:1' + currentKpi.replace(/\|AUTO:1/g, '');
    const { error: upErr } = await supabase
      .from('player_saves')
      .update({ kpi_ranking_result: newKpi })
      .eq('id', saveId);
    if (upErr) {
      return new Response(
        JSON.stringify({ success: false, message: '❌ 奖励发放失败，请联系管理员' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    rewardMsg = `✅「${codeRow.display_name}」—— 自动推进功能已永久解锁，本存档后续可随时使用！`;

  } else {
    return new Response(
      JSON.stringify({ success: false, message: '❌ 未知奖励类型，请联系管理员' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // 4. 标记兑换码已使用
  await supabase
    .from('redeem_codes')
    .update({ is_used: true, used_by_save_id: saveId, used_at: new Date().toISOString() })
    .eq('id', codeRow.id);

  return new Response(
    JSON.stringify({ success: true, message: rewardMsg }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
});
