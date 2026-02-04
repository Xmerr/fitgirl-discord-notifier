-- Migration: Add Steam enrichment columns and rating to games table
-- This migration adds support for the FitGirl dashboard plugin

-- Add corrected_name column for user-editable name corrections
ALTER TABLE games ADD COLUMN corrected_name TEXT;

-- Add updated_at timestamp
ALTER TABLE games ADD COLUMN updated_at TEXT DEFAULT (datetime('now'));

-- Add Steam enrichment data columns
ALTER TABLE games ADD COLUMN steam_header_image TEXT;
ALTER TABLE games ADD COLUMN steam_price TEXT;
ALTER TABLE games ADD COLUMN steam_categories TEXT;
ALTER TABLE games ADD COLUMN steam_review_score TEXT;
ALTER TABLE games ADD COLUMN steam_review_desc TEXT;
ALTER TABLE games ADD COLUMN steam_total_positive INTEGER;
ALTER TABLE games ADD COLUMN steam_total_negative INTEGER;

-- Add single rating column per game
ALTER TABLE games ADD COLUMN rating TEXT CHECK (rating IN ('upvote', 'downvote'));

-- Add index for pub_date sorting
CREATE INDEX IF NOT EXISTS idx_games_pub_date ON games(pub_date DESC);
