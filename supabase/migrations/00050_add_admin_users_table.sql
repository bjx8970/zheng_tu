
-- 管理员白名单表（用 username 存储，如 "2794045093"）
CREATE TABLE IF NOT EXISTS admin_users (
  id          BIGSERIAL PRIMARY KEY,
  username    TEXT NOT NULL UNIQUE,  -- 登录用户名（不含 @miaoda.com）
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 插入初始管理员
INSERT INTO admin_users (username) VALUES ('2794045093') ON CONFLICT DO NOTHING;
