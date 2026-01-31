import { describe, expect, it, mock } from "bun:test";
import type { IDlqHandler, ILogger } from "@xmer/consumer-shared";
import { NonRetryableError } from "@xmer/consumer-shared";
import type { Channel } from "amqplib";
import type { IButtonInteractionService } from "../types/index.js";
import { ButtonInteractionConsumer } from "./button-interaction.consumer.js";

const mockLogger: ILogger = {
	debug: mock(() => {}),
	info: mock(() => {}),
	warn: mock(() => {}),
	error: mock(() => {}),
	child: mock(() => mockLogger),
};

describe("ButtonInteractionConsumer", () => {
	describe("validation", () => {
		const createConsumer = () => {
			const mockChannel = {
				prefetch: mock(() => Promise.resolve()),
				assertExchange: mock(() => Promise.resolve({ exchange: "discord" })),
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
				handleInteraction: mock(() => Promise.resolve()),
			};

			return new ButtonInteractionConsumer({
				channel: mockChannel as unknown as Channel,
				exchange: "discord",
				queue: "discord.interaction.button.fitgirl",
				routingKey: "interaction.button",
				dlqHandler: mockDlqHandler as unknown as IDlqHandler,
				logger: mockLogger,
				buttonInteractionService:
					mockService as unknown as IButtonInteractionService,
			});
		};

		it("should validate custom_id field for fitgirl buttons", () => {
			// Arrange
			const consumer = createConsumer();
			const content = {
				custom_id: "fitgirl_download_guid",
				message_id: "msg-123",
			};

			// Act & Assert - should throw because user_id is missing
			// @ts-expect-error - accessing private method for testing
			expect(() => consumer.validateMessage(content)).toThrow(
				NonRetryableError,
			);
		});

		it("should validate user_id field", () => {
			// Arrange
			const consumer = createConsumer();
			const content = {
				custom_id: "fitgirl_download_guid",
				message_id: "msg-123",
			};

			// Act & Assert
			// @ts-expect-error - accessing private method for testing
			expect(() => consumer.validateMessage(content)).toThrow(
				NonRetryableError,
			);
		});

		it("should accept valid fitgirl button message", () => {
			// Arrange
			const consumer = createConsumer();
			const content = {
				custom_id: "fitgirl_download_guid",
				user_id: "user-123",
				user_name: "testuser",
				channel_id: "channel-123",
				message_id: "msg-123",
				correlation_id: "corr-123",
				interaction_id: "int-123",
				interaction_token: "token-123",
			};

			// Act & Assert
			// @ts-expect-error - accessing private method for testing
			const result = consumer.validateMessage(content);
			expect(result.custom_id).toBe("fitgirl_download_guid");
		});
	});
});
