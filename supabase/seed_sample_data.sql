-- Seed sample businesses
INSERT INTO public.businesses (business_name, owner_id, mobile_number, join_code, max_members)
VALUES
  ('Tech Solutions', '00000000-0000-0000-0000-000000000001', '9876543210', 'JOIN123', 10),
  ('Retail Hub', '00000000-0000-0000-0000-000000000002', '9123456780', 'JOIN456', 15);

-- Seed sample profiles
INSERT INTO public.profiles (user_id, display_name, business_id, mobile_number, theme)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'Alice Owner', '00000000-0000-0000-0000-000000000001', '9876543210', 'light'),
  ('00000000-0000-0000-0000-000000000002', 'Bob Owner', '00000000-0000-0000-0000-000000000002', '9123456780', 'dark');

INSERT INTO public.user_roles (user_id, business_id)
VALUES
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000002');

-- Seed sample subscriptions for seeded businesses
INSERT INTO public.subscriptions (business_id, status, trial_end, current_period_start, current_period_end, cancel_at_period_end)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'active', '2026-03-31', '2026-03-01', '2026-03-31', false),
  ('00000000-0000-0000-0000-000000000002', 'trialing', '2026-03-15', '2026-03-01', '2026-03-15', true);