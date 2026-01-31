import { describe, expect, it, mock } from "bun:test";
import type { IDlqHandler, ILogger } from "@xmer/consumer-shared";
import { NonRetryableError } from "@xmer/consumer-shared";
import type { Channel } from "amqplib";
import type { IDownloadCompleteService } from "../types/index.js";
import { DownloadCompleteConsumer } from "./download-complete.consumer.js";

const mockLogger: ILogger = {
	debug: mock(() => {}),
	info: mock(() => {}),
	warn: mock(() => {}),
	error: mock(() => {}),
	child: mock(() => mockLogger),
};

describe("DownloadCompleteConsumer", () => {
	describe("validation", () => {
		const createConsumer = () => {
			const mockChannel = {
				prefetch: mock(() => Promise.resolve()),
				assertExchange: mock(() =>
					Promise.resolve({ exchange: "qbittorrent" }),
				),
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
				handleComplete: mock(() => Promise.resolve()),
			};

			return new DownloadCompleteConsumer({
				channel: mockChannel as unknown as Channel,
				exchange: "qbittorrent",
				queue: "qbittorrent.downloads.complete.fitgirl",
				routingKey: "downloads.complete",
				dlqHandler: mockDlqHandler as unknown as IDlqHandler,
				logger: mockLogger,
				downloadCompleteService:
					mockService as unknown as IDownloadCompleteService,
			});
		};

		it("should validate hash field", () => {
			// Arrange
			const consumer = createConsumer();
			const content = {
				name: "Test Game",
				save_path: "/downloads/games",
				category: "games",
			};

			// Act & Assert
			// @ts-expect-error - accessing private method for testing
			expect(() => consumer.validateMessage(content)).toThrow(
				NonRetryableError,
			);
		});

		it("should validate save_path field", () => {
			// Arrange
			const consumer = createConsumer();
			const content = {
				hash: "abc123",
				name: "Test Game",
				category: "games",
			};

			// Act & Assert
			// @ts-expect-error - accessing private method for testing
			expect(() => consumer.validateMessage(content)).toThrow(
				NonRetryableError,
			);
		});

		it("should accept valid complete message", () => {
			// Arrange
			const consumer = createConsumer();
			const content = {
				hash: "abc123",
				name: "Test Game",
				save_path: "/downloads/games",
				total_size: 23622320128,
				category: "games",
			};

			// Act & Assert
			// @ts-expect-error - accessing private method for testing
			const result = consumer.validateMessage(content);
			expect(result.hash).toBe("abc123");
		});
	});
});
