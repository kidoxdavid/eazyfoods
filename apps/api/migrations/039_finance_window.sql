-- The finance team gets its own window (own sign-in, own cookie) and its own menu/notice settings.
ALTER TABLE portal_config DROP CONSTRAINT portal_config_portal_check;
ALTER TABLE portal_config ADD CONSTRAINT portal_config_portal_check CHECK (portal IN ('admin','finance','marketing','vendor','chef','driver'));
INSERT INTO portal_config(portal) VALUES ('finance') ON CONFLICT DO NOTHING;
