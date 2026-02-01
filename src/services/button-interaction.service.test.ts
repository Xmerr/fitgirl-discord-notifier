import { beforeEach, describe, expect, it, mock } from "bun:test";
import type { ILogger } from "@xmer/consumer-shared";
import { GameNotFoundError } from "../errors/index.js";
import type {
	ButtonInteractionMessage,
	GameRecord,
	IDiscordEmbedFormatter,
	IDiscordPublisher,
	IGamesRepository,
	IQbittorrentPublisher,
	IRatingsRepository,
} from "../types/index.js";
import { ButtonInteractionService } from "./button-interaction.service.js";

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
	magnet_link: "magnet:?xt=urn:btih:abc123",
	torrent_hash: null,
	discord_message_id: "msg-123",
	discord_channel_id: "channel-123",
	size_original: "45 GB",
	size_repack: "22 GB",
	pub_date: "2024-01-15T12:00:00.000Z",
	download_started_at: null,
	download_completed_at: null,
	created_at: "2024-01-15T12:00:00.000Z",
	...overrides,
});

describe("ButtonInteractionService", () => {
	let mockGamesRepository: {
		findByGuid: ReturnType<typeof mock>;
		updateDownloadStarted: ReturnType<typeof mock>;
	};
	let mockRatingsRepository: {
		upsert: ReturnType<typeof mock>;
		getCountsByGameId: ReturnType<typeof mock>;
	};
	let mockQbittorrentPublisher: {
		addDownload: ReturnType<typeof mock>;
	};
	let mockDiscordPublisher: {
		sendPost: ReturnType<typeof mock>;
	};
	let mockFormatter: {
		formatDownloadStarted: ReturnType<typeof mock>;
	};
	let service: ButtonInteractionService;

	beforeEach(() => {
		mockGamesRepository = {
			findByGuid: mock(() => Promise.resolve(createMockGame())),
			updateDownloadStarted: mock(() => Promise.resolve()),
		};

		mockRatingsRepository = {
			upsert: mock(() => Promise.resolve()),
			getCountsByGameId: mock(() =>
				Promise.resolve({ upvotes: 0, downvotes: 0 }),
			),
		};

		mockQbittorrentPublisher = {
			addDownload: mock(() => Promise.resolve()),
		};

		mockDiscordPublisher = {
			sendPost: mock(() => Promise.resolve()),
		};

		mockFormatter = {
			formatDownloadStarted: mock(() => ({
				id: "test-guid-123",
				channel_id: "channel-123",
				embed: { title: "Test Game" },
			})),
		};

		service = new ButtonInteractionService({
			gamesRepository: mockGamesRepository as unknown as IGamesRepository,
			ratingsRepository: mockRatingsRepository as unknown as IRatingsRepository,
			qbittorrentPublisher:
				mockQbittorrentPublisher as unknown as IQbittorrentPublisher,
			discordPublisher: mockDiscordPublisher as unknown as IDiscordPublisher,
			formatter: mockFormatter as unknown as IDiscordEmbedFormatter,
			logger: mockLogger,
		});
	});

	describe("handleInteraction - download", () => {
		it("should initiate download for valid request", async () => {
			// Arrange
			const message: ButtonInteractionMessage = {
				custom_id: "fitgirl_download_test-guid-123",
				user_id: "user-123",
				user_name: "testuser",
				channel_id: "channel-123",
				message_id: "msg-123",
				correlation_id: "corr-123",
				interaction_id: "int-123",
				interaction_token: "token-123",
			};

			// Act
			await service.handleInteraction(message);

			// Assert
			expect(mockQbittorrentPublisher.addDownload).toHaveBeenCalledWith({
				id: "test-guid-123",
				magnetLink: "magnet:?xt=urn:btih:abc123",
				category: "games",
			});
			expect(mockGamesRepository.updateDownloadStarted).toHaveBeenCalledWith(
				"test-guid-123",
			);
		});

		it("should skip if download already started", async () => {
			// Arrange
			mockGamesRepository.findByGuid.mockResolvedValue(
				createMockGame({ download_started_at: "2024-01-15T12:00:00Z" }),
			);

			const message: ButtonInteractionMessage = {
				custom_id: "fitgirl_download_test-guid-123",
				user_id: "user-123",
				user_name: "testuser",
				channel_id: "channel-123",
				message_id: "msg-123",
				correlation_id: "corr-123",
				interaction_id: "int-123",
				interaction_token: "token-123",
			};

			// Act
			await service.handleInteraction(message);

			// Assert
			expect(mockQbittorrentPublisher.addDownload).not.toHaveBeenCalled();
		});

		it("should skip if no magnet link", async () => {
			// Arrange
			mockGamesRepository.findByGuid.mockResolvedValue(
				createMockGame({ magnet_link: null }),
			);

			const message: ButtonInteractionMessage = {
				custom_id: "fitgirl_download_test-guid-123",
				user_id: "user-123",
				user_name: "testuser",
				channel_id: "channel-123",
				message_id: "msg-123",
				correlation_id: "corr-123",
				interaction_id: "int-123",
				interaction_token: "token-123",
			};

			// Act
			await service.handleInteraction(message);

			// Assert
			expect(mockQbittorrentPublisher.addDownload).not.toHaveBeenCalled();
		});

		it("should throw GameNotFoundError for unknown guid", async () => {
			// Arrange
			mockGamesRepository.findByGuid.mockResolvedValue(null);

			const message: ButtonInteractionMessage = {
				custom_id: "fitgirl_download_unknown-guid",
				user_id: "user-123",
				user_name: "testuser",
				channel_id: "channel-123",
				message_id: "msg-123",
				correlation_id: "corr-123",
				interaction_id: "int-123",
				interaction_token: "token-123",
			};

			// Act & Assert
			await expect(service.handleInteraction(message)).rejects.toThrow(
				GameNotFoundError,
			);
		});
	});

	describe("handleInteraction - upvote", () => {
		it("should record upvote", async () => {
			// Arrange
			const message: ButtonInteractionMessage = {
				custom_id: "fitgirl_upvote_test-guid-123",
				user_id: "user-123",
				user_name: "testuser",
				channel_id: "channel-123",
				message_id: "msg-123",
				correlation_id: "corr-123",
				interaction_id: "int-123",
				interaction_token: "token-123",
			};

			// Act
			await service.handleInteraction(message);

			// Assert
			expect(mockRatingsRepository.upsert).toHaveBeenCalledWith(
				1,
				"user-123",
				"upvote",
			);
		});
	});

	describe("handleInteraction - downvote", () => {
		it("should record downvote", async () => {
			// Arrange
			const message: ButtonInteractionMessage = {
				custom_id: "fitgirl_downvote_test-guid-123",
				user_id: "user-123",
				user_name: "testuser",
				channel_id: "channel-123",
				message_id: "msg-123",
				correlation_id: "corr-123",
				interaction_id: "int-123",
				interaction_token: "token-123",
			};

			// Act
			await service.handleInteraction(message);

			// Assert
			expect(mockRatingsRepository.upsert).toHaveBeenCalledWith(
				1,
				"user-123",
				"downvote",
			);
		});
	});

	describe("handleInteraction - invalid custom_id", () => {
		it("should throw for invalid format", async () => {
			// Arrange
			const message: ButtonInteractionMessage = {
				custom_id: "fitgirl_invalid",
				user_id: "user-123",
				user_name: "testuser",
				channel_id: "channel-123",
				message_id: "msg-123",
				correlation_id: "corr-123",
				interaction_id: "int-123",
				interaction_token: "token-123",
			};

			// Act & Assert
			await expect(service.handleInteraction(message)).rejects.toThrow();
		});

		it("should throw for unknown action", async () => {
			// Arrange
			const message: ButtonInteractionMessage = {
				custom_id: "fitgirl_unknown_test-guid-123",
				user_id: "user-123",
				user_name: "testuser",
				channel_id: "channel-123",
				message_id: "msg-123",
				correlation_id: "corr-123",
				interaction_id: "int-123",
				interaction_token: "token-123",
			};

			// Act & Assert
			await expect(service.handleInteraction(message)).rejects.toThrow(
				"Unknown action",
			);
		});
	});
});
