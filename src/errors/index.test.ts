import { describe, expect, it } from "bun:test";
import {
	DatabaseError,
	DuplicateGameError,
	GameNotFoundError,
	InvalidSteamUrlError,
} from "./index.js";

describe("GameNotFoundError", () => {
	it("should create error with default message", () => {
		// Arrange & Act
		const error = new GameNotFoundError("test-guid");

		// Assert
		expect(error.message).toBe("Game not found: test-guid");
		expect(error.guid).toBe("test-guid");
		expect(error.name).toBe("GameNotFoundError");
	});

	it("should create error with custom message", () => {
		// Arrange & Act
		const error = new GameNotFoundError("test-guid", "Custom message");

		// Assert
		expect(error.message).toBe("Custom message");
		expect(error.guid).toBe("test-guid");
	});
});

describe("InvalidSteamUrlError", () => {
	it("should create error with default message", () => {
		// Arrange & Act
		const error = new InvalidSteamUrlError("http://invalid.url");

		// Assert
		expect(error.message).toBe("Invalid Steam URL: http://invalid.url");
		expect(error.url).toBe("http://invalid.url");
		expect(error.name).toBe("InvalidSteamUrlError");
	});

	it("should create error with custom message", () => {
		// Arrange & Act
		const error = new InvalidSteamUrlError(
			"http://invalid.url",
			"Custom message",
		);

		// Assert
		expect(error.message).toBe("Custom message");
		expect(error.url).toBe("http://invalid.url");
	});
});

describe("DatabaseError", () => {
	it("should create error with message and operation", () => {
		// Arrange & Act
		const error = new DatabaseError("Query failed", "insert");

		// Assert
		expect(error.message).toBe("Query failed");
		expect(error.operation).toBe("insert");
		expect(error.context).toBeUndefined();
		expect(error.name).toBe("DatabaseError");
	});

	it("should create error with context", () => {
		// Arrange & Act
		const error = new DatabaseError("Query failed", "insert", {
			table: "games",
		});

		// Assert
		expect(error.message).toBe("Query failed");
		expect(error.operation).toBe("insert");
		expect(error.context).toEqual({ table: "games" });
	});
});

describe("DuplicateGameError", () => {
	it("should create error with default message", () => {
		// Arrange & Act
		const error = new DuplicateGameError("test-guid");

		// Assert
		expect(error.message).toBe("Game already exists: test-guid");
		expect(error.guid).toBe("test-guid");
		expect(error.name).toBe("DuplicateGameError");
	});

	it("should create error with custom message", () => {
		// Arrange & Act
		const error = new DuplicateGameError("test-guid", "Custom message");

		// Assert
		expect(error.message).toBe("Custom message");
		expect(error.guid).toBe("test-guid");
	});
});
