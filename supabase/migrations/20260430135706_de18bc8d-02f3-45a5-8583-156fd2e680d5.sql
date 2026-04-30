
CREATE OR REPLACE FUNCTION public.get_admin_dashboard_stats()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_result jsonb;
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Unauthorized: admin role required';
  END IF;

  WITH
  totals AS (
    SELECT
      (SELECT COUNT(*) FROM profiles) AS total_users,
      (SELECT COUNT(*) FROM profiles WHERE created_at >= now() - interval '7 days') AS new_users_7d,
      (SELECT COUNT(*) FROM profiles WHERE created_at >= now() - interval '30 days') AS new_users_30d,
      (SELECT COUNT(*) FROM profiles WHERE created_at::date = CURRENT_DATE) AS new_users_today,
      (SELECT COUNT(*) FROM picks WHERE deleted_at IS NULL) AS total_picks,
      (SELECT COUNT(*) FROM picks WHERE deleted_at IS NULL AND is_matched = true) AS matched_picks,
      (SELECT COUNT(*) FROM matches_safe) AS total_matches,
      (SELECT COUNT(*) FROM matches_safe WHERE created_at >= now() - interval '7 days') AS matches_7d,
      (SELECT COUNT(*) FROM matches_safe WHERE created_at >= now() - interval '30 days') AS matches_30d,
      (SELECT COUNT(DISTINCT user_id) FROM user_sessions WHERE started_at >= now() - interval '24 hours') AS active_users_24h,
      (SELECT COUNT(DISTINCT user_id) FROM user_sessions WHERE started_at >= now() - interval '7 days') AS active_users_7d,
      (SELECT COUNT(DISTINCT user_id) FROM user_sessions WHERE started_at >= now() - interval '30 days') AS active_users_30d,
      (SELECT COALESCE(SUM(price), 0) FROM pack_purchases WHERE payment_method NOT IN ('referral', 'simulation')) AS total_revenue,
      (SELECT COALESCE(SUM(price), 0) FROM pack_purchases WHERE payment_method NOT IN ('referral', 'simulation') AND created_at >= now() - interval '30 days') AS revenue_30d,
      (SELECT COUNT(*) FROM pack_purchases WHERE payment_method NOT IN ('referral', 'simulation')) AS total_purchases,
      (SELECT COALESCE(SUM(picks_count), 0) FROM pack_purchases) AS total_credits_granted,
      (SELECT COALESCE(SUM(total_used), 0) FROM user_pick_balance) AS total_credits_used,
      (SELECT COUNT(*) FROM pick_notifications) AS total_notifications,
      (SELECT COUNT(*) FROM pick_notifications WHERE created_at >= now() - interval '30 days') AS notifications_30d
  ),
  per_app AS (
    SELECT jsonb_agg(jsonb_build_object(
      'app_mode', app_mode,
      'picks', picks,
      'matched', matched,
      'users', users
    )) AS data
    FROM (
      SELECT
        p.app_type AS app_mode,
        COUNT(*) AS picks,
        COUNT(*) FILTER (WHERE p.is_matched) AS matched,
        COUNT(DISTINCT p.picker_id) AS users
      FROM picks p
      WHERE p.deleted_at IS NULL
      GROUP BY p.app_type
      ORDER BY p.app_type
    ) s
  ),
  signups_daily AS (
    SELECT jsonb_agg(jsonb_build_object('date', d::date, 'count', COALESCE(c, 0)) ORDER BY d) AS data
    FROM generate_series(CURRENT_DATE - interval '29 days', CURRENT_DATE, '1 day') d
    LEFT JOIN (
      SELECT created_at::date AS day, COUNT(*) AS c
      FROM profiles
      WHERE created_at >= CURRENT_DATE - interval '29 days'
      GROUP BY 1
    ) p ON p.day = d::date
  ),
  picks_daily AS (
    SELECT jsonb_agg(jsonb_build_object('date', d::date, 'count', COALESCE(c, 0)) ORDER BY d) AS data
    FROM generate_series(CURRENT_DATE - interval '29 days', CURRENT_DATE, '1 day') d
    LEFT JOIN (
      SELECT created_at::date AS day, COUNT(*) AS c
      FROM picks
      WHERE created_at >= CURRENT_DATE - interval '29 days'
      GROUP BY 1
    ) p ON p.day = d::date
  ),
  matches_daily AS (
    SELECT jsonb_agg(jsonb_build_object('date', d::date, 'count', COALESCE(c, 0)) ORDER BY d) AS data
    FROM generate_series(CURRENT_DATE - interval '29 days', CURRENT_DATE, '1 day') d
    LEFT JOIN (
      SELECT created_at::date AS day, COUNT(*) AS c
      FROM matches_safe
      WHERE created_at >= CURRENT_DATE - interval '29 days'
      GROUP BY 1
    ) m ON m.day = d::date
  ),
  lang_dist AS (
    SELECT jsonb_agg(jsonb_build_object('language', language, 'count', c)) AS data
    FROM (
      SELECT COALESCE(language, 'unknown') AS language, COUNT(*) AS c
      FROM profiles
      GROUP BY 1
      ORDER BY 2 DESC
    ) s
  ),
  recent_purchases AS (
    SELECT jsonb_agg(jsonb_build_object(
      'pack_name', pack_name,
      'price', price,
      'picks_count', picks_count,
      'payment_method', payment_method,
      'created_at', created_at
    ) ORDER BY created_at DESC) AS data
    FROM (
      SELECT pack_name, price, picks_count, payment_method, created_at
      FROM pack_purchases
      ORDER BY created_at DESC
      LIMIT 10
    ) s
  )
  SELECT jsonb_build_object(
    'totals', to_jsonb(totals.*),
    'per_app', COALESCE(per_app.data, '[]'::jsonb),
    'signups_daily', COALESCE(signups_daily.data, '[]'::jsonb),
    'picks_daily', COALESCE(picks_daily.data, '[]'::jsonb),
    'matches_daily', COALESCE(matches_daily.data, '[]'::jsonb),
    'lang_dist', COALESCE(lang_dist.data, '[]'::jsonb),
    'recent_purchases', COALESCE(recent_purchases.data, '[]'::jsonb)
  ) INTO v_result
  FROM totals, per_app, signups_daily, picks_daily, matches_daily, lang_dist, recent_purchases;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_admin_dashboard_stats() TO authenticated;
