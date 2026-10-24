-- One top role: admin has every permission. The separate "owner" role is folded into admin and the demo owner login is switched off.
INSERT INTO user_roles(user_id, role) SELECT user_id, 'admin' FROM user_roles WHERE role = 'owner' ON CONFLICT DO NOTHING;
DELETE FROM user_roles WHERE role = 'owner';
UPDATE users SET disabled_at = COALESCE(disabled_at, now()) WHERE email = 'owner@example.test';
ALTER TABLE user_roles DROP CONSTRAINT user_roles_role_check;
ALTER TABLE user_roles ADD CONSTRAINT user_roles_role_check CHECK (role IN
  ('customer','vendor_owner','vendor_staff','driver','admin','support','finance','dispatcher','catalog','marketing'));
ALTER TABLE sessions ADD COLUMN acting_vendor_id uuid REFERENCES vendors(id) ON DELETE SET NULL;
