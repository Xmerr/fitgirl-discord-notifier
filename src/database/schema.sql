-- Games table - stores all game releases
CREATE TABLE IF NOT EXISTS games (
    id SERIAL PRIMARY KEY,
    guid TEXT NOT NULL UNIQUE,
    game_name TEXT NOT NULL,
    title_raw TEXT NOT NULL,
    corrected_name TEXT,
    fitgirl_url TEXT NOT NULL,
    steam_app_id INTEGER,
    steam_url TEXT,
    steam_name TEXT,
    magnet_link TEXT,
    torrent_hash TEXT,
    discord_message_id TEXT,
    discord_channel_id TEXT,
    size_original TEXT NOT NULL,
    size_repack TEXT NOT NULL,
    pub_date TEXT NOT NULL,
    download_started_at TIMESTAMP,
    download_completed_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    -- Steam enrichment data
    steam_header_image TEXT,
    steam_price TEXT,
    steam_categories TEXT,
    steam_review_score TEXT,
    steam_review_desc TEXT,
    steam_total_positive INTEGER,
    steam_total_negative INTEGER,
    -- Single rating per game
    rating TEXT CHECK (rating IN ('upvote', 'downvote'))
);

-- Index for torrent hash lookups (download progress/complete)
CREATE INDEX IF NOT EXISTS idx_games_torrent_hash ON games(torrent_hash);

-- Index for Discord message lookups
CREATE INDEX IF NOT EXISTS idx_games_discord_message_id ON games(discord_message_id);

-- Index for pub_date sorting (games list queries)
CREATE INDEX IF NOT EXISTS idx_games_pub_date ON games(pub_date DESC)
