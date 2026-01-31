import { beforeEach, describe, expect, it, mock } from "bun:test";
import type { ILogger } from "@xmer/consumer-shared";
import type {
	DownloadProgressMessage,
	GameRecord,
	IDiscordEmbedFormatter,
	IDiscordPublisher,
	IGamesRepository,
	IProgressThrottler,
	IRatingsRepository,
} from "../types/index.js";
import { DownloadProgressService } from "./download-progress.service.js";

const mockLogger: ILogger = {
	debug: mock(() => {}),
	info: mock(() => {}),
	warn: mock(() => {}),
	error: mock(() => {}),
	child: mock(() => mockLogger),
};

const createMockGame = (): GameRecord => ({
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
});

describe("DownloadProgressService", () => {
	let mockGamesRepository: {
		findByTorrentHash: ReturnType<typeof mock>;
	};
	let mockRatingsRepository: {
		getCountsByGameId: ReturnType<typeof mock>;
	};
	let mockDiscordPublisher: {
		sendPost: ReturnType<typeof mock>;
	};
	let mockFormatter: {
		formatProgressUpdate: ReturnType<typeof mock>;
	};
	let mockProgressThrottler: {
		shouldUpdate: ReturnType<typeof mock>;
		markUpdated: ReturnType<typeof mock>;
	};
	let service: DownloadProgressService;

	beforeEach(() => {
		mockGamesRepository = {
			findByTorrentHash: mock(() => Promise.resolve(createMockGame())),
		};

		mockRatingsRepository = {
			getCountsByGameId: mock(() =>
				Promise.resolve({ upvotes: 5, downvotes: 1 }),
			),
		};

		mockDiscordPublisher = {
			sendPost: mock(() => Promise.resolve()),
		};

		mockFormatter = {
			formatProgressUpdate: mock(() => ({
				id: "test-guid-123",
				channel_id: "channel-123",
				embed: { title: "Test Game" },
			})),
		};

		mockProgressThrottler = {
			shouldUpdate: mock(() => Promise.resolve(true)),
			markUpdated: mock(() => Promise.resolve()),
		};

		service = new DownloadProgressService({
			gamesRepository: mockGamesRepository as unknown as IGamesRepository,
			ratingsRepository: mockRatingsRepository as unknown as IRatingsRepository,
			discordPublisher: mockDiscordPublisher as unknown as IDiscordPublisher,
			formatter: mockFormatter as unknown as IDiscordEmbedFormatter,
			progressThrottler: mockProgressThrottler as unknown as IProgressThrottler,
			logger: mockLogger,
		});
	});

	describe("handleProgress", () => {
		it("should update Discord when not throttled", async () => {
			// Arrange
			const progress: DownloadProgressMessage = {
				hash: "abc123hash",
				name: "Test Game",
				progress: 0.5,
				download_speed: 1048576,
				eta: 3600,
				state: "downloading",
			};

			// Act
			await service.handleProgress(progress);

			// Assert
			expect(mockProgressThrottler.shouldUpdate).toHaveBeenCalledWith(
				"test-guid-123",
			);
			expect(mockProgressThrottler.markUpdated).toHaveBeenCalledWith(
				"test-guid-123",
			);
			expect(mockFormatter.formatProgressUpdate).toHaveBeenCalled();
			expect(mockDiscordPublisher.sendPost).toHaveBeenCalled();
		});

		it("should skip update when throttled", async () => {
			// Arrange
			mockProgressThrottler.shouldUpdate.mockResolvedValue(false);

			const progress: DownloadProgressMessage = {
				hash: "abc123hash",
				name: "Test Game",
				progress: 0.5,
				download_speed: 1048576,
				eta: 3600,
				state: "downloading",
			};

			// Act
			await service.handleProgress(progress);

			// Assert
			expect(mockProgressThrottler.markUpdated).not.toHaveBeenCalled();
			expect(mockDiscordPublisher.sendPost).not.toHaveBeenCalled();
		});

		it("should skip if game not found", async () => {
			// Arrange
			mockGamesRepository.findByTorrentHash.mockResolvedValue(null);

			const progress: DownloadProgressMessage = {
				hash: "unknown-hash",
				name: "Unknown Game",
				progress: 0.5,
				download_speed: 1048576,
				eta: 3600,
				state: "downloading",
			};

			// Act
			await service.handleProgress(progress);

			// Assert
			expect(mockProgressThrottler.shouldUpdate).not.toHaveBeenCalled();
			expect(mockDiscordPublisher.sendPost).not.toHaveBeenCalled();
		});

		it("should include ratings in progress update", async () => {
			// Arrange
			const progress: DownloadProgressMessage = {
				hash: "abc123hash",
				name: "Test Game",
				progress: 0.75,
				download_speed: 2097152,
				eta: 1800,
				state: "downloading",
			};

			// Act
			await service.handleProgress(progress);

			// Assert
			expect(mockRatingsRepository.getCountsByGameId).toHaveBeenCalledWith(1);
			expect(mockFormatter.formatProgressUpdate).toHaveBeenCalledWith(
				expect.any(Object),
				progress,
				{ upvotes: 5, downvotes: 1 },
			);
		});
	});
});
