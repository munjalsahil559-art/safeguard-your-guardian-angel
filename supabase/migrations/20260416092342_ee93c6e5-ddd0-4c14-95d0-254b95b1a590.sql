
-- Fix existing user: insert profile and role if missing
INSERT INTO public.profiles (user_id, name, email)
SELECT id, COALESCE(raw_user_meta_data->>'name', raw_user_meta_data->>'full_name', ''), email
FROM auth.users
WHERE id NOT IN (SELECT user_id FROM public.profiles)
ON CONFLICT DO NOTHING;

INSERT INTO public.user_roles (user_id, role)
SELECT id, 'user'::app_role
FROM auth.users
WHERE id NOT IN (SELECT user_id FROM public.user_roles)
ON CONFLICT DO NOTHING;

-- Enable realtime on incidents table
ALTER PUBLICATION supabase_realtime ADD TABLE public.incidents;
