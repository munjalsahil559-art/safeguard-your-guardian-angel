
-- 1) Restrict realtime.messages SELECT policy
DROP POLICY IF EXISTS "Authenticated users can receive realtime" ON realtime.messages;
CREATE POLICY "Users receive own realtime, admins receive admin"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  (realtime.topic() = ('user:' || auth.uid()::text))
  OR (realtime.topic() LIKE 'admin:%' AND public.has_role(auth.uid(), 'admin'::app_role))
);

-- 2) Add DELETE policies for incidents
CREATE POLICY "Users can delete own incidents"
ON public.incidents FOR DELETE
TO authenticated
USING (auth.uid() = reported_by);

CREATE POLICY "Admins can delete all incidents"
ON public.incidents FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 3) Revoke public EXECUTE on SECURITY DEFINER functions (only used internally / by triggers)
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated, service_role;
