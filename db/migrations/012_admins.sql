-- Admins: the emails whose accounts may open /admin on any deployment,
-- production included (lib/admin.js). Keyed by email rather than user id, so a
-- grant can exist before the person first signs in.
--
-- An email alone is not proof: a password signup never shows that its owner
-- holds the address. So an account is an admin only when its email is listed
-- here AND it has a linked Google identity (Google vouched for the email; see
-- userForGoogle in lib/auth.js, which also drops any password a squatter set).
CREATE TABLE admin_emails (
  email      TEXT PRIMARY KEY,
  created_at TEXT NOT NULL
);

INSERT INTO admin_emails (email, created_at)
VALUES ('jaequery@gmail.com', to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'))
ON CONFLICT (email) DO NOTHING;
