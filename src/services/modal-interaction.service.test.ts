import { beforeEach, describe, expect, it, mock } from "bun:test";
import type { ILogger } from "@xmer/consumer-shared";
import { GameNotFoundError, InvalidSteamUrlError } from "../errors/index.js";
import type {
	GameRecord,
	IDiscordPublisher,
	IGamesRepository,
	ModalInteractionMessage,
} from "../types/index.js";
import { ModalInteractionService } from "./modal-interaction.service.js";

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
	corrected_name: null,
	fitgirl_url: "https://fitgirl-repacks.site/test-game/",
	steam_app_id: 12345,
	steam_url: "https://store.steampowered.com/app/12345",
	steam_name: "Test Game",
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
	updated_at: "2024-01-15T12:00:00.000Z",
	steam_header_image: null,
	steam_price: null,
	steam_categories: null,
	steam_review_score: null,
	steam_review_desc: null,
	steam_total_positive: null,
	steam_total_negative: null,
	rating: null,
	...overrides,
});

const createMockMessage = (
	overrides: Partial<ModalInteractionMessage> = {},
): ModalInteractionMessage => ({
	custom_id: "fitgirl_fixsteam_modal_test-guid-123",
	user_id: "user-123",
	user_name: "testuser",
	channel_id: "channel-123",
	interaction_id: "int-123",
	interaction_token: "token-123",
	inputs: { steam_url: "https://store.steampowered.com/app/99999" },
	...overrides,
});

describe("ModalInteractionService", () => {
	let mockGamesRepository: {
		findByGuid: ReturnType<typeof mock>;
	};
	let mockDiscordPublisher: {
		sendInteractionResponse: ReturnType<typeof mock>;
	};
	let service: ModalInteractionService;

	beforeEach(() => {
		mockGamesRepository = {
			findByGuid: mock(() => Promise.resolve(createMockGame())),
		};

		mockDiscordPublisher = {
			sendInteractionResponse: mock(() => Promise.resolve()),
		};

		service = new ModalInteractionService({
			gamesRepository: mockGamesRepository as unknown as IGamesRepository,
			discordPublisher: mockDiscordPublisher as unknown as IDiscordPublisher,
			logger: mockLogger,
		});
	});

	describe("handleModalSubmission - success", () => {
		it("should send success response for valid correction", async () => {
			// Arrange
			const message = createMockMessage();

			// Act
			await service.handleModalSubmission(message);

			// Assert
			expect(mockDiscordPublisher.sendInteractionResponse).toHaveBeenCalledWith(
				"int-123",
				"token-123",
				'Steam URL correction noted for "Test Game". Thank you for the feedback!',
				true,
			);
		});

		it("should handle game with null steam_url", async () => {
			// Arrange
			mockGamesRepository.findByGuid.mockResolvedValue(
				createMockGame({ steam_url: null }),
			);
			const message = createMockMessage();

			// Act
			await service.handleModalSubmission(message);

			// Assert
			expect(mockDiscordPublisher.sendInteractionResponse).toHaveBeenCalledWith(
				"int-123",
				"token-123",
				'Steam URL correction noted for "Test Game". Thank you for the feedback!',
				true,
			);
		});
	});

	describe("handleModalSubmission - game not found", () => {
		it("should throw GameNotFoundError when game not found", async () => {
			// Arrange
			mockGamesRepository.findByGuid.mockResolvedValue(null);
			const message = createMockMessage();

			// Act & Assert
			await expect(service.handleModalSubmission(message)).rejects.toThrow(
				GameNotFoundError,
			);
			expect(mockDiscordPublisher.sendInteractionResponse).toHaveBeenCalledWith(
				"int-123",
				"token-123",
				"Game not found. The original post may have been deleted.",
				true,
			);
		});
	});

	describe("handleModalSubmission - invalid Steam URL", () => {
		it("should throw InvalidSteamUrlError for non-Steam URL", async () => {
			// Arrange
			const message = createMockMessage({
				inputs: { steam_url: "https://example.com/game" },
			});

			// Act & Assert
			await expect(service.handleModalSubmission(message)).rejects.toThrow(
				InvalidSteamUrlError,
			);
		});

		it("should throw InvalidSteamUrlError for malformed Steam URL", async () => {
			// Arrange
			const message = createMockMessage({
				inputs: { steam_url: "https://store.steampowered.com/notapp/123" },
			});

			// Act & Assert
			await expect(service.handleModalSubmission(message)).rejects.toThrow(
				InvalidSteamUrlError,
			);
		});

		it("should send error response for invalid URL", async () => {
			// Arrange
			const message = createMockMessage({
				inputs: { steam_url: "invalid-url" },
			});

			// Act
			try {
				await service.handleModalSubmission(message);
			} catch {
				// Expected
			}

			// Assert
			expect(mockDiscordPublisher.sendInteractionResponse).toHaveBeenCalledWith(
				"int-123",
				"token-123",
				"Invalid Steam URL format. Please provide a URL like: https://store.steampowered.com/app/123456",
				true,
			);
		});

		it("should not lookup game for invalid URL", async () => {
			// Arrange
			const message = createMockMessage({
				inputs: { steam_url: "not-a-url" },
			});

			// Act
			try {
				await service.handleModalSubmission(message);
			} catch {
				// Expected
			}

			// Assert
			expect(mockGamesRepository.findByGuid).not.toHaveBeenCalled();
		});
	});

	describe("handleModalSubmission - Steam URL extraction", () => {
		it("should accept valid Steam store URL", async () => {
			// Arrange
			const message = createMockMessage({
				inputs: { steam_url: "https://store.steampowered.com/app/570/Dota_2/" },
			});

			// Act
			await service.handleModalSubmission(message);

			// Assert
			expect(mockDiscordPublisher.sendInteractionResponse).toHaveBeenCalledWith(
				"int-123",
				"token-123",
				'Steam URL correction noted for "Test Game". Thank you for the feedback!',
				true,
			);
		});

		it("should accept Steam URL without trailing path", async () => {
			// Arrange
			const message = createMockMessage({
				inputs: { steam_url: "https://store.steampowered.com/app/730" },
			});

			// Act
			await service.handleModalSubmission(message);

			// Assert
			expect(mockDiscordPublisher.sendInteractionResponse).toHaveBeenCalled();
		});
	});

	describe("handleModalSubmission - custom_id parsing", () => {
		it("should extract guid from custom_id", async () => {
			// Arrange
			const message = createMockMessage({
				custom_id: "fitgirl_fixsteam_modal_my-game-guid-456",
			});
			mockGamesRepository.findByGuid.mockResolvedValue(
				createMockGame({ guid: "my-game-guid-456" }),
			);

			// Act
			await service.handleModalSubmission(message);

			// Assert
			expect(mockGamesRepository.findByGuid).toHaveBeenCalledWith(
				"my-game-guid-456",
			);
		});

		it("should throw for invalid custom_id format", async () => {
			// Arrange
			const message = createMockMessage({
				custom_id: "invalid_prefix_guid",
			});

			// Act & Assert
			await expect(service.handleModalSubmission(message)).rejects.toThrow(
				"Invalid custom_id format",
			);
		});
	});
});
