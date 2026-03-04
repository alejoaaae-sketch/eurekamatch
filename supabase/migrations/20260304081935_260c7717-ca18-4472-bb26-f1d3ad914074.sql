
CREATE TABLE public.user_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  app_type TEXT NOT NULL DEFAULT 'love',
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ended_at TIMESTAMP WITH TIME ZONE,
  exit_type TEXT, -- 'logout', 'browser_close', 'timeout'
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

-- Users can insert their own sessions
CREATE POLICY "Users can insert own sessions" ON public.user_sessions
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own sessions (to set ended_at)
CREATE POLICY "Users can update own sessions" ON public.user_sessions
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can read their own sessions
CREATE POLICY "Users can read own sessions" ON public.user_sessions
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Block anonymous access
CREATE POLICY "Block anon on user_sessions" ON public.user_sessions
  FOR ALL TO anon
  USING (false)
  WITH CHECK (false);

-- Block deletes
CREATE POLICY "Block delete on user_sessions" ON public.user_sessions
  FOR DELETE TO authenticated
  USING (false);

-- Admins can read all sessions
CREATE POLICY "Admins can read all sessions" ON public.user_sessions
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
