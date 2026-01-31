import type { Database } from "bun:sqlite";
import type { ILogger } from "@xmer/consumer-shared";
import type {
	CorrectionsRepositoryOptions,
	ICorrectionsRepository,
} from "../types/index.js";

export class CorrectionsRepository implements ICorrectionsRepository {
	private readonly db: Database;
	private readonly logger: ILogger;

	constructor(options: CorrectionsRepositoryOptions) {
		this.db = options.db;
		this.logger = options.logger.child({ component: "CorrectionsRepository" });
	}

	create(
		gameId: number,
		userId: string,
		originalUrl: string | null,
		correctedUrl: string,
	): Promise<void> {
		const sql = `
			INSERT INTO steam_corrections (game_id, user_id, original_steam_url, corrected_steam_url)
			VALUES (?, ?, ?, ?)
		`;

		const stmt = this.db.prepare(sql);
		stmt.run(gameId, userId, originalUrl, correctedUrl);
		this.logger.debug("Steam correction created", {
			gameId,
			userId,
			correctedUrl,
		});
		return Promise.resolve();
	}
}
