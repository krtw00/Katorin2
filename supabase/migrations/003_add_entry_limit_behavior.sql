-- 定員超過時の対応設定を追加
CREATE TYPE entry_limit_behavior AS ENUM ('first_come', 'waitlist');

ALTER TABLE tournaments
ADD COLUMN entry_limit_behavior entry_limit_behavior NOT NULL DEFAULT 'first_come';

COMMENT ON COLUMN tournaments.entry_limit_behavior IS 'Behavior when max participants is reached: first_come (stop accepting) or waitlist (add to waitlist)';
