import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";
import { existsSync, mkdirSync, unlinkSync } from "node:fs";
import { dirname } from "node:path";
import type { ILogger } from "@xmer/consumer-shared";
import { DatabaseManager } from "./database.js";

const TEST_DB_PATH = "/tmp/test-fitgirl.db";

const mockLogger: ILogger = {
	debug: mock(() => {}),
	info: mock(() => {}),
	warn: mock(() => {}),
	error: mock(() => {}),
	child: mock(() => mockLogger),
};

describe("DatabaseManager", () => {
	let databaseManager: DatabaseManager;

	beforeEach(() => {
		// Clean up any existing test database
		if (existsSync(TEST_DB_PATH)) {
			unlinkSync(TEST_DB_PATH);
		}
		if (existsSync(`${TEST_DB_PATH}-wal`)) {
			unlinkSync(`${TEST_DB_PATH}-wal`);
		}
		if (existsSync(`${TEST_DB_PATH}-shm`)) {
			unlinkSync(`${TEST_DB_PATH}-shm`);
		}

		databaseManager = new DatabaseManager({
			path: TEST_DB_PATH,
			logger: mockLogger,
		});
	});

	afterEach(() => {
		databaseManager.close();
		if (existsSync(TEST_DB_PATH)) {
			unlinkSync(TEST_DB_PATH);
		}
		if (existsSync(`${TEST_DB_PATH}-wal`)) {
			unlinkSync(`${TEST_DB_PATH}-wal`);
		}
		if (existsSync(`${TEST_DB_PATH}-shm`)) {
			unlinkSync(`${TEST_DB_PATH}-shm`);
		}
	});

	it("should initialize database and create tables", async () => {
		// Act
		await databaseManager.initialize();
		const db = databaseManager.getDb();

		// Assert - check that tables exist
		const tables = db
			.query(
				"SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'",
			)
			.all() as Array<{ name: string }>;

		const tableNames = tables.map((t) => t.name);
		expect(tableNames).toContain("games");
		expect(tableNames).toContain("ratings");
		expect(tableNames).toContain("steam_corrections");
	});

	it("should throw error when getDb called before initialize", () => {
		// Act & Assert
		expect(() => databaseManager.getDb()).toThrow(
			"Database not initialized. Call initialize() first.",
		);
	});

	it("should close database cleanly", async () => {
		// Arrange
		await databaseManager.initialize();

		// Act
		databaseManager.close();

		// Assert - calling close again should not throw
		databaseManager.close();
	});

	it("should enable WAL mode and foreign keys", async () => {
		// Act
		await databaseManager.initialize();
		const db = databaseManager.getDb();

		// Assert
		const walResult = db.query("PRAGMA journal_mode").get() as {
			journal_mode: string;
		};
		const fkResult = db.query("PRAGMA foreign_keys").get() as {
			foreign_keys: number;
		};

		expect(walResult.journal_mode).toBe("wal");
		expect(fkResult.foreign_keys).toBe(1);
	});
});
