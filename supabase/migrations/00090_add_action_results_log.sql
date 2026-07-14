-- 通用行动结果日志，格式：Record<pagePrefix_actionKey, {ok,desc,day}>
ALTER TABLE player_saves ADD COLUMN IF NOT EXISTS action_results_log TEXT DEFAULT '{}';
