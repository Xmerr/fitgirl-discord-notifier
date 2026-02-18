import { describe, expect, it, mock } from "bun:test";
import { NonRetryableError } from "@xmer/consumer-shared";
import type { IDlqHandler, ILogger } from "@xmer/consumer-shared";
import type { Channel } from "amqplib";
import type { ISteamEnrichedService } from "../types/index.js";
import { SteamEnrichedConsumer } from "./steam-enriched.consumer.js";

const mockLogger: ILogger = {
	debug: mock(() => {}),
	info: mock(() => {}),
	warn: mock(() => {}),
	error: mock(() => {}),
	child: mock(() => mockLogger),
};

describe("SteamEnrichedConsumer", () => {
	describe("validation", () => {
		const createConsumer = () => {
			const mockChannel = {
				prefetch: mock(() => Promise.resolve()),
				assertExchange: mock(() => Promise.resolve({ exchange: "fitgirl" })),
				assertQueue: mock(() => Promise.resolve({ queue: "test" })),
				bindQueue: mock(() => Promise.resolve({})),
				consume: mock(() => Promise.resolve({ consumerTag: "test-tag" })),
				ack: mock(() => {}),
				nack: mock(() => {}),
				cancel: mock(() => Promise.resolve({})),
			};

			const mockDlqHandler = {
				setup: mock(() => Promise.resolve()),
				handleRetryableError: mock(() => Promise.resolve()),
				handleNonRetryableError: mock(() => Promise.resolve()),
			};

			const mockService = {
				handleEnriched: mock(() => Promise.resolve()),
			};

			return {
				consumer: new SteamEnrichedConsumer({
					channel: mockChannel as unknown as Channel,
					exchange: "fitgirl",
					queue: "fitgirl.steam.enriched.discord-notifier",
					routingKey: "steam.enriched",
					dlqHandler: mockDlqHandler as unknown as IDlqHandler,
					logger: mockLogger,
					steamEnrichedService: mockService as unknown as ISteamEnrichedService,
				}),
				mockService,
			};
		};

		it("should throw NonRetryableError for missing gameId", () => {
			// Arrange
			const { consumer } = createConsumer();
			const content = {
				timestamp: "2024-01-01T00:00:00Z",
				steam: null,
			};

			// Act & Assert
			// @ts-expect-error - accessing private method for testing
			expect(() => consumer.validateMessage(content)).toThrow(
				NonRetryableError,
			);
		});

		it("should throw NonRetryableError for non-number gameId", () => {
			// Arrange
			const { consumer } = createConsumer();
			const content = {
				gameId: "not-a-number",
				timestamp: "2024-01-01T00:00:00Z",
				steam: null,
			};

			// Act & Assert
			// @ts-expect-error - accessing private method for testing
			expect(() => consumer.validateMessage(content)).toThrow(
				NonRetryableError,
			);
		});

		it("should throw NonRetryableError for missing timestamp", () => {
			// Arrange
			const { consumer } = createConsumer();
			const content = {
				gameId: 42,
				steam: null,
			};

			// Act & Assert
			// @ts-expect-error - accessing private method for testing
			expect(() => consumer.validateMessage(content)).toThrow(
				NonRetryableError,
			);
		});

		it("should throw NonRetryableError for empty timestamp", () => {
			// Arrange
			const { consumer } = createConsumer();
			const content = {
				gameId: 42,
				timestamp: "",
				steam: null,
			};

			// Act & Assert
			// @ts-expect-error - accessing private method for testing
			expect(() => consumer.validateMessage(content)).toThrow(
				NonRetryableError,
			);
		});

		it("should accept valid message with steam data", () => {
			// Arrange
			const { consumer } = createConsumer();
			const content = {
				gameId: 42,
				timestamp: "2024-01-01T00:00:00Z",
				steam: { app_id: 12345, name: "Test Game" },
			};

			// Act
			// @ts-expect-error - accessing private method for testing
			const result = consumer.validateMessage(content);

			// Assert
			expect(result.gameId).toBe(42);
			expect(result.timestamp).toBe("2024-01-01T00:00:00Z");
		});

		it("should accept valid message with null steam", () => {
			// Arrange
			const { consumer } = createConsumer();
			const content = {
				gameId: 42,
				timestamp: "2024-01-01T00:00:00Z",
				steam: null,
			};

			// Act
			// @ts-expect-error - accessing private method for testing
			const result = consumer.validateMessage(content);

			// Assert
			expect(result.gameId).toBe(42);
			expect(result.steam).toBeNull();
		});
	});
});
