import { Database } from "bun:sqlite";
import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";
import { existsSync, readFileSync, unlinkSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { ILogger } from "@xmer/consumer-shared";
import { DuplicateGameError } from "../errors/index.js";
import type { FitGirlRelease } from "../types/index.js";
import { GamesRepository } from "./games.repository.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const TEST_DB_PATH = "/tmp/test-games-repo.db";

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

describe("GamesRepository", () => {
	let db: Database;
	let repository: GamesRepository;

	beforeEach(() => {
		if (existsSync(TEST_DB_PATH)) {
			unlinkSync(TEST_DB_PATH);
		}

		db = new Database(TEST_DB_PATH, { create: true });
		db.exec("PRAGMA foreign_keys = ON");

		const schemaPath = join(__dirname, "..", "database", "schema.sql");
		const schema = readFileSync(schemaPath, "utf-8");
		db.exec(schema);

		repository = new GamesRepository({ db, logger: mockLogger });
	});

	afterEach(() => {
		db.close();
		if (existsSync(TEST_DB_PATH)) {
			unlinkSync(TEST_DB_PATH);
		}
	});

	describe("create", () => {
		it("should create a new game record", async () => {
			// Arrange
			const release = createMockRelease();

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
			expect(result.updated_at).not.toBeNull();
		});

		it("should create game without steam data", async () => {
			// Arrange
			const release = createMockRelease({ steam: null });

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
			await repository.create(release, "channel-123");

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
			const release = createMockRelease();
			await repository.create(release, "channel-123");

			// Act
			const result = await repository.findByGuid("test-guid-123");

			// Assert
			expect(result).not.toBeNull();
			expect(result?.game_name).toBe("Test Game");
		});

		it("should return null for non-existent guid", async () => {
			// Act
			const result = await repository.findByGuid("non-existent");

			// Assert
			expect(result).toBeNull();
		});
	});

	describe("findByTorrentHash", () => {
		it("should find game by torrent hash", async () => {
			// Arrange
			const release = createMockRelease();
			await repository.create(release, "channel-123");
			await repository.updateTorrentHash("test-guid-123", "abc123hash");

			// Act
			const result = await repository.findByTorrentHash("abc123hash");

			// Assert
			expect(result).not.toBeNull();
			expect(result?.guid).toBe("test-guid-123");
		});

		it("should return null for non-existent hash", async () => {
			// Act
			const result = await repository.findByTorrentHash("non-existent");

			// Assert
			expect(result).toBeNull();
		});
	});

	describe("updateDiscordMessageId", () => {
		it("should update discord message id", async () => {
			// Arrange
			const release = createMockRelease();
			await repository.create(release, "channel-123");

			// Act
			await repository.updateDiscordMessageId("test-guid-123", "msg-456");

			// Assert
			const game = await repository.findByGuid("test-guid-123");
			expect(game?.discord_message_id).toBe("msg-456");
		});
	});

	describe("updateTorrentHash", () => {
		it("should update torrent hash", async () => {
			// Arrange
			const release = createMockRelease();
			await repository.create(release, "channel-123");

			// Act
			await repository.updateTorrentHash("test-guid-123", "newhash");

			// Assert
			const game = await repository.findByTorrentHash("newhash");
			expect(game).not.toBeNull();
		});
	});

	describe("updateDownloadStarted", () => {
		it("should set download_started_at", async () => {
			// Arrange
			const release = createMockRelease();
			await repository.create(release, "channel-123");

			// Act
			await repository.updateDownloadStarted("test-guid-123");

			// Assert
			const game = await repository.findByGuid("test-guid-123");
			expect(game?.download_started_at).not.toBeNull();
		});
	});

	describe("updateDownloadCompleted", () => {
		it("should set download_completed_at", async () => {
			// Arrange
			const release = createMockRelease();
			await repository.create(release, "channel-123");

			// Act
			await repository.updateDownloadCompleted("test-guid-123");

			// Assert
			const game = await repository.findByGuid("test-guid-123");
			expect(game?.download_completed_at).not.toBeNull();
		});
	});

	describe("deleteAll", () => {
		it("should delete all games and return count", async () => {
			// Arrange
			await repository.create(createMockRelease({ guid: "guid-1" }), "channel");
			await repository.create(createMockRelease({ guid: "guid-2" }), "channel");
			await repository.create(createMockRelease({ guid: "guid-3" }), "channel");

			// Act
			const count = await repository.deleteAll();

			// Assert
			expect(count).toBe(3);
			expect(await repository.findByGuid("guid-1")).toBeNull();
			expect(await repository.findByGuid("guid-2")).toBeNull();
			expect(await repository.findByGuid("guid-3")).toBeNull();
		});

		it("should return 0 when no games exist", async () => {
			// Act
			const count = await repository.deleteAll();

			// Assert
			expect(count).toBe(0);
		});
	});
});
