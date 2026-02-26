-- Add unique constraint on user_id + lesson_id for upsert support
ALTER TABLE public.learning_progress ADD CONSTRAINT learning_progress_user_lesson_unique UNIQUE (user_id, lesson_id);
