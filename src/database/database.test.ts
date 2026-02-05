import { describe, expect, it, mock } from "bun:test";
import type { ILogger } from "@xmer/consumer-shared";
import { DatabaseManager } from "./database.js";

const mockLogger: ILogger = {
	debug: mock(() => {}),
	info: mock(() => {}),
	warn: mock(() => {}),
	error: mock(() => {}),
	child: mock(() => mockLogger),
};

describe("DatabaseManager", () => {
	it("should throw error when getSql called before initialize", () => {
		// Arrange
		const databaseManager = new DatabaseManager({
			connectionString: "postgres://localhost/fitgirl",
			logger: mockLogger,
		});

		// Act & Assert
		expect(() => databaseManager.getSql()).toThrow(
			"Database not initialized. Call initialize() first.",
		);
	});

	it("should create DatabaseManager instance with valid options", () => {
		// Arrange & Act
		const databaseManager = new DatabaseManager({
			connectionString: "postgres://localhost/fitgirl",
			logger: mockLogger,
		});

		// Assert
		expect(databaseManager).toBeDefined();
		expect(mockLogger.child).toHaveBeenCalled();
	});

	// Note: Tests for initialize(), getSql(), and close() require a real
	// PostgreSQL connection and are covered by integration tests.
	// Unit testing the postgres module mocking is complex with Bun's test runner.
});
