-- Studio: seasonal/festival themes, homepage banners and layout, and per-store storefront branding.

CREATE TABLE themes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9-]+$'),
  name text NOT NULL,
  kind text NOT NULL CHECK (kind IN ('festival','season','holiday','custom')),
  emoji text NOT NULL DEFAULT '',
  motif text NOT NULL DEFAULT 'none' CHECK (motif IN ('none','confetti','snow','leaves','stars')),
  starts_on date NOT NULL,
  ends_on date NOT NULL,
  repeats_yearly boolean NOT NULL DEFAULT false,
  priority int NOT NULL DEFAULT 50,
  status text NOT NULL DEFAULT 'auto' CHECK (status IN ('auto','on','off')),  -- on = force now, auto = by date, off = never
  palette jsonb NOT NULL,
  headline text NOT NULL,
  subtitle text NOT NULL DEFAULT '',
  cta_label text NOT NULL DEFAULT '',
  cta_link text NOT NULL DEFAULT '',
  banner_text text NOT NULL DEFAULT '',
  notes text NOT NULL DEFAULT '',
  is_preset boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE home_banners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  subtitle text NOT NULL DEFAULT '',
  cta_label text NOT NULL DEFAULT '',
  cta_link text NOT NULL DEFAULT '/',
  image_url text,
  from_color text NOT NULL DEFAULT '#0b3a24',
  to_color text NOT NULL DEFAULT '#1d7a4c',
  position int NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','live')),
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE store_branding (
  store_id uuid PRIMARY KEY REFERENCES stores(id) ON DELETE CASCADE,
  accent text,
  tagline text,
  story text,
  announcement text,
  featured_slugs text[] NOT NULL DEFAULT '{}',
  website text,
  instagram text,
  facebook text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO content_blocks(key, value) VALUES
 ('home_layout', '{"sections":[{"id":"regions","enabled":true},{"id":"deals","enabled":true},{"id":"departments","enabled":true},{"id":"collections_a","enabled":true},{"id":"new","enabled":true},{"id":"collections_b","enabled":true},{"id":"stores","enabled":true},{"id":"recipes","enabled":true},{"id":"trust","enabled":true}]}')
ON CONFLICT (key) DO NOTHING;

-- Preset festival and season themes. Fixed-date festivals repeat yearly. Festivals that move (Easter, Ramadan, Eid, Diwali, Lunar New Year...)
-- carry the NEXT occurrence as a one-off window and say so in their notes: an admin must confirm/update the dates each year.
-- Seasons are OFF by default because they re-colour the whole shop for months.
INSERT INTO themes(slug,name,kind,emoji,motif,starts_on,ends_on,repeats_yearly,priority,status,palette,headline,subtitle,cta_label,cta_link,banner_text,notes,is_preset) VALUES
('christmas','Christmas','festival','🎄','snow','2026-12-01','2026-12-26',true,50,'auto','{"primary": "#9b1c2c", "deep": "#6e1220", "tint": "#fbe3e6", "glow": "#f4a0ab", "hero_from": "#7a1020", "hero_to": "#1f6b3d"}'::jsonb,'Merry Christmas from EAZyfoods','Stock the kitchen for the holidays: jollof, plantain, spices and more from local African grocers.','See this week’s deals','/deals','Merry Christmas! Order early for holiday gatherings.','Fixed date.',true),
 ('kwanzaa','Kwanzaa','festival','🕯️','stars','2026-12-26','2027-01-01',true,55,'auto','{"primary": "#1f6b3d", "deep": "#14532d", "tint": "#dcefe2", "glow": "#86d3a3", "hero_from": "#14532d", "hero_to": "#9b1c1c"}'::jsonb,'Happy Kwanzaa','Seven days of community, culture and good food.','Browse stores','/stores','Happy Kwanzaa, 26 Dec to 1 Jan.','Fixed date.',true),
 ('kenya-jamhuri','Jamhuri Day (Kenya)','festival','🇰🇪','confetti','2026-12-09','2026-12-12',true,70,'auto','{"primary": "#166534", "deep": "#0f4a26", "tint": "#dcefe2", "glow": "#86d3a3", "hero_from": "#111111", "hero_to": "#a3141d"}'::jsonb,'Happy Jamhuri Day, Kenya','Celebrate with the flavours of East Africa.','Shop East Africa','/search?region=east-africa','Happy Jamhuri Day, Kenya!','Fixed date, 12 December.',true),
 ('lunar-new-year','Lunar New Year','festival','🧧','confetti','2027-01-30','2027-02-08',false,60,'auto','{"primary": "#b01c1c", "deep": "#7d1010", "tint": "#fbe0dc", "glow": "#f4a09a", "hero_from": "#8f1010", "hero_to": "#b86a00"}'::jsonb,'Happy Lunar New Year','Wishing you a year of good health and good food.','Browse stores','/stores','Happy Lunar New Year!','MOVES EACH YEAR. 2027 date: 6 February. Check and update yearly.',true),
 ('black-history-month','Black History Month','festival','✊🏿','stars','2027-02-01','2027-02-28',true,40,'auto','{"primary": "#7a3e12", "deep": "#552a0c", "tint": "#f6e6d6", "glow": "#e8b080", "hero_from": "#3b1f0a", "hero_to": "#9c5a1a"}'::jsonb,'Celebrating Black History Month','Support Black-owned and African-owned grocers in your community.','Browse stores','/stores','Black History Month: shop African-owned stores.','Fixed dates (February in Canada).',true),
 ('ramadan','Ramadan','festival','🌙','stars','2027-02-07','2027-03-08',false,60,'auto','{"primary": "#0f5a6b", "deep": "#0a3f4d", "tint": "#d9eef0", "glow": "#7fd0d6", "hero_from": "#0b2e45", "hero_to": "#1b6f6b"}'::jsonb,'Ramadan Kareem','Dates, grains, spices and everything for suhoor and iftar.','Browse stores','/stores','Ramadan Kareem from EAZyfoods.','MOVES EACH YEAR and depends on moon sighting. 2027 expected start: about 8 February. Check and update.',true),
 ('ghana-independence','Independence Day (Ghana)','festival','🇬🇭','confetti','2027-03-03','2027-03-06',true,70,'auto','{"primary": "#006b3f", "deep": "#004d2d", "tint": "#d6efe3", "glow": "#7fd9ae", "hero_from": "#9a1220", "hero_to": "#006b3f"}'::jsonb,'Happy Independence Day, Ghana','Celebrate with kenkey, shito, gari and more.','Shop West Africa','/search?region=west-africa','Happy Independence Day, Ghana!','Fixed date, 6 March.',true),
 ('eid-al-fitr','Eid al-Fitr','festival','🕌','stars','2027-03-08','2027-03-12',false,65,'auto','{"primary": "#0b6b4d", "deep": "#07503a", "tint": "#d7f0e6", "glow": "#7fdcb5", "hero_from": "#0a4d3a", "hero_to": "#9a6a05"}'::jsonb,'Eid Mubarak','Celebrate with family and a table full of favourites.','Browse stores','/stores','Eid Mubarak from EAZyfoods.','MOVES EACH YEAR. 2027 expected: about 10 March. Check and update.',true),
 ('easter','Easter','festival','🐣','confetti','2027-03-22','2027-03-29',false,50,'auto','{"primary": "#5b3f9a", "deep": "#402a74", "tint": "#ece6f8", "glow": "#c3b0f0", "hero_from": "#4b3385", "hero_to": "#a0479a"}'::jsonb,'Happy Easter','Gather the family and cook something special.','See recipes','/recipes','Happy Easter!','MOVES EACH YEAR. 2027 Easter Sunday: 28 March (Good Friday 26 March). Check and update.',true),
 ('south-africa-freedom-day','Freedom Day (South Africa)','festival','🇿🇦','confetti','2027-04-24','2027-04-27',true,70,'auto','{"primary": "#0d6e55", "deep": "#08503e", "tint": "#d6efe7", "glow": "#7fddc0", "hero_from": "#0d4d8f", "hero_to": "#0d6e55"}'::jsonb,'Happy Freedom Day, South Africa','Braai-ready favourites, mielie meal and more.','Shop Southern Africa','/search?region=southern-africa','Happy Freedom Day, South Africa!','Fixed date, 27 April.',true),
 ('mothers-day','Mother’s Day','festival','💐','confetti','2027-05-03','2027-05-09',false,50,'auto','{"primary": "#a8326a", "deep": "#7a2250", "tint": "#fbe3ef", "glow": "#f2a0c8", "hero_from": "#8a2459", "hero_to": "#c0457e"}'::jsonb,'Happy Mother’s Day','Cook her favourite, or let someone else do it.','See recipes','/recipes','Happy Mother’s Day!','MOVES EACH YEAR (second Sunday of May in Canada; 2027: 9 May). Check and update.',true),
 ('eid-al-adha','Eid al-Adha','festival','🕌','stars','2027-05-14','2027-05-19',false,65,'auto','{"primary": "#0b5d4b", "deep": "#074437", "tint": "#d5eee8", "glow": "#86dcc4", "hero_from": "#073f33", "hero_to": "#8a5a00"}'::jsonb,'Eid Mubarak','Everything for the feast, from the stores you trust.','Browse stores','/stores','Eid al-Adha Mubarak from EAZyfoods.','MOVES EACH YEAR. 2027 expected: about 16 to 17 May. Check and update.',true),
 ('africa-day','Africa Day','festival','🌍','confetti','2027-05-22','2027-05-25',true,70,'auto','{"primary": "#1f6b3d", "deep": "#14532d", "tint": "#dcefe2", "glow": "#86d3a3", "hero_from": "#9a1220", "hero_to": "#a87405"}'::jsonb,'Happy Africa Day','Taste the whole continent, from every region.','Shop by region','/search','Happy Africa Day, 25 May!','Fixed date, 25 May.',true),
 ('canada-day','Canada Day','festival','🍁','confetti','2027-06-27','2027-07-01',true,50,'auto','{"primary": "#c8102e", "deep": "#8f0b20", "tint": "#fbe0e4", "glow": "#f59aa8", "hero_from": "#a50d26", "hero_to": "#d71f3a"}'::jsonb,'Happy Canada Day','Barbecue season: stock up on spices and sauces.','Shop spices','/search?q=spice','Happy Canada Day!','Fixed date, 1 July.',true),
 ('nigeria-independence','Independence Day (Nigeria)','festival','🇳🇬','confetti','2026-09-27','2026-10-01',true,70,'auto','{"primary": "#0b6b3a", "deep": "#08502b", "tint": "#d6f0e1", "glow": "#7fdc9f", "hero_from": "#08502b", "hero_to": "#138a4b"}'::jsonb,'Happy Independence Day, Nigeria','Jollof, suya spice, egusi and more.','Shop West Africa','/search?region=west-africa','Happy Independence Day, Nigeria!','Fixed date, 1 October.',true),
 ('thanksgiving','Thanksgiving (Canada)','festival','🍂','leaves','2027-10-04','2027-10-11',false,50,'auto','{"primary": "#8a4b0d", "deep": "#5f3208", "tint": "#fbead2", "glow": "#f0b772", "hero_from": "#6b3a0a", "hero_to": "#b8700f"}'::jsonb,'Happy Thanksgiving','Bring something special to the table.','See recipes','/recipes','Happy Thanksgiving!','MOVES EACH YEAR (second Monday of October; 2027: 11 October). Check and update.',true),
 ('halloween','Halloween','festival','🎃','confetti','2026-10-24','2026-10-31',true,45,'auto','{"primary": "#ab4f09", "deep": "#7c3a05", "tint": "#fde9d3", "glow": "#ffb066", "hero_from": "#2b1055", "hero_to": "#b45309"}'::jsonb,'Happy Halloween','Sweet and savoury snacks for the night.','Shop snacks','/search?category=snacks-drinks','Happy Halloween!','Fixed date.',true),
 ('diwali','Diwali','festival','🪔','stars','2026-11-01','2026-11-10',false,60,'auto','{"primary": "#a14a00", "deep": "#6b2f00", "tint": "#fde8cf", "glow": "#ffb866", "hero_from": "#7a1d5a", "hero_to": "#b8500a"}'::jsonb,'Happy Diwali','Light, sweets and spice for the festival of lights.','Shop spices','/search?q=spice','Happy Diwali from EAZyfoods.','MOVES EACH YEAR. 2026: 8 November. Check and update.',true),
 ('black-friday','Black Friday','holiday','🏷️','none','2026-11-20','2026-11-30',false,45,'auto','{"primary": "#222222", "deep": "#000000", "tint": "#ececec", "glow": "#ff8a80", "hero_from": "#111111", "hero_to": "#b3141b"}'::jsonb,'Black Friday deals','Live promotions from local stores, priced as you pay.','See live deals','/deals','Black Friday: see this week’s live deals.','MOVES EACH YEAR (day after US Thanksgiving; 2026: 27 November). Only run it if stores have real promotions.',true),
 ('spring','Spring fresh','season','🌱','leaves','2027-03-20','2027-06-20',true,10,'off','{"primary": "#2f7a2a", "deep": "#1f5a1c", "tint": "#e1f2de", "glow": "#9ddf94", "hero_from": "#1f6b2c", "hero_to": "#5f8a12"}'::jsonb,'Spring is here','Fresh produce and lighter cooking.','Shop fresh produce','/search?category=fresh-produce','Fresh for spring.','Seasons are OFF by default. Turn on to re-colour the site for the whole season.',true),
 ('summer','Summer grill','season','☀️','none','2027-06-21','2027-09-21',true,10,'off','{"primary": "#0e6ba8", "deep": "#0a4d7a", "tint": "#d9ecf8", "glow": "#8cc8f0", "hero_from": "#0a4d7a", "hero_to": "#0e8bb8"}'::jsonb,'Summer on the grill','Marinades, spices and cold drinks.','Shop spices and sauces','/search?category=spices-seasonings-sauces','Summer cooking season.','Seasons are OFF by default.',true),
 ('autumn','Autumn harvest','season','🍁','leaves','2026-09-22','2026-12-20',true,10,'off','{"primary": "#8c3b0f", "deep": "#62290a", "tint": "#fae3d3", "glow": "#f0a57a", "hero_from": "#6b2d08", "hero_to": "#b5651d"}'::jsonb,'Autumn comfort food','Soups, stews and warming spices.','See recipes','/recipes','Autumn comfort cooking.','Seasons are OFF by default.',true),
 ('winter','Winter warmers','season','❄️','snow','2026-12-21','2027-03-19',true,10,'off','{"primary": "#2b4f8c", "deep": "#1d3a6b", "tint": "#dfe8f6", "glow": "#9bbcf0", "hero_from": "#1d3a6b", "hero_to": "#4a6fb0"}'::jsonb,'Winter warmers','Hearty stews and soups for cold Calgary days.','See recipes','/recipes','Winter comfort cooking.','Seasons are OFF by default.',true);
