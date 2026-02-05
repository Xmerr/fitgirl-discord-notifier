import { beforeEach, describe, expect, it, mock } from "bun:test";
import type { ILogger } from "@xmer/consumer-shared";
import { DuplicateGameError } from "../errors/index.js";
import type { FitGirlRelease, GameRecord } from "../types/index.js";
import { GamesRepository } from "./games.repository.js";

const mockLogger: ILogger = {
	debug: mock(() => {}),
	info: mock(() => {}),
	warn: mock(() => {}),
	error: mock(() => {}),
	child: mock(() => mockLogger),
};

const createMockRelease = (
	overrides: Partial<FitGirlRelease> = {},
): FitGirlRelease => ({
	guid: "test-guid-123",
	title_raw: "Test Game – v1.0 + 2 DLCs",
	game_name: "Test Game",
	version: "v1.0",
	dlcs_included: true,
	dlc_count: 2,
	fitgirl_url: "https://fitgirl-repacks.site/test-game/",
	pub_date: "2024-01-15T12:00:00.000Z",
	size_original: "45 GB",
	size_repack: "22 GB",
	genres: ["Action", "RPG"],
	magnet_link: "magnet:?xt=urn:btih:abc123",
	steam: {
		app_id: 12345,
		name: "Test Game",
		steam_url: "https://store.steampowered.com/app/12345",
		release_date: "2024-01-01",
		price: "$59.99",
		ratings: {
			total_positive: 1000,
			total_negative: 100,
			review_score_desc: "Very Positive",
		},
		categories: ["Single-player", "Multiplayer"],
		media: {
			header_image: "https://cdn.steam.com/header.jpg",
		},
	},
	...overrides,
});

const createMockGameRecord = (
	overrides: Partial<GameRecord> = {},
): GameRecord => ({
	id: 1,
	guid: "test-guid-123",
	game_name: "Test Game",
	title_raw: "Test Game – v1.0 + 2 DLCs",
	corrected_name: null,
	fitgirl_url: "https://fitgirl-repacks.site/test-game/",
	steam_app_id: 12345,
	steam_url: "https://store.steampowered.com/app/12345",
	steam_name: "Test Game",
	magnet_link: "magnet:?xt=urn:btih:abc123",
	torrent_hash: null,
	discord_message_id: null,
	discord_channel_id: "channel-123",
	size_original: "45 GB",
	size_repack: "22 GB",
	pub_date: "2024-01-15T12:00:00.000Z",
	download_started_at: null,
	download_completed_at: null,
	created_at: "2024-01-15T12:00:00.000Z",
	updated_at: "2024-01-15T12:00:00.000Z",
	steam_header_image: "https://cdn.steam.com/header.jpg",
	steam_price: "$59.99",
	steam_categories: JSON.stringify(["Single-player", "Multiplayer"]),
	steam_review_score: null,
	steam_review_desc: "Very Positive",
	steam_total_positive: 1000,
	steam_total_negative: 100,
	rating: null,
	...overrides,
});

// Create a mock sql template tag function
const createMockSql = () => {
	const mockSqlFn = mock(
		(_strings: TemplateStringsArray, ..._values: unknown[]) => {
			return Promise.resolve([]);
		},
	);

	return mockSqlFn as unknown as ReturnType<typeof mock> & {
		mockResolvedValueOnce: (value: unknown) => void;
	};
};

