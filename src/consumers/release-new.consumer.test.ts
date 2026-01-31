import { describe, expect, it, mock } from "bun:test";
import { NonRetryableError } from "@xmer/consumer-shared";
import type { IDlqHandler, ILogger } from "@xmer/consumer-shared";
import type { Channel } from "amqplib";
import type { IReleaseNewService } from "../types/index.js";
import { ReleaseNewConsumer } from "./release-new.consumer.js";

const mockLogger: ILogger = {
	debug: mock(() => {}),
	info: mock(() => {}),
	warn: mock(() => {}),
	error: mock(() => {}),
	child: mock(() => mockLogger),
};

describe("ReleaseNewConsumer", () => {
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
				processRelease: mock(() => Promise.resolve()),
			};

			return new ReleaseNewConsumer({
				channel: mockChannel as unknown as Channel,
				exchange: "fitgirl",
				queue: "fitgirl.release.new.discord-notifier",
				routingKey: "release.new",
				dlqHandler: mockDlqHandler as unknown as IDlqHandler,
				logger: mockLogger,
				releaseNewService: mockService as unknown as IReleaseNewService,
			});
		};

		it("should validate guid field", () => {
			// Arrange
			const consumer = createConsumer();
			const content = {
				game_name: "Test Game",
				title_raw: "Test Game",
				fitgirl_url: "https://test.com",
				pub_date: "2024-01-01",
				size_original: "10 GB",
				size_repack: "5 GB",
			};

			// Act & Assert
			// @ts-expect-error - accessing private method for testing
			expect(() => consumer.validateMessage(content)).toThrow(
				NonRetryableError,
			);
		});

		it("should validate game_name field", () => {
			// Arrange
			const consumer = createConsumer();
			const content = {
				guid: "test-guid",
				title_raw: "Test Game",
				fitgirl_url: "https://test.com",
				pub_date: "2024-01-01",
				size_original: "10 GB",
				size_repack: "5 GB",
			};

			// Act & Assert
			// @ts-expect-error - accessing private method for testing
			expect(() => consumer.validateMessage(content)).toThrow(
				NonRetryableError,
			);
		});

		it("should validate title_raw field", () => {
			// Arrange
			const consumer = createConsumer();
			const content = {
				guid: "test-guid",
				game_name: "Test Game",
				fitgirl_url: "https://test.com",
				pub_date: "2024-01-01",
				size_original: "10 GB",
				size_repack: "5 GB",
			};

			// Act & Assert
			// @ts-expect-error - accessing private method for testing
			expect(() => consumer.validateMessage(content)).toThrow(
				NonRetryableError,
			);
		});

		it("should validate size_original field", () => {
			// Arrange
			const consumer = createConsumer();
			const content = {
				guid: "test-guid",
				game_name: "Test Game",
				title_raw: "Test Game",
				fitgirl_url: "https://test.com",
				pub_date: "2024-01-01",
				size_repack: "5 GB",
			};

			// Act & Assert
			// @ts-expect-error - accessing private method for testing
			expect(() => consumer.validateMessage(content)).toThrow(
				NonRetryableError,
			);
		});

		it("should accept valid message", () => {
			// Arrange
			const consumer = createConsumer();
			const content = {
				guid: "test-guid",
				game_name: "Test Game",
				title_raw: "Test Game",
				fitgirl_url: "https://test.com",
				pub_date: "2024-01-01",
				size_original: "10 GB",
				size_repack: "5 GB",
				dlcs_included: false,
				steam: null,
			};

			// Act & Assert
			// @ts-expect-error - accessing private method for testing
			const result = consumer.validateMessage(content);
			expect(result.guid).toBe("test-guid");
		});
	});
});
