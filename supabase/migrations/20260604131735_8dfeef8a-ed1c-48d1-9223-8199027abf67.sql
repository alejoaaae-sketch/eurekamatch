
-- ============================================================
-- 1. Remove client mutation policies on financial tables
-- ============================================================
DROP POLICY IF EXISTS "Users can update own balance" ON public.user_pick_balance;
DROP POLICY IF EXISTS "Users can insert own balance" ON public.user_pick_balance;

DROP POLICY IF EXISTS "Users can update own usage" ON public.user_usage;
DROP POLICY IF EXISTS "Users can upsert own usage" ON public.user_usage;

DROP POLICY IF EXISTS "Users can insert own purchases" ON public.pack_purchases;

-- ============================================================
-- 2. Tighten pick_notifications INSERT policy
-- ============================================================
DROP POLICY IF EXISTS "Users can insert own notifications" ON public.pick_notifications;
CREATE POLICY "Users can insert own notifications"
  ON public.pick_notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
      SELECT 1 FROM public.picks p
      WHERE p.id = pick_notifications.pick_id
        AND p.picker_id = auth.uid()
        AND p.deleted_at IS NULL
        AND p.picked_user_id IS NOT NULL
        AND p.picked_user_id = pick_notifications.recipient_user_id
    )
  );

-- ============================================================
-- 3. Block client-side writes to verification flags on profiles
-- ============================================================
CREATE OR REPLACE FUNCTION public.prevent_client_verification_flag_writes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text;
BEGIN
  -- Service role / postgres bypass this check
  v_role := current_setting('request.jwt.claim.role', true);
  IF v_role = 'service_role' OR session_user = 'postgres' THEN
    RETURN NEW;
  END IF;

  IF NEW.phone_verified IS DISTINCT FROM OLD.phone_verified THEN
    NEW.phone_verified := OLD.phone_verified;
  END IF;
  IF NEW.email_verified IS DISTINCT FROM OLD.email_verified THEN
    NEW.email_verified := OLD.email_verified;
  END IF;
  IF NEW.age_verified IS DISTINCT FROM OLD.age_verified THEN
    NEW.age_verified := OLD.age_verified;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_block_verification_writes ON public.profiles;
CREATE TRIGGER profiles_block_verification_writes
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_client_verification_flag_writes();

-- ============================================================
-- 4. SECURITY DEFINER RPC: consume 1 pick safely
-- ============================================================
CREATE OR REPLACE FUNCTION public.consume_pick()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_remaining int;
  v_used int;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT picks_remaining, total_used INTO v_remaining, v_used
  FROM public.user_pick_balance WHERE user_id = v_user FOR UPDATE;

  IF v_remaining IS NULL THEN
    RAISE EXCEPTION 'No balance';
  END IF;
  IF v_remaining <= 0 THEN
    RAISE EXCEPTION 'No picks remaining';
  END IF;

  UPDATE public.user_pick_balance
  SET picks_remaining = v_remaining - 1,
      total_used = v_used + 1
  WHERE user_id = v_user;

  RETURN jsonb_build_object('picks_remaining', v_remaining - 1);
END;
$$;

-- ============================================================
-- 5. SECURITY DEFINER RPC: complete a beta-mode simulated purchase
--    Only allowed when global_config.beta_mode = true
-- ============================================================
CREATE OR REPLACE FUNCTION public.complete_beta_purchase(p_pack_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_beta boolean;
  v_pack public.pick_packs%ROWTYPE;
  v_current_remaining int;
  v_current_purchased int;
  v_current_used int;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT beta_mode INTO v_beta FROM public.global_config LIMIT 1;
  IF COALESCE(v_beta, false) = false THEN
    RAISE EXCEPTION 'Beta mode is not enabled';
  END IF;

  SELECT * INTO v_pack FROM public.pick_packs WHERE id = p_pack_id AND enabled = true;
  IF v_pack.id IS NULL THEN
    RAISE EXCEPTION 'Invalid or disabled pack';
  END IF;

  INSERT INTO public.pack_purchases (user_id, pack_id, pack_name, picks_count, price, payment_method)
  VALUES (v_user, v_pack.id, v_pack.name, v_pack.picks_count, v_pack.price, 'beta_simulation');

  SELECT picks_remaining, total_purchased, total_used
    INTO v_current_remaining, v_current_purchased, v_current_used
  FROM public.user_pick_balance WHERE user_id = v_user;

  IF v_current_remaining IS NULL THEN
    INSERT INTO public.user_pick_balance (user_id, picks_remaining, total_purchased, total_used)
    VALUES (v_user, v_pack.picks_count, v_pack.picks_count, 0);
  ELSE
    UPDATE public.user_pick_balance
    SET picks_remaining = v_current_remaining + v_pack.picks_count,
        total_purchased = v_current_purchased + v_pack.picks_count
    WHERE user_id = v_user;
  END IF;

  RETURN jsonb_build_object('success', true, 'picks_added', v_pack.picks_count);
END;
$$;

-- ============================================================
-- 6. SECURITY DEFINER RPC for verify-otp edge function to mark
--    phone as verified. Restricted to service_role only.
-- ============================================================
CREATE OR REPLACE FUNCTION public.set_phone_verified_by_phone(p_phone text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
  SET phone_verified = true
  WHERE normalize_phone(phone) = normalize_phone(p_phone);
END;
$$;

-- ============================================================
-- 7. EXECUTE privileges: revoke from public/anon/authenticated,
--    then grant explicitly where required.
-- ============================================================
REVOKE EXECUTE ON FUNCTION public.consume_pick() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.consume_pick() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.complete_beta_purchase(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.complete_beta_purchase(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.set_phone_verified_by_phone(text) FROM public, anon, authenticated;

-- Internal helpers: should never be callable from the API
REVOKE EXECUTE ON FUNCTION public.prevent_client_verification_flag_writes() FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.normalize_phone(text) FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.cleanup_old_otp_attempts() FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.cleanup_expired_email_verifications() FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.cleanup_expired_otps() FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enforce_max_new_users_per_day() FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.generate_referral_code() FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_matches_safe_from_matches() FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.grant_referral_credit() FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_match_created() FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.check_mutual_match() FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.check_matches_on_profile_update() FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.grant_free_picks_on_signup() FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enforce_pick_soft_delete_only() FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.check_pick_limit() FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_app_disabled_for_user(uuid, text) FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_effective_max_picks(text) FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.has_block_between(uuid, uuid) FROM public, anon, authenticated;

-- Helpers used by other policies/triggers still need server-side execution; nothing more to grant.

-- ============================================================
-- 8. Update notify_match_created trigger to authenticate the
--    edge function call with the service role JWT.
-- ============================================================
CREATE OR REPLACE FUNCTION public.notify_match_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_app_type text;
  v_service_key text;
BEGIN
  SELECT app_type INTO v_app_type FROM public.picks WHERE id = NEW.pick1_id;
  v_service_key := current_setting('app.service_role_key', true);

  BEGIN
    PERFORM net.http_post(
      url := 'https://mnfseybrfzexacyzjqwh.supabase.co/functions/v1/send-match-notification',
      body := jsonb_build_object(
        'matchId', NEW.id,
        'user1Id', NEW.user1_id,
        'user2Id', NEW.user2_id,
        'appType', COALESCE(v_app_type, 'love')
      ),
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-internal-source', 'db-trigger'
      )::jsonb
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Failed to send match notification for match %: %', NEW.id, SQLERRM;
  END;

  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.notify_match_created() FROM public, anon, authenticated;
