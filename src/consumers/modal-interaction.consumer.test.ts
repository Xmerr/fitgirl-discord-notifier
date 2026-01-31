import { describe, expect, it, mock } from "bun:test";
import type { IDlqHandler, ILogger } from "@xmer/consumer-shared";
import { NonRetryableError } from "@xmer/consumer-shared";
import type { Channel } from "amqplib";
import type { IModalInteractionService } from "../types/index.js";
import { ModalInteractionConsumer } from "./modal-interaction.consumer.js";

const mockLogger: ILogger = {
	debug: mock(() => {}),
	info: mock(() => {}),
	warn: mock(() => {}),
	error: mock(() => {}),
	child: mock(() => mockLogger),
};

describe("ModalInteractionConsumer", () => {
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
			handleModalSubmission: mock(() => Promise.resolve()),
		};

		return {
			consumer: new ModalInteractionConsumer({
				channel: mockChannel as unknown as Channel,
				exchange: "discord",
				queue: "discord.interaction.modal.fitgirl",
				routingKey: "interaction.modal",
				dlqHandler: mockDlqHandler as unknown as IDlqHandler,
				logger: mockLogger,
				modalInteractionService:
					mockService as unknown as IModalInteractionService,
			}),
			mockService,
		};
	};

	describe("validation - non-fitgirl modals", () => {
		it("should ignore non-fitgirl modal interactions", async () => {
			// Arrange
			const { consumer, mockService } = createConsumer();
			const content = {
				custom_id: "other_modal_id",
				user_id: "user-123",
				interaction_id: "int-123",
				interaction_token: "token-123",
				inputs: { some_field: "value" },
			};

			// Act - should not throw and not call service
			// @ts-expect-error - accessing protected method for testing
			await consumer.processMessage(content, {} as never);

			// Assert
			expect(mockService.handleModalSubmission).not.toHaveBeenCalled();
		});

		it("should ignore interactions without custom_id", async () => {
			// Arrange
			const { consumer, mockService } = createConsumer();
			const content = {
				user_id: "user-123",
				interaction_id: "int-123",
				interaction_token: "token-123",
				inputs: { steam_url: "https://store.steampowered.com/app/123" },
			};

			// Act
			// @ts-expect-error - accessing protected method for testing
			await consumer.processMessage(content, {} as never);

			// Assert
			expect(mockService.handleModalSubmission).not.toHaveBeenCalled();
		});
	});

	describe("validation - custom_id", () => {
		it("should throw NonRetryableError for empty custom_id", () => {
			// Arrange
			const { consumer } = createConsumer();
			const content = {
				custom_id: "",
				user_id: "user-123",
				interaction_id: "int-123",
				interaction_token: "token-123",
				inputs: { steam_url: "https://store.steampowered.com/app/123" },
			};

			// Act & Assert - note: this test bypasses processMessage check
			// @ts-expect-error - accessing private method for testing
			expect(() => consumer.validateMessage(content)).toThrow(
				NonRetryableError,
			);
		});
	});

	describe("validation - user_id", () => {
		it("should throw NonRetryableError for missing user_id", () => {
			// Arrange
			const { consumer } = createConsumer();
			const content = {
				custom_id: "fitgirl_fixsteam_modal_guid",
				interaction_id: "int-123",
				interaction_token: "token-123",
				inputs: { steam_url: "https://store.steampowered.com/app/123" },
			};

			// Act & Assert
			// @ts-expect-error - accessing private method for testing
			expect(() => consumer.validateMessage(content)).toThrow(
				NonRetryableError,
			);
		});

		it("should throw NonRetryableError for empty user_id", () => {
			// Arrange
			const { consumer } = createConsumer();
			const content = {
				custom_id: "fitgirl_fixsteam_modal_guid",
				user_id: "",
				interaction_id: "int-123",
				interaction_token: "token-123",
				inputs: { steam_url: "https://store.steampowered.com/app/123" },
			};

			// Act & Assert
			// @ts-expect-error - accessing private method for testing
			expect(() => consumer.validateMessage(content)).toThrow(
				NonRetryableError,
			);
		});
	});

	describe("validation - interaction_id", () => {
		it("should throw NonRetryableError for missing interaction_id", () => {
			// Arrange
			const { consumer } = createConsumer();
			const content = {
				custom_id: "fitgirl_fixsteam_modal_guid",
				user_id: "user-123",
				interaction_token: "token-123",
				inputs: { steam_url: "https://store.steampowered.com/app/123" },
			};

			// Act & Assert
			// @ts-expect-error - accessing private method for testing
			expect(() => consumer.validateMessage(content)).toThrow(
				NonRetryableError,
			);
		});
	});

	describe("validation - interaction_token", () => {
		it("should throw NonRetryableError for missing interaction_token", () => {
			// Arrange
			const { consumer } = createConsumer();
			const content = {
				custom_id: "fitgirl_fixsteam_modal_guid",
				user_id: "user-123",
				interaction_id: "int-123",
				inputs: { steam_url: "https://store.steampowered.com/app/123" },
			};

			// Act & Assert
			// @ts-expect-error - accessing private method for testing
			expect(() => consumer.validateMessage(content)).toThrow(
				NonRetryableError,
			);
		});
	});

	describe("validation - inputs", () => {
		it("should throw NonRetryableError for missing inputs", () => {
			// Arrange
			const { consumer } = createConsumer();
			const content = {
				custom_id: "fitgirl_fixsteam_modal_guid",
				user_id: "user-123",
				interaction_id: "int-123",
				interaction_token: "token-123",
			};

			// Act & Assert
			// @ts-expect-error - accessing private method for testing
			expect(() => consumer.validateMessage(content)).toThrow(
				NonRetryableError,
			);
		});

		it("should throw NonRetryableError for null inputs", () => {
			// Arrange
			const { consumer } = createConsumer();
			const content = {
				custom_id: "fitgirl_fixsteam_modal_guid",
				user_id: "user-123",
				interaction_id: "int-123",
				interaction_token: "token-123",
				inputs: null,
			};

			// Act & Assert
			// @ts-expect-error - accessing private method for testing
			expect(() => consumer.validateMessage(content)).toThrow(
				NonRetryableError,
			);
		});

		it("should throw NonRetryableError for array inputs", () => {
			// Arrange
			const { consumer } = createConsumer();
			const content = {
				custom_id: "fitgirl_fixsteam_modal_guid",
				user_id: "user-123",
				interaction_id: "int-123",
				interaction_token: "token-123",
				inputs: [],
			};

			// Act & Assert
			// @ts-expect-error - accessing private method for testing
			expect(() => consumer.validateMessage(content)).toThrow(
				NonRetryableError,
			);
		});
	});

	describe("validation - steam_url in inputs", () => {
		it("should throw NonRetryableError for missing steam_url", () => {
			// Arrange
			const { consumer } = createConsumer();
			const content = {
				custom_id: "fitgirl_fixsteam_modal_guid",
				user_id: "user-123",
				interaction_id: "int-123",
				interaction_token: "token-123",
				inputs: { other_field: "value" },
			};

			// Act & Assert
			// @ts-expect-error - accessing private method for testing
			expect(() => consumer.validateMessage(content)).toThrow(
				NonRetryableError,
			);
		});

		it("should throw NonRetryableError for empty steam_url", () => {
			// Arrange
			const { consumer } = createConsumer();
			const content = {
				custom_id: "fitgirl_fixsteam_modal_guid",
				user_id: "user-123",
				interaction_id: "int-123",
				interaction_token: "token-123",
				inputs: { steam_url: "" },
			};

			// Act & Assert
			// @ts-expect-error - accessing private method for testing
			expect(() => consumer.validateMessage(content)).toThrow(
				NonRetryableError,
			);
		});
	});

	describe("validation - valid message", () => {
		it("should accept valid fitgirl modal message", () => {
			// Arrange
			const { consumer } = createConsumer();
			const content = {
				custom_id: "fitgirl_fixsteam_modal_test-guid-123",
				user_id: "user-123",
				user_name: "testuser",
				channel_id: "channel-123",
				interaction_id: "int-123",
				interaction_token: "token-123",
				inputs: { steam_url: "https://store.steampowered.com/app/99999" },
			};

			// Act & Assert
			// @ts-expect-error - accessing private method for testing
			const result = consumer.validateMessage(content);
			expect(result.custom_id).toBe("fitgirl_fixsteam_modal_test-guid-123");
			expect(result.inputs.steam_url).toBe(
				"https://store.steampowered.com/app/99999",
			);
		});

		it("should call service with validated message", async () => {
			// Arrange
			const { consumer, mockService } = createConsumer();
			const content = {
				custom_id: "fitgirl_fixsteam_modal_test-guid-123",
				user_id: "user-123",
				user_name: "testuser",
				channel_id: "channel-123",
				interaction_id: "int-123",
				interaction_token: "token-123",
				inputs: { steam_url: "https://store.steampowered.com/app/99999" },
			};

			// Act
			// @ts-expect-error - accessing protected method for testing
			await consumer.processMessage(content, {} as never);

			// Assert
			expect(mockService.handleModalSubmission).toHaveBeenCalledWith(content);
		});
	});
});
