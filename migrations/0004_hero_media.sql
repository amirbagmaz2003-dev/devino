-- Home hero editable from the admin panel (brief 03, §3). NULL = the
-- built-in /photos/hero-editorial-bw.jpg. Deleting the media clears it.
ALTER TABLE site_settings ADD COLUMN hero_media_id TEXT REFERENCES media(id) ON DELETE SET NULL;