describe("GamesRepository", () => {
	let mockSql: ReturnType<typeof createMockSql>;
	let repository: GamesRepository;

	beforeEach(() => {
		mockSql = createMockSql();
		repository = new GamesRepository({
			sql: mockSql as unknown as Parameters<
				typeof GamesRepository.prototype.constructor
			>[0]["sql"],
			logger: mockLogger,
		});
	});

	describe("create", () => {
		it("should create a new game record", async () => {
			// Arrange
			const release = createMockRelease();
			const gameRecord = createMockGameRecord();
			mockSql.mockResolvedValueOnce([gameRecord]);

			// Act
			const result = await repository.create(release, "channel-123");

			// Assert
			expect(result.guid).toBe("test-guid-123");
			expect(result.game_name).toBe("Test Game");
			expect(result.steam_app_id).toBe(12345);
			expect(result.discord_channel_id).toBe("channel-123");
		});

		it("should create game with Steam enrichment data", async () => {
			// Arrange
			const release = createMockRelease();
			const gameRecord = createMockGameRecord();
			mockSql.mockResolvedValueOnce([gameRecord]);

			// Act
			const result = await repository.create(release, "channel-123");

			// Assert
			expect(result.steam_header_image).toBe(
				"https://cdn.steam.com/header.jpg",
			);
			expect(result.steam_price).toBe("$59.99");
			expect(result.steam_categories).toBe(
				JSON.stringify(["Single-player", "Multiplayer"]),
			);
			expect(result.steam_review_desc).toBe("Very Positive");
			expect(result.steam_total_positive).toBe(1000);
			expect(result.steam_total_negative).toBe(100);
		});

		it("should create game without steam data", async () => {
			// Arrange
			const release = createMockRelease({ steam: null });
			const gameRecord = createMockGameRecord({
				steam_app_id: null,
				steam_url: null,
				steam_header_image: null,
				steam_price: null,
				steam_categories: null,
			});
			mockSql.mockResolvedValueOnce([gameRecord]);

			// Act
			const result = await repository.create(release, "channel-123");

			// Assert
			expect(result.steam_app_id).toBeNull();
			expect(result.steam_url).toBeNull();
			expect(result.steam_header_image).toBeNull();
			expect(result.steam_price).toBeNull();
			expect(result.steam_categories).toBeNull();
		});

		it("should throw DuplicateGameError for duplicate guid", async () => {
			// Arrange
			const release = createMockRelease();
			const duplicateError = new Error("duplicate key value");
			mockSql.mockRejectedValueOnce(duplicateError);

			// Act & Assert
			try {
				await repository.create(release, "channel-123");
				expect(true).toBe(false); // Should not reach here
			} catch (error) {
				expect(error).toBeInstanceOf(DuplicateGameError);
			}
		});
	});

	describe("findByGuid", () => {
		it("should find existing game by guid", async () => {
			// Arrange
			const gameRecord = createMockGameRecord();
			mockSql.mockResolvedValueOnce([gameRecord]);

			// Act
			const result = await repository.findByGuid("test-guid-123");

			// Assert
			expect(result).not.toBeNull();
			expect(result?.game_name).toBe("Test Game");
		});

		it("should return null for non-existent guid", async () => {
			// Arrange
			mockSql.mockResolvedValueOnce([]);

			// Act
			const result = await repository.findByGuid("non-existent");

			// Assert
			expect(result).toBeNull();
		});
	});

	describe("findByTorrentHash", () => {
		it("should find game by torrent hash", async () => {
			// Arrange
			const gameRecord = createMockGameRecord({ torrent_hash: "abc123hash" });
			mockSql.mockResolvedValueOnce([gameRecord]);

			// Act
			const result = await repository.findByTorrentHash("abc123hash");

			// Assert
			expect(result).not.toBeNull();
			expect(result?.guid).toBe("test-guid-123");
		});

		it("should return null for non-existent hash", async () => {
			// Arrange
			mockSql.mockResolvedValueOnce([]);

			// Act
			const result = await repository.findByTorrentHash("non-existent");

			// Assert
			expect(result).toBeNull();
		});
	});

	describe("updateDiscordMessageId", () => {
		it("should update discord message id", async () => {
			// Arrange
			mockSql.mockResolvedValueOnce([]);

			// Act
			await repository.updateDiscordMessageId("test-guid-123", "msg-456");

			// Assert
			expect(mockSql).toHaveBeenCalled();
		});
	});

	describe("updateTorrentHash", () => {
		it("should update torrent hash", async () => {
			// Arrange
			mockSql.mockResolvedValueOnce([]);

			// Act
			await repository.updateTorrentHash("test-guid-123", "newhash");

			// Assert
			expect(mockSql).toHaveBeenCalled();
		});
	});

	describe("updateDownloadStarted", () => {
		it("should set download_started_at", async () => {
			// Arrange
			mockSql.mockResolvedValueOnce([]);

			// Act
			await repository.updateDownloadStarted("test-guid-123");

			// Assert
			expect(mockSql).toHaveBeenCalled();
		});
	});

	describe("updateDownloadCompleted", () => {
		it("should set download_completed_at", async () => {
			// Arrange
			mockSql.mockResolvedValueOnce([]);

			// Act
			await repository.updateDownloadCompleted("test-guid-123");

			// Assert
			expect(mockSql).toHaveBeenCalled();
		});
	});

	describe("deleteAll", () => {
		it("should delete all games and return count", async () => {
			// Arrange
			mockSql.mockResolvedValueOnce([{ count: 3 }]);
			mockSql.mockResolvedValueOnce([]);

			// Act
			const count = await repository.deleteAll();

			// Assert
			expect(count).toBe(3);
		});

		it("should return 0 when no games exist", async () => {
			// Arrange
			mockSql.mockResolvedValueOnce([{ count: 0 }]);
			mockSql.mockResolvedValueOnce([]);

			// Act
			const count = await repository.deleteAll();

			// Assert
			expect(count).toBe(0);
		});
	});
});
