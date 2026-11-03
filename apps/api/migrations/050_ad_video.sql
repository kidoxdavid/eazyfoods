-- Ads can carry a short video (uploaded through /uploads/video; MP4 or WebM, 25 MB at most).
ALTER TABLE ad_campaigns ADD COLUMN IF NOT EXISTS video_url text;
