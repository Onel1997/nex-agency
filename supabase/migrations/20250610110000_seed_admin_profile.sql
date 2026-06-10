-- NexAgency CRM: Promote first admin user
--
-- Auth users cannot be created safely via SQL migration (passwords must be
-- set through Supabase Auth). Follow these steps first:
--
-- 1. Supabase Dashboard → Authentication → Users → Add user
-- 2. Email:    admin@nexagency.de  (or your preferred admin email)
-- 3. Password: choose a strong password (min. 6 characters)
-- 4. Enable "Auto Confirm User"
-- 5. Run the statement below (adjust email if needed)

UPDATE public.profiles
SET
  role = 'admin',
  full_name = COALESCE(full_name, 'Administrator')
WHERE email = 'admin@nexagency.de';
