BEGIN;
CREATE TABLE IF NOT EXISTS ingredient_details (
  ingredient_id INTEGER PRIMARY KEY REFERENCES ingredients(ingredient_id) ON DELETE CASCADE,
  category VARCHAR(30) NOT NULL, origin TEXT NOT NULL, plant BOOLEAN,
  description TEXT NOT NULL, cooking TEXT NOT NULL, aliases TEXT NOT NULL DEFAULT '', image_url TEXT
);
CREATE TABLE IF NOT EXISTS ingredient_alternatives (
  id VARCHAR(40) PRIMARY KEY, chip TEXT NOT NULL, emoji TEXT NOT NULL,
  original TEXT NOT NULL, role TEXT NOT NULL, alternatives JSONB NOT NULL,
  description TEXT NOT NULL, keywords TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS restaurant_details (
  restaurant_id INTEGER PRIMARY KEY REFERENCES restaurants(restaurant_id) ON DELETE CASCADE,
  city TEXT NOT NULL, hours TEXT, price_range TEXT, separate_kitchen BOOLEAN
);
CREATE TABLE IF NOT EXISTS restaurant_reviews (
  review_id SERIAL PRIMARY KEY,
  restaurant_id INTEGER NOT NULL REFERENCES restaurants(restaurant_id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  stars SMALLINT NOT NULL CHECK (stars BETWEEN 1 AND 5), content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS diary_nutrients (
  diary_id INTEGER PRIMARY KEY REFERENCES food_diaries(diary_id) ON DELETE CASCADE,
  serving TEXT NOT NULL DEFAULT '1 phần', protein REAL NOT NULL DEFAULT 0,
  carbs REAL NOT NULL DEFAULT 0, fat REAL NOT NULL DEFAULT 0, fiber REAL NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS profile_preferences (
  user_id INTEGER PRIMARY KEY REFERENCES users(user_id) ON DELETE CASCADE,
  calorie_goal REAL CHECK (calorie_goal > 0), goal TEXT
);
CREATE INDEX IF NOT EXISTS restaurant_reviews_place_idx ON restaurant_reviews(restaurant_id);
ALTER TABLE profile_preferences ADD COLUMN IF NOT EXISTS protein_goal REAL DEFAULT 70;
ALTER TABLE profile_preferences ADD COLUMN IF NOT EXISTS carbs_goal REAL DEFAULT 230;
ALTER TABLE profile_preferences ADD COLUMN IF NOT EXISTS fat_goal REAL DEFAULT 45;
ALTER TABLE profile_preferences ADD COLUMN IF NOT EXISTS fiber_goal REAL DEFAULT 30;
CREATE TABLE IF NOT EXISTS restaurant_menu_prices (
  restaurant_id INTEGER NOT NULL,
  recipe_id INTEGER NOT NULL,
  price INTEGER CHECK (price >= 0),
  PRIMARY KEY(restaurant_id, recipe_id),
  FOREIGN KEY(restaurant_id, recipe_id) REFERENCES restaurant_recipes(restaurant_id, recipe_id) ON DELETE CASCADE
);
COMMIT;
