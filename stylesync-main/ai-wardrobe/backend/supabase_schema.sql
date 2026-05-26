-- Supabase schema for AI Wardrobe app

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS products (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  description text,
  image_url text,
  price numeric,
  platform text,
  affiliate_link text,
  category text,
  gender text,
  occasion text[],
  season text[],
  tags text[],
  size_chart jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS wardrobe_items (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  image_url text NOT NULL,
  category text,
  primary_color text,
  secondary_colors text[],
  occasion text[],
  season text[],
  detected_tags text[],
  uploaded_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS outfit_scores (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  image_url text,
  score integer,
  color_harmony text,
  fit_assessment text,
  occasion_suitability text,
  style_tips text[],
  overall_feedback text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS wishlist (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id uuid REFERENCES products(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, product_id)
);

CREATE TABLE IF NOT EXISTS tryon_samples (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  sample_id text UNIQUE,
  user_id text NOT NULL,
  category text,
  occasion text,
  source text DEFAULT 'website',
  body_image_url text,
  clothing_image_url text,
  body_image_path text,
  clothing_image_path text,
  tryon_image text,
  model text,
  clothing_analysis jsonb,
  recommendations jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE wardrobe_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE outfit_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE wishlist ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Users see own wardrobe" ON wardrobe_items FOR ALL USING (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "Users see own scores" ON outfit_scores FOR ALL USING (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "Users manage own wishlist" ON wishlist FOR ALL USING (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "Products are public" ON products FOR SELECT USING (true);
