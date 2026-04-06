
-- Create role enum (may already exist from partial migration)
DO $$ BEGIN CREATE TYPE public.app_role AS ENUM ('user', 'admin'); EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Timestamp update function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- User roles table (create BEFORE has_role function references it)
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'user',
  UNIQUE(user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);

-- Security definer function (create BEFORE policies that use it)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- Profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  name TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Incidents table
CREATE TABLE IF NOT EXISTS public.incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  victim_name TEXT NOT NULL,
  incident_type TEXT NOT NULL,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  time TIMESTAMPTZ NOT NULL DEFAULT now(),
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  sos_active BOOLEAN NOT NULL DEFAULT false,
  archived BOOLEAN NOT NULL DEFAULT false,
  action_taken TEXT,
  reported_by UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  evidence JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.incidents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own incidents" ON public.incidents FOR SELECT USING (auth.uid() = reported_by);
CREATE POLICY "Users can create incidents" ON public.incidents FOR INSERT WITH CHECK (auth.uid() = reported_by);
CREATE POLICY "Admins can view all incidents" ON public.incidents FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update all incidents" ON public.incidents FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER update_incidents_updated_at BEFORE UPDATE ON public.incidents FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Trusted contacts table
CREATE TABLE IF NOT EXISTS public.trusted_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.trusted_contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own contacts" ON public.trusted_contacts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own contacts" ON public.trusted_contacts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own contacts" ON public.trusted_contacts FOR DELETE USING (auth.uid() = user_id);

-- Auto-create profile & role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name', ''), NEW.email);
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
