import { beforeEach, describe, expect, it, mock } from "bun:test";
import type { ILogger } from "@xmer/consumer-shared";
import type { Channel } from "amqplib";
import type { QbittorrentAddDownload } from "../types/index.js";
import { QbittorrentPublisher } from "./qbittorrent.publisher.js";

const mockLogger: ILogger = {
	debug: mock(() => {}),
	info: mock(() => {}),
	warn: mock(() => {}),
	error: mock(() => {}),
	child: mock(() => mockLogger),
};

describe("QbittorrentPublisher", () => {
	let mockChannel: {
		assertExchange: ReturnType<typeof mock>;
		publish: ReturnType<typeof mock>;
	};
	let publisher: QbittorrentPublisher;

	beforeEach(() => {
		mockChannel = {
			assertExchange: mock(() => Promise.resolve({ exchange: "qbittorrent" })),
			publish: mock(() => true),
		};

		publisher = new QbittorrentPublisher({
			channel: mockChannel as unknown as Channel,
			exchange: "qbittorrent",
			logger: mockLogger,
		});
	});

	describe("addDownload", () => {
		it("should publish download request to downloads.add routing key", async () => {
			// Arrange
			const download: QbittorrentAddDownload = {
				magnet_link: "magnet:?xt=urn:btih:abc123",
				category: "games",
			};

			// Act
			await publisher.addDownload(download);

			// Assert
			expect(mockChannel.assertExchange).toHaveBeenCalledWith(
				"qbittorrent",
				"topic",
				{ durable: true },
			);
			expect(mockChannel.publish).toHaveBeenCalled();
			const publishCall = mockChannel.publish.mock.calls[0];
			expect(publishCall?.[0]).toBe("qbittorrent");
			expect(publishCall?.[1]).toBe("downloads.add");
		});

		it("should serialize download request correctly", async () => {
			// Arrange
			const download: QbittorrentAddDownload = {
				magnet_link: "magnet:?xt=urn:btih:abc123",
				category: "games",
				tags: ["test-guid"],
			};

			// Act
			await publisher.addDownload(download);

			// Assert
			const publishCall = mockChannel.publish.mock.calls[0];
			const buffer = publishCall?.[2] as Buffer;
			const parsed = JSON.parse(buffer.toString());
			expect(parsed.magnet_link).toBe("magnet:?xt=urn:btih:abc123");
			expect(parsed.category).toBe("games");
			expect(parsed.tags).toEqual(["test-guid"]);
		});
	});
});
