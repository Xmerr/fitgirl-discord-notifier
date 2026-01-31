import { describe, expect, it, mock } from "bun:test";
import type { IDlqHandler, ILogger } from "@xmer/consumer-shared";
import { NonRetryableError } from "@xmer/consumer-shared";
import type { Channel } from "amqplib";
import type { IDownloadProgressService } from "../types/index.js";
import { DownloadProgressConsumer } from "./download-progress.consumer.js";

const mockLogger: ILogger = {
	debug: mock(() => {}),
	info: mock(() => {}),
	warn: mock(() => {}),
	error: mock(() => {}),
	child: mock(() => mockLogger),
};

describe("DownloadProgressConsumer", () => {
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
				handleProgress: mock(() => Promise.resolve()),
			};

			return new DownloadProgressConsumer({
				channel: mockChannel as unknown as Channel,
				exchange: "qbittorrent",
				queue: "qbittorrent.downloads.progress.fitgirl",
				routingKey: "downloads.progress",
				dlqHandler: mockDlqHandler as unknown as IDlqHandler,
				logger: mockLogger,
				downloadProgressService:
					mockService as unknown as IDownloadProgressService,
			});
		};

		it("should validate hash field", () => {
			// Arrange
			const consumer = createConsumer();
			const content = {
				name: "Test Game",
				progress: 0.5,
				category: "games",
			};

			// Act & Assert
			// @ts-expect-error - accessing private method for testing
			expect(() => consumer.validateMessage(content)).toThrow(
				NonRetryableError,
			);
		});

		it("should validate progress field", () => {
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

		it("should accept valid progress message", () => {
			// Arrange
			const consumer = createConsumer();
			const content = {
				hash: "abc123",
				name: "Test Game",
				progress: 0.5,
				download_speed: 1048576,
				eta: 3600,
				state: "downloading",
				category: "games",
			};

			// Act & Assert
			// @ts-expect-error - accessing private method for testing
			const result = consumer.validateMessage(content);
			expect(result.hash).toBe("abc123");
		});
	});
});
