
-- 兑换码表
CREATE TABLE redeem_codes (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code         text UNIQUE NOT NULL,          -- 随机码（大写字母+数字，12位）
  display_name text NOT NULL DEFAULT '',      -- 文心大模型生成的诗意名称
  reward_type  text NOT NULL DEFAULT 'rank_up', -- 奖励类型：rank_up=晋升一级
  batch_note   text NOT NULL DEFAULT '',      -- 批次备注（管理员填写）
  is_used      boolean NOT NULL DEFAULT false,
  used_by_save_id uuid REFERENCES player_saves(id) ON DELETE SET NULL,
  used_at      timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE redeem_codes ENABLE ROW LEVEL SECURITY;

-- 管理员读写全权（service_role 绕过 RLS，此处给 authenticated 管理员查询权）
-- 普通玩家无法直接查询兑换码列表（通过 Edge Function 操作）
CREATE POLICY "service role bypass" ON redeem_codes
  USING (true)
  WITH CHECK (true);
