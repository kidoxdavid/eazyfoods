-- The audit log is append-only and must outlive the people in it: keep every row exactly as written, and stop it from blocking the deletion of an account.
ALTER TABLE audit_log DROP CONSTRAINT audit_log_actor_user_id_fkey;
-- A person who signed up from the vendor or driver sign-up window has no role until they apply; this lets their staff sign-in work meanwhile.
ALTER TABLE users ADD COLUMN staff_signup text CHECK (staff_signup IN ('vendor','driver'));
