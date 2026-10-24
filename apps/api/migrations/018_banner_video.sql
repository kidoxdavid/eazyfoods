-- A homepage banner can play a short muted video behind its text; the banner picture is the poster and the fallback.
ALTER TABLE home_banners ADD COLUMN video_url text;
