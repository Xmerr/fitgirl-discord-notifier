import type { Database } from "bun:sqlite";
import type { ILogger } from "@xmer/consumer-shared";
import { DatabaseError, DuplicateGameError } from "../errors/index.js";
import type {
	FitGirlRelease,
	GameRecord,
	GamesRepositoryOptions,
	IGamesRepository,
} from "../types/index.js";

export class GamesRepository implements IGamesRepository {
	private readonly db: Database;
	private readonly logger: ILogger;

	constructor(options: GamesRepositoryOptions) {
		this.db = options.db;
		this.logger = options.logger.child({ component: "GamesRepository" });
	}

	create(release: FitGirlRelease, channelId: string): Promise<GameRecord> {
		const sql = `
			INSERT INTO games (
				guid, game_name, title_raw, fitgirl_url, steam_app_id, steam_url, steam_name,
				magnet_link, size_original, size_repack, pub_date, discord_channel_id
			) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
			RETURNING *
		`;

		try {
			const stmt = this.db.prepare(sql);
			const result = stmt.get(
				release.guid,
				release.game_name,
				release.title_raw,
				release.fitgirl_url,
				release.steam?.app_id ?? null,
				release.steam?.steam_url ?? null,
				release.steam?.name ?? null,
				release.magnet_link ?? null,
				release.size_original,
				release.size_repack,
				release.pub_date,
				channelId,
			) as GameRecord | null;

			if (!result) {
				throw new DatabaseError("Insert returned no result", "create", {
					guid: release.guid,
				});
			}

			this.logger.debug("Game created", { guid: release.guid, id: result.id });
			return Promise.resolve(result);
		} catch (error) {
			if (
				error instanceof Error &&
				error.message.includes("UNIQUE constraint failed")
			) {
				throw new DuplicateGameError(release.guid);
			}
			throw error;
		}
	}

	findByGuid(guid: string): Promise<GameRecord | null> {
		const sql = "SELECT * FROM games WHERE guid = ?";
		const stmt = this.db.prepare(sql);
		const result = stmt.get(guid) as GameRecord | null;
		return Promise.resolve(result);
	}

	findByTorrentHash(hash: string): Promise<GameRecord | null> {
		const sql = "SELECT * FROM games WHERE torrent_hash = ?";
		const stmt = this.db.prepare(sql);
		const result = stmt.get(hash) as GameRecord | null;
		return Promise.resolve(result);
	}

	updateDiscordMessageId(guid: string, messageId: string): Promise<void> {
		const sql = "UPDATE games SET discord_message_id = ? WHERE guid = ?";
		const stmt = this.db.prepare(sql);
		stmt.run(messageId, guid);
		this.logger.debug("Discord message ID updated", { guid, messageId });
		return Promise.resolve();
	}

	updateTorrentHash(guid: string, hash: string): Promise<void> {
		const sql = "UPDATE games SET torrent_hash = ? WHERE guid = ?";
		const stmt = this.db.prepare(sql);
		stmt.run(hash, guid);
		this.logger.debug("Torrent hash updated", { guid, hash });
		return Promise.resolve();
	}

	updateDownloadStarted(guid: string): Promise<void> {
		const sql =
			"UPDATE games SET download_started_at = datetime('now') WHERE guid = ?";
		const stmt = this.db.prepare(sql);
		stmt.run(guid);
		this.logger.debug("Download started", { guid });
		return Promise.resolve();
	}

	updateDownloadCompleted(guid: string): Promise<void> {
		const sql =
			"UPDATE games SET download_completed_at = datetime('now') WHERE guid = ?";
		const stmt = this.db.prepare(sql);
		stmt.run(guid);
		this.logger.debug("Download completed", { guid });
		return Promise.resolve();
	}
}
