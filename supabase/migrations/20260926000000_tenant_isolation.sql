-- Deploy the public-business server projection before applying this migration.
BEGIN;
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public can read businesses by slug" ON public.businesses;
-- Restrictive policy also constrains any legacy permissive SELECT/ALL policies.
DROP POLICY IF EXISTS "Business reads require ownership" ON public.businesses;
CREATE POLICY "Business reads require ownership" ON public.businesses
  AS RESTRICTIVE FOR SELECT TO anon, authenticated USING (user_id = (SELECT auth.uid()));
DROP POLICY IF EXISTS "Users can read own business" ON public.businesses;
CREATE POLICY "Users can read own business" ON public.businesses
  FOR SELECT TO authenticated USING (user_id = (SELECT auth.uid()));
-- All business mutations go through authenticated server endpoints. Prevent owner
-- changes to tier, user_id, parent_business_id, billing and integration credentials.
REVOKE INSERT, UPDATE, DELETE ON public.businesses FROM anon, authenticated;
-- Existing public feedback/review INSERT policies need an existence check that
-- does not depend on public SELECT access to the private businesses table.
CREATE OR REPLACE FUNCTION public.reviewflo_public_submission_valid(business_uuid uuid, review_uuid uuid DEFAULT NULL)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = business_uuid)
    AND (review_uuid IS NULL OR EXISTS (
      SELECT 1 FROM public.reviews r WHERE r.id = review_uuid AND r.business_id = business_uuid
    ));
$$;
REVOKE ALL ON FUNCTION public.reviewflo_public_submission_valid(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reviewflo_public_submission_valid(uuid, uuid) TO anon, authenticated;
DROP POLICY IF EXISTS "Public can insert feedback" ON public.feedback;
CREATE POLICY "Public can insert feedback" ON public.feedback FOR INSERT TO anon, authenticated
  WITH CHECK (public.reviewflo_public_submission_valid(business_id, review_id));
DROP POLICY IF EXISTS "Public can insert reviews" ON public.reviews;
CREATE POLICY "Public can insert reviews" ON public.reviews FOR INSERT TO anon, authenticated
  WITH CHECK (public.reviewflo_public_submission_valid(business_id));
COMMIT;
