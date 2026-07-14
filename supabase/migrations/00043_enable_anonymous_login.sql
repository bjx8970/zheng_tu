-- 开启 Supabase 匿名登录（anonymous users）
-- 通过写入 auth.instances 表的 raw_base_config 字段开启匿名登录
UPDATE auth.instances
SET raw_base_config = jsonb_set(
  COALESCE(raw_base_config::jsonb, '{}'::jsonb),
  '{external_anonymous_users_enabled}',
  'true'
)::text
WHERE id = (SELECT id FROM auth.instances LIMIT 1);