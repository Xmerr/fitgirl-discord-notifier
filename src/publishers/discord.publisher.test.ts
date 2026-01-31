import { beforeEach, describe, expect, it, mock } from "bun:test";
import type { ILogger } from "@xmer/consumer-shared";
import type { Channel } from "amqplib";
import type { DiscordPostMessage } from "../types/index.js";
import { DiscordPublisher } from "./discord.publisher.js";

const mockLogger: ILogger = {
	debug: mock(() => {}),
	info: mock(() => {}),
	warn: mock(() => {}),
	error: mock(() => {}),
	child: mock(() => mockLogger),
};

describe("DiscordPublisher", () => {
	let mockChannel: {
		assertExchange: ReturnType<typeof mock>;
		publish: ReturnType<typeof mock>;
	};
	let publisher: DiscordPublisher;

	beforeEach(() => {
		mockChannel = {
			assertExchange: mock(() => Promise.resolve({ exchange: "discord" })),
			publish: mock(() => true),
		};

		publisher = new DiscordPublisher({
			channel: mockChannel as unknown as Channel,
			exchange: "discord",
			logger: mockLogger,
		});
	});

	describe("sendPost", () => {
		it("should publish message to post.send routing key", async () => {
			// Arrange
			const message: DiscordPostMessage = {
				id: "test-id",
				channel_id: "channel-123",
				content: "Test message",
			};

			// Act
			await publisher.sendPost(message);

			// Assert
			expect(mockChannel.assertExchange).toHaveBeenCalledWith(
				"discord",
				"topic",
				{ durable: true },
			);
			expect(mockChannel.publish).toHaveBeenCalled();
			const publishCall = mockChannel.publish.mock.calls[0];
			expect(publishCall?.[0]).toBe("discord");
			expect(publishCall?.[1]).toBe("post.send");
		});

		it("should serialize message correctly", async () => {
			// Arrange
			const message: DiscordPostMessage = {
				id: "test-id",
				channel_id: "channel-123",
				embed: {
					title: "Test Title",
					description: "Test Description",
				},
			};

			// Act
			await publisher.sendPost(message);

			// Assert
			const publishCall = mockChannel.publish.mock.calls[0];
			const buffer = publishCall?.[2] as Buffer;
			const parsed = JSON.parse(buffer.toString());
			expect(parsed.id).toBe("test-id");
			expect(parsed.embed.title).toBe("Test Title");
		});
	});
});
