-- 添加 answers 字段到 practice_tasks 表
ALTER TABLE practice_tasks ADD COLUMN IF NOT EXISTS answers JSONB;
