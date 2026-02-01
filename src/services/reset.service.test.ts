import { beforeEach, describe, expect, it, mock } from "bun:test";
import type { ILogger } from "@xmer/consumer-shared";
import type { IGamesRepository, ResetMessage } from "../types/index.js";
import { ResetService } from "./reset.service.js";

describe("ResetService", () => {
	const mockLogger: ILogger = {
		debug: mock(() => {}),
		info: mock(() => {}),
		warn: mock(() => {}),
		error: mock(() => {}),
		child: mock(() => mockLogger),
	};

	let resetService: ResetService;
	let mockGamesRepository: {
		deleteAll: ReturnType<typeof mock>;
	};

	beforeEach(() => {
		mockGamesRepository = {
			deleteAll: mock(() => Promise.resolve(10)),
		};

		resetService = new ResetService({
			gamesRepository: mockGamesRepository as unknown as IGamesRepository,
			logger: mockLogger,
		});
	});

	describe("handleReset", () => {
		it("should delete all games when target is undefined", async () => {
			// Arrange
			const message: ResetMessage = {
				source: "test",
				timestamp: new Date().toISOString(),
			};

			// Act
			await resetService.handleReset(message);

			// Assert
			expect(mockGamesRepository.deleteAll).toHaveBeenCalled();
		});

		it("should delete all games when target is 'all'", async () => {
			// Arrange
			const message: ResetMessage = {
				source: "test",
				timestamp: new Date().toISOString(),
				target: "all",
			};

			// Act
			await resetService.handleReset(message);

			// Assert
			expect(mockGamesRepository.deleteAll).toHaveBeenCalled();
		});

		it("should delete all games when target is 'discord-notifier'", async () => {
			// Arrange
			const message: ResetMessage = {
				source: "test",
				timestamp: new Date().toISOString(),
				target: "discord-notifier",
			};

			// Act
			await resetService.handleReset(message);

			// Assert
			expect(mockGamesRepository.deleteAll).toHaveBeenCalled();
		});

		it("should skip when target is 'rss-reader'", async () => {
			// Arrange
			const message: ResetMessage = {
				source: "test",
				timestamp: new Date().toISOString(),
				target: "rss-reader",
			};

			// Act
			await resetService.handleReset(message);

			// Assert
			expect(mockGamesRepository.deleteAll).not.toHaveBeenCalled();
		});

		it("should log the reset operation with reason", async () => {
			// Arrange
			const message: ResetMessage = {
				source: "admin",
				timestamp: new Date().toISOString(),
				reason: "Testing reset functionality",
			};

			// Act
			await resetService.handleReset(message);

			// Assert
			expect(mockLogger.info).toHaveBeenCalled();
		});
	});
});
