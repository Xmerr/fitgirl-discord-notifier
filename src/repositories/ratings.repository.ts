import type { Database } from "bun:sqlite";
import type { ILogger } from "@xmer/consumer-shared";
import type {
	IRatingsRepository,
	RatingsRepositoryOptions,
} from "../types/index.js";

export class RatingsRepository implements IRatingsRepository {
	private readonly db: Database;
	private readonly logger: ILogger;

	constructor(options: RatingsRepositoryOptions) {
		this.db = options.db;
		this.logger = options.logger.child({ component: "RatingsRepository" });
	}

	upsert(
		gameId: number,
		userId: string,
		rating: "upvote" | "downvote",
	): Promise<void> {
		const sql = `
			INSERT INTO ratings (game_id, user_id, rating)
			VALUES (?, ?, ?)
			ON CONFLICT(game_id, user_id) DO UPDATE SET
				rating = excluded.rating,
				updated_at = datetime('now')
		`;

		const stmt = this.db.prepare(sql);
		stmt.run(gameId, userId, rating);
		this.logger.debug("Rating upserted", { gameId, userId, rating });
		return Promise.resolve();
	}

	getCountsByGameId(
		gameId: number,
	): Promise<{ upvotes: number; downvotes: number }> {
		const sql = `
			SELECT
				SUM(CASE WHEN rating = 'upvote' THEN 1 ELSE 0 END) as upvotes,
				SUM(CASE WHEN rating = 'downvote' THEN 1 ELSE 0 END) as downvotes
			FROM ratings
			WHERE game_id = ?
		`;

		const stmt = this.db.prepare(sql);
		const result = stmt.get(gameId) as {
			upvotes: number | null;
			downvotes: number | null;
		} | null;

		return Promise.resolve({
			upvotes: result?.upvotes ?? 0,
			downvotes: result?.downvotes ?? 0,
		});
	}
}
