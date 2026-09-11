-- Todo-liste quotidienne : une ligne par tâche cochée par jour et par
-- utilisateur. task_key correspond aux clés stables générées par
-- routineQuotidienne() dans internal/planner/monthly_plan.go
-- (matin-0, matin-1, journee-0, soir-0, coucher-2, etc.).

CREATE TABLE IF NOT EXISTS task_completions (
    id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      uuid        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    task_date    date        NOT NULL,
    task_key     text        NOT NULL,
    completed_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (user_id, task_date, task_key)
);

CREATE INDEX IF NOT EXISTS task_completions_user_date_idx
    ON task_completions (user_id, task_date);

ALTER TABLE task_completions ENABLE ROW LEVEL SECURITY;
