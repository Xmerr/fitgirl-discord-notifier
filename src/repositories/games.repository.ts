import type { ILogger } from "@xmer/consumer-shared";
import type { Sql } from "postgres";
import { DatabaseError, DuplicateGameError } from "../errors/index.js";
import type {
	FitGirlRelease,
	GameRecord,
	GamesRepositoryOptions,
	IGamesRepository,
	SteamData,
} from "../types/index.js";

export class GamesRepository implements IGamesRepository {
	private readonly sql: Sql;
	private readonly logger: ILogger;

	constructor(options: GamesRepositoryOptions) {
		this.sql = options.sql;
		this.logger = options.logger.child({ component: "GamesRepository" });
	}

	async create(
		release: FitGirlRelease,
		channelId: string,
	): Promise<GameRecord> {
		try {
			const [result] = await this.sql<GameRecord[]>`
				INSERT INTO games (
					guid, game_name, title_raw, fitgirl_url, steam_app_id, steam_url, steam_name,
					magnet_link, size_original, size_repack, pub_date, discord_channel_id,
					steam_header_image, steam_price, steam_categories, steam_review_score,
					steam_review_desc, steam_total_positive, steam_total_negative
				) VALUES (
					${release.guid},
					${release.game_name},
					${release.title_raw},
					${release.fitgirl_url},
					${release.steam?.app_id ?? null},
					${release.steam?.steam_url ?? null},
					${release.steam?.name ?? null},
					${release.magnet_link ?? null},
					${release.size_original},
					${release.size_repack},
					${release.pub_date},
					${channelId},
					${release.steam?.media?.header_image ?? null},
					${release.steam?.price ?? null},
					${release.steam?.categories ? JSON.stringify(release.steam.categories) : null},
					${null},
					${release.steam?.ratings?.review_score_desc ?? null},
					${release.steam?.ratings?.total_positive ?? null},
					${release.steam?.ratings?.total_negative ?? null}
				)
				RETURNING *
			`;

			if (!result) {
				throw new DatabaseError("Insert returned no result", "create", {
					guid: release.guid,
				});
			}

			this.logger.debug("Game created", { guid: release.guid, id: result.id });
			return result;
		} catch (error) {
			if (
				error instanceof Error &&
				error.message.includes("duplicate key value")
			) {
				throw new DuplicateGameError(release.guid);
			}
			throw error;
		}
	}

	async findByGuid(guid: string): Promise<GameRecord | null> {
		const [result] = await this.sql<GameRecord[]>`
			SELECT * FROM games WHERE guid = ${guid}
		`;
		return result ?? null;
	}

	async findByTorrentHash(hash: string): Promise<GameRecord | null> {
		const [result] = await this.sql<GameRecord[]>`
			SELECT * FROM games WHERE torrent_hash = ${hash}
		`;
		return result ?? null;
	}

	async updateDiscordMessageId(guid: string, messageId: string): Promise<void> {
		await this.sql`
			UPDATE games
			SET discord_message_id = ${messageId}, updated_at = NOW()
			WHERE guid = ${guid}
		`;
		this.logger.debug("Discord message ID updated", { guid, messageId });
	}

	async updateTorrentHash(guid: string, hash: string): Promise<void> {
		await this.sql`
			UPDATE games
			SET torrent_hash = ${hash}, updated_at = NOW()
			WHERE guid = ${guid}
		`;
		this.logger.debug("Torrent hash updated", { guid, hash });
	}

	async updateDownloadStarted(guid: string): Promise<void> {
		await this.sql`
			UPDATE games
			SET download_started_at = NOW(), updated_at = NOW()
			WHERE guid = ${guid}
		`;
		this.logger.debug("Download started", { guid });
	}

	async updateDownloadCompleted(guid: string): Promise<void> {
		await this.sql`
			UPDATE games
			SET download_completed_at = NOW(), updated_at = NOW()
			WHERE guid = ${guid}
		`;
		this.logger.debug("Download completed", { guid });
	}

	async updateRating(
		guid: string,
		rating: "upvote" | "downvote",
	): Promise<void> {
		await this.sql`
			UPDATE games
			SET rating = ${rating}, updated_at = NOW()
			WHERE guid = ${guid}
		`;
		this.logger.debug("Rating updated", { guid, rating });
	}

	async updateSteamData(id: number, steam: SteamData | null): Promise<void> {
		if (steam) {
			await this.sql`
				UPDATE games
				SET
					steam_app_id = ${steam.app_id},
					steam_url = ${steam.steam_url},
					steam_name = ${steam.name},
					steam_header_image = ${steam.media?.header_image ?? null},
					steam_price = ${steam.price ?? null},
					steam_categories = ${steam.categories ? JSON.stringify(steam.categories) : null},
					steam_review_desc = ${steam.ratings?.review_score_desc ?? null},
					steam_total_positive = ${steam.ratings?.total_positive ?? null},
					steam_total_negative = ${steam.ratings?.total_negative ?? null},
					steam_refreshed_at = NOW(),
					updated_at = NOW()
				WHERE id = ${id}
			`;
		} else {
			await this.sql`
				UPDATE games
				SET steam_refreshed_at = NOW(), updated_at = NOW()
				WHERE id = ${id}
			`;
		}
		this.logger.debug("Steam data updated", { id, steamFound: steam !== null });
	}

	async deleteAll(): Promise<number> {
		const [{ count }] = await this.sql<[{ count: number }]>`
			SELECT COUNT(*) as count FROM games
		`;

		await this.sql`DELETE FROM games`;

		this.logger.info("All games deleted", { deletedCount: count });
		return Number(count);
	}
}
