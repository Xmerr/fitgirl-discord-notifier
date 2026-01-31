import { Database } from "bun:sqlite";
import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";
import { existsSync, readFileSync, unlinkSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { ILogger } from "@xmer/consumer-shared";
import { RatingsRepository } from "./ratings.repository.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const TEST_DB_PATH = "/tmp/test-ratings-repo.db";

const mockLogger: ILogger = {
	debug: mock(() => {}),
	info: mock(() => {}),
	warn: mock(() => {}),
	error: mock(() => {}),
	child: mock(() => mockLogger),
};

describe("RatingsRepository", () => {
	let db: Database;
	let repository: RatingsRepository;

	beforeEach(() => {
		if (existsSync(TEST_DB_PATH)) {
			unlinkSync(TEST_DB_PATH);
		}

		db = new Database(TEST_DB_PATH, { create: true });
		db.exec("PRAGMA foreign_keys = ON");

		const schemaPath = join(__dirname, "..", "database", "schema.sql");
		const schema = readFileSync(schemaPath, "utf-8");
		db.exec(schema);

		// Insert a test game
		db.run(`
			INSERT INTO games (guid, game_name, title_raw, fitgirl_url, size_original, size_repack, pub_date)
			VALUES ('test-guid', 'Test Game', 'Test Game Raw', 'http://test.com', '10 GB', '5 GB', '2024-01-01')
		`);

		repository = new RatingsRepository({ db, logger: mockLogger });
	});

	afterEach(() => {
		db.close();
		if (existsSync(TEST_DB_PATH)) {
			unlinkSync(TEST_DB_PATH);
		}
	});

	describe("upsert", () => {
		it("should insert new rating", async () => {
			// Act
			await repository.upsert(1, "user-123", "upvote");

			// Assert
			const result = await repository.getCountsByGameId(1);
			expect(result.upvotes).toBe(1);
			expect(result.downvotes).toBe(0);
		});

		it("should update existing rating", async () => {
			// Arrange
			await repository.upsert(1, "user-123", "upvote");

			// Act
			await repository.upsert(1, "user-123", "downvote");

			// Assert
			const result = await repository.getCountsByGameId(1);
			expect(result.upvotes).toBe(0);
			expect(result.downvotes).toBe(1);
		});

		it("should allow multiple users to rate same game", async () => {
			// Act
			await repository.upsert(1, "user-1", "upvote");
			await repository.upsert(1, "user-2", "upvote");
			await repository.upsert(1, "user-3", "downvote");

			// Assert
			const result = await repository.getCountsByGameId(1);
			expect(result.upvotes).toBe(2);
			expect(result.downvotes).toBe(1);
		});
	});

	describe("getCountsByGameId", () => {
		it("should return zero counts for game with no ratings", async () => {
			// Act
			const result = await repository.getCountsByGameId(1);

			// Assert
			expect(result.upvotes).toBe(0);
			expect(result.downvotes).toBe(0);
		});

		it("should count ratings correctly", async () => {
			// Arrange
			await repository.upsert(1, "user-1", "upvote");
			await repository.upsert(1, "user-2", "upvote");
			await repository.upsert(1, "user-3", "upvote");
			await repository.upsert(1, "user-4", "downvote");

			// Act
			const result = await repository.getCountsByGameId(1);

			// Assert
			expect(result.upvotes).toBe(3);
			expect(result.downvotes).toBe(1);
		});

		it("should return zero for non-existent game", async () => {
			// Act
			const result = await repository.getCountsByGameId(999);

			// Assert
			expect(result.upvotes).toBe(0);
			expect(result.downvotes).toBe(0);
		});
	});
});
