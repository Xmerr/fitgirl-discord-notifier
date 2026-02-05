import { beforeEach, describe, expect, it, mock } from "bun:test";
import type { ILogger } from "@xmer/consumer-shared";
import { DatabaseManager } from "./database.js";

const mockLogger: ILogger = {
	debug: mock(() => {}),
	info: mock(() => {}),
	warn: mock(() => {}),
	error: mock(() => {}),
	child: mock(() => mockLogger),
};

// Mock the postgres module
const mockSqlEnd = mock(() => Promise.resolve());
const mockSqlUnsafe = mock(() => Promise.resolve());
const mockSqlQuery = mock(() => Promise.resolve([{ result: 1 }]));

// Create a mock sql function that acts as both a template tag and an object with methods
const createMockSql = () => {
	const sqlFn = Object.assign(
		mock((_strings: TemplateStringsArray, ..._values: unknown[]) =>
			Promise.resolve([{ result: 1 }]),
		),
		{
			end: mockSqlEnd,
			unsafe: mockSqlUnsafe,
		},
	);
	return sqlFn;
};

let mockSql: ReturnType<typeof createMockSql>;

// Mock the postgres module
mock.module("postgres", () => ({
	default: () => {
		mockSql = createMockSql();
		return mockSql;
	},
}));

describe("DatabaseManager", () => {
	let databaseManager: DatabaseManager;

	beforeEach(() => {
		mockSqlEnd.mockClear();
		mockSqlUnsafe.mockClear();
		databaseManager = new DatabaseManager({
			connectionString: "postgres://localhost/fitgirl",
			logger: mockLogger,
		});
	});

	it("should initialize database and create tables", async () => {
		// Act
		await databaseManager.initialize();
		const sql = databaseManager.getSql();

		// Assert
		expect(sql).toBeDefined();
		expect(mockSqlUnsafe).toHaveBeenCalled();
	});

	it("should throw error when getSql called before initialize", () => {
		// Act & Assert
		expect(() => databaseManager.getSql()).toThrow(
			"Database not initialized. Call initialize() first.",
		);
	});

	it("should close database cleanly", async () => {
		// Arrange
		await databaseManager.initialize();

		// Act
		await databaseManager.close();

		// Assert
		expect(mockSqlEnd).toHaveBeenCalled();
	});

	it("should handle multiple close calls gracefully", async () => {
		// Arrange
		await databaseManager.initialize();

		// Act - calling close twice should not throw
		await databaseManager.close();
		await databaseManager.close();

		// Assert - end should only be called once (since sql is nulled after first close)
		expect(mockSqlEnd).toHaveBeenCalledTimes(1);
	});
});
