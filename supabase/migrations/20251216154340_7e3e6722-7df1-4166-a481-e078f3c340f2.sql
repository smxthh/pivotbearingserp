-- Insert admin role for smitmodi416@gmail.com
INSERT INTO public.user_roles (user_id, role)
VALUES ('91b3609a-d0fb-43c3-b9f3-fa6bb6989d13', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;