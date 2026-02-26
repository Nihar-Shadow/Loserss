
-- Create community messages table
CREATE TABLE public.community_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  channel TEXT NOT NULL DEFAULT 'general',
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.community_messages ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read messages
CREATE POLICY "Authenticated users can view messages"
  ON public.community_messages FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Users can insert their own messages
CREATE POLICY "Users can insert own messages"
  ON public.community_messages FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own messages
CREATE POLICY "Users can delete own messages"
  ON public.community_messages FOR DELETE
  USING (auth.uid() = user_id);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.community_messages;

-- Index for fast channel queries
CREATE INDEX idx_community_messages_channel_created ON public.community_messages (channel, created_at DESC);
