import { Database } from "bun:sqlite";
import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";
import { existsSync, readFileSync, unlinkSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { ILogger } from "@xmer/consumer-shared";
import { CorrectionsRepository } from "./corrections.repository.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const TEST_DB_PATH = "/tmp/test-corrections-repo.db";

const mockLogger: ILogger = {
	debug: mock(() => {}),
	info: mock(() => {}),
	warn: mock(() => {}),
	error: mock(() => {}),
	child: mock(() => mockLogger),
};

describe("CorrectionsRepository", () => {
	let db: Database;
	let repository: CorrectionsRepository;

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

		repository = new CorrectionsRepository({ db, logger: mockLogger });
	});

	afterEach(() => {
		db.close();
		if (existsSync(TEST_DB_PATH)) {
			unlinkSync(TEST_DB_PATH);
		}
	});

	describe("create", () => {
		it("should create correction with original url", async () => {
			// Act
			await repository.create(
				1,
				"user-123",
				"https://store.steampowered.com/app/111",
				"https://store.steampowered.com/app/222",
			);

			// Assert
			const result = db
				.query("SELECT * FROM steam_corrections WHERE game_id = 1")
				.get() as Record<string, unknown>;
			expect(result.user_id).toBe("user-123");
			expect(result.original_steam_url).toBe(
				"https://store.steampowered.com/app/111",
			);
			expect(result.corrected_steam_url).toBe(
				"https://store.steampowered.com/app/222",
			);
		});

		it("should create correction without original url", async () => {
			// Act
			await repository.create(
				1,
				"user-123",
				null,
				"https://store.steampowered.com/app/222",
			);

			// Assert
			const result = db
				.query("SELECT * FROM steam_corrections WHERE game_id = 1")
				.get() as Record<string, unknown>;
			expect(result.original_steam_url).toBeNull();
			expect(result.corrected_steam_url).toBe(
				"https://store.steampowered.com/app/222",
			);
		});

		it("should allow multiple corrections for same game", async () => {
			// Act
			await repository.create(1, "user-1", null, "https://steam.com/app/1");
			await repository.create(1, "user-2", null, "https://steam.com/app/2");

			// Assert
			const results = db
				.query("SELECT * FROM steam_corrections WHERE game_id = 1")
				.all();
			expect(results.length).toBe(2);
		});
	});
});
