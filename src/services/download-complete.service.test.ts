import { beforeEach, describe, expect, it, mock } from "bun:test";
import type { ILogger } from "@xmer/consumer-shared";
import type {
	DownloadCompleteMessage,
	GameRecord,
	IDiscordEmbedFormatter,
	IDiscordPublisher,
	IGamesRepository,
	IRatingsRepository,
} from "../types/index.js";
import { DownloadCompleteService } from "./download-complete.service.js";

const mockLogger: ILogger = {
	debug: mock(() => {}),
	info: mock(() => {}),
	warn: mock(() => {}),
	error: mock(() => {}),
	child: mock(() => mockLogger),
};

const createMockGame = (overrides: Partial<GameRecord> = {}): GameRecord => ({
	id: 1,
	guid: "test-guid-123",
	game_name: "Test Game",
	title_raw: "Test Game – v1.0",
	fitgirl_url: "https://fitgirl-repacks.site/test-game/",
	steam_app_id: null,
	steam_url: null,
	steam_name: null,
	magnet_link: null,
	torrent_hash: "abc123hash",
	discord_message_id: "msg-123",
	discord_channel_id: "channel-123",
	size_original: "45 GB",
	size_repack: "22 GB",
	pub_date: "2024-01-15T12:00:00.000Z",
	download_started_at: "2024-01-15T12:00:00.000Z",
	download_completed_at: null,
	created_at: "2024-01-15T12:00:00.000Z",
	...overrides,
});

describe("DownloadCompleteService", () => {
	let mockGamesRepository: {
		findByTorrentHash: ReturnType<typeof mock>;
		findByGuid: ReturnType<typeof mock>;
		updateDownloadCompleted: ReturnType<typeof mock>;
	};
	let mockRatingsRepository: {
		getCountsByGameId: ReturnType<typeof mock>;
	};
	let mockDiscordPublisher: {
		sendPost: ReturnType<typeof mock>;
	};
	let mockFormatter: {
		formatDownloadComplete: ReturnType<typeof mock>;
	};
	let service: DownloadCompleteService;

	beforeEach(() => {
		mockGamesRepository = {
			findByTorrentHash: mock(() => Promise.resolve(createMockGame())),
			findByGuid: mock(() =>
				Promise.resolve(
					createMockGame({ download_completed_at: "2024-01-15T13:00:00Z" }),
				),
			),
			updateDownloadCompleted: mock(() => Promise.resolve()),
		};

		mockRatingsRepository = {
			getCountsByGameId: mock(() =>
				Promise.resolve({ upvotes: 10, downvotes: 2 }),
			),
		};

		mockDiscordPublisher = {
			sendPost: mock(() => Promise.resolve()),
		};

		mockFormatter = {
			formatDownloadComplete: mock(() => ({
				id: "test-guid-123",
				channel_id: "channel-123",
				embed: { title: "Test Game" },
			})),
		};

		service = new DownloadCompleteService({
			gamesRepository: mockGamesRepository as unknown as IGamesRepository,
			ratingsRepository: mockRatingsRepository as unknown as IRatingsRepository,
			discordPublisher: mockDiscordPublisher as unknown as IDiscordPublisher,
			formatter: mockFormatter as unknown as IDiscordEmbedFormatter,
			logger: mockLogger,
		});
	});

	describe("handleComplete", () => {
		it("should update database and post to Discord", async () => {
			// Arrange
			const complete: DownloadCompleteMessage = {
				hash: "abc123hash",
				name: "Test Game",
				save_path: "/downloads/games",
				total_size: 23622320128,
			};

			// Act
			await service.handleComplete(complete);

			// Assert
			expect(mockGamesRepository.updateDownloadCompleted).toHaveBeenCalledWith(
				"test-guid-123",
			);
			expect(mockRatingsRepository.getCountsByGameId).toHaveBeenCalledWith(1);
			expect(mockFormatter.formatDownloadComplete).toHaveBeenCalled();
			expect(mockDiscordPublisher.sendPost).toHaveBeenCalled();
		});

		it("should skip if game not found", async () => {
			// Arrange
			mockGamesRepository.findByTorrentHash.mockResolvedValue(null);

			const complete: DownloadCompleteMessage = {
				hash: "unknown-hash",
				name: "Unknown Game",
				save_path: "/downloads/games",
				total_size: 1000000000,
			};

			// Act
			await service.handleComplete(complete);

			// Assert
			expect(
				mockGamesRepository.updateDownloadCompleted,
			).not.toHaveBeenCalled();
			expect(mockDiscordPublisher.sendPost).not.toHaveBeenCalled();
		});

		it("should include ratings in complete message", async () => {
			// Arrange
			const complete: DownloadCompleteMessage = {
				hash: "abc123hash",
				name: "Test Game",
				save_path: "/downloads/games",
				total_size: 23622320128,
			};

			// Act
			await service.handleComplete(complete);

			// Assert
			expect(mockFormatter.formatDownloadComplete).toHaveBeenCalledWith(
				expect.any(Object),
				{ upvotes: 10, downvotes: 2 },
			);
		});
	});
});
