-- Revenue recomputation is an internal server operation, not a public RPC.
-- SECURITY DEFINER previously let any caller update another business's summary.
BEGIN;
DO $$
BEGIN
  IF to_regprocedure('public.recalculate_monthly_summary(uuid,date)') IS NOT NULL THEN
    REVOKE ALL ON FUNCTION public.recalculate_monthly_summary(uuid, date) FROM PUBLIC, anon, authenticated;
    GRANT EXECUTE ON FUNCTION public.recalculate_monthly_summary(uuid, date) TO service_role;
    ALTER FUNCTION public.recalculate_monthly_summary(uuid, date) SET search_path = public, pg_temp;
  END IF;
END;
$$;
COMMIT;
