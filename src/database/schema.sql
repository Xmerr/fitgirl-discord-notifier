-- Games table - stores all game releases
CREATE TABLE IF NOT EXISTS games (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guid TEXT NOT NULL UNIQUE,
    game_name TEXT NOT NULL,
    title_raw TEXT NOT NULL,
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
    download_started_at TEXT,
    download_completed_at TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Index for torrent hash lookups (download progress/complete)
CREATE INDEX IF NOT EXISTS idx_games_torrent_hash ON games(torrent_hash);

-- Index for Discord message lookups
CREATE INDEX IF NOT EXISTS idx_games_discord_message_id ON games(discord_message_id);

-- Ratings table - one rating per user per game
CREATE TABLE IF NOT EXISTS ratings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    game_id INTEGER NOT NULL,
    user_id TEXT NOT NULL,
    rating TEXT NOT NULL CHECK (rating IN ('upvote', 'downvote')),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE,
    UNIQUE(game_id, user_id)
);

-- Index for rating counts by game
CREATE INDEX IF NOT EXISTS idx_ratings_game_id ON ratings(game_id);

-- Steam corrections table - stores user-submitted URL corrections
CREATE TABLE IF NOT EXISTS steam_corrections (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    game_id INTEGER NOT NULL,
    user_id TEXT NOT NULL,
    original_steam_url TEXT,
    corrected_steam_url TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE
);

-- Index for corrections by game
CREATE INDEX IF NOT EXISTS idx_steam_corrections_game_id ON steam_corrections(game_id);
