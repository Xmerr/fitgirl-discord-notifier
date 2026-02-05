import { describe, expect, it } from "bun:test";
import type {
	DownloadProgressMessage,
	FitGirlRelease,
	GameRecord,
} from "../types/index.js";
import { DiscordEmbedFormatter } from "./discord-embed.formatter.js";

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
	genres: ["Lossless Repack", "Action", "RPG"],
	magnet_link: "magnet:?xt=urn:btih:abc123",
	steam: {
		app_id: 12345,
		name: "Test Game",
		steam_url: "https://store.steampowered.com/app/12345",
		release_date: "2024-01-01",
		price: "$59.99",
		ratings: {
			total_positive: 900,
			total_negative: 100,
			review_score_desc: "Very Positive",
		},
		categories: ["Single-player"],
		media: {
			header_image: "https://cdn.steam.com/header.jpg",
		},
	},
	...overrides,
});

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
	torrent_hash: "abc123hash",
	discord_message_id: "msg-123",
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
	steam_categories: '["Single-player"]',
	steam_review_score: null,
	steam_review_desc: "Very Positive",
	steam_total_positive: 900,
	steam_total_negative: 100,
	rating: null,
	...overrides,
});

describe("DiscordEmbedFormatter", () => {
	const formatter = new DiscordEmbedFormatter({ channelId: "default-channel" });

	describe("formatRelease", () => {
		it("should format release with all fields", () => {
			// Arrange
			const release = createMockRelease();

			// Act
			const result = formatter.formatRelease(release);

			// Assert
			expect(result.id).toBe("test-guid-123");
			expect(result.channel_id).toBe("default-channel");
			expect(result.embed?.title).toBe("Test Game");
			expect(result.embed?.url).toBe("https://fitgirl-repacks.site/test-game/");
			expect(result.embed?.color).toBe(0x00ff00);
			expect(result.embed?.thumbnail?.url).toBe(
				"https://cdn.steam.com/header.jpg",
			);
		});

		it("should include size field", () => {
			// Arrange
			const release = createMockRelease();

			// Act
			const result = formatter.formatRelease(release);

			// Assert
			const sizeField = result.embed?.fields?.find((f) => f.name === "Size");
			expect(sizeField?.value).toBe("22 GB (45 GB original)");
		});

		it("should include version field when present", () => {
			// Arrange
			const release = createMockRelease({ version: "v2.0" });

			// Act
			const result = formatter.formatRelease(release);

			// Assert
			const versionField = result.embed?.fields?.find(
				(f) => f.name === "Version",
			);
			expect(versionField?.value).toBe("v2.0");
		});

		it("should include DLC count when present", () => {
			// Arrange
			const release = createMockRelease({ dlcs_included: true, dlc_count: 5 });

			// Act
			const result = formatter.formatRelease(release);

			// Assert
			const dlcField = result.embed?.fields?.find((f) => f.name === "DLCs");
			expect(dlcField?.value).toBe("5 included");
		});

		it("should include Steam reviews when present", () => {
			// Arrange
			const release = createMockRelease();

			// Act
			const result = formatter.formatRelease(release);

			// Assert
			const reviewsField = result.embed?.fields?.find(
				(f) => f.name === "Steam Reviews",
			);
			expect(reviewsField?.value).toContain("Very Positive");
			expect(reviewsField?.value).toContain("90%");
		});

		it("should filter out Lossless Repack from genres", () => {
			// Arrange
			const release = createMockRelease({
				genres: ["Lossless Repack", "Action", "RPG"],
			});

			// Act
			const result = formatter.formatRelease(release);

			// Assert
			const genresField = result.embed?.fields?.find(
				(f) => f.name === "Genres",
			);
			expect(genresField?.value).toBe("Action, RPG");
		});

		it("should include download button when magnet link present", () => {
			// Arrange
			const release = createMockRelease();

			// Act
			const result = formatter.formatRelease(release);

			// Assert
			const buttons = result.components?.[0]?.components ?? [];
			const downloadBtn = buttons.find((b) => b.label === "Download");
			expect(downloadBtn).toBeDefined();
			expect(downloadBtn?.custom_id).toBe("fitgirl_download_test-guid-123");
		});

		it("should include rating buttons without count labels", () => {
			// Arrange
			const release = createMockRelease();

			// Act
			const result = formatter.formatRelease(release);

			// Assert
			const buttons = result.components?.[0]?.components ?? [];
			const upvoteBtn = buttons.find(
				(b) => b.custom_id === "fitgirl_upvote_test-guid-123",
			);
			const downvoteBtn = buttons.find(
				(b) => b.custom_id === "fitgirl_downvote_test-guid-123",
			);
			expect(upvoteBtn).toBeDefined();
			expect(upvoteBtn?.label).toBeUndefined();
			expect(upvoteBtn?.emoji?.name).toBe("👍");
			expect(downvoteBtn).toBeDefined();
			expect(downvoteBtn?.label).toBeUndefined();
			expect(downvoteBtn?.emoji?.name).toBe("👎");
		});

		it("should include Steam link in description when steam data present", () => {
			// Arrange
			const release = createMockRelease();

			// Act
			const result = formatter.formatRelease(release);

			// Assert
			expect(result.embed?.description).toContain(
				"[Steam](https://store.steampowered.com/app/12345)",
			);
			expect(result.embed?.description).toContain("[FitGirl](");
		});

		it("should include screenshot as main image when available", () => {
			// Arrange
			const release = createMockRelease({
				steam: {
					app_id: 12345,
					name: "Test Game",
					steam_url: "https://store.steampowered.com/app/12345",
					media: {
						header_image: "https://cdn.steam.com/header.jpg",
						screenshots: [
							"https://cdn.steam.com/screenshot1.jpg",
							"https://cdn.steam.com/screenshot2.jpg",
						],
					},
				},
			});

			// Act
			const result = formatter.formatRelease(release);

			// Assert
			expect(result.embed?.image?.url).toBe(
				"https://cdn.steam.com/screenshot1.jpg",
			);
			expect(result.embed?.thumbnail?.url).toBe(
				"https://cdn.steam.com/header.jpg",
			);
		});

		it("should handle release without steam data", () => {
			// Arrange
			const release = createMockRelease({ steam: null });

			// Act
			const result = formatter.formatRelease(release);

			// Assert
			expect(result.embed?.thumbnail).toBeUndefined();
			expect(result.embed?.image).toBeUndefined();
			expect(result.embed?.description).toBe(
				"[FitGirl](https://fitgirl-repacks.site/test-game/)",
			);
		});

		it("should not include Steam/FitGirl buttons in components", () => {
			// Arrange
			const release = createMockRelease();

			// Act
			const result = formatter.formatRelease(release);

			// Assert
			const buttons = result.components?.[0]?.components ?? [];
			const steamBtn = buttons.find((b) => b.label === "Steam");
			const fitgirlBtn = buttons.find((b) => b.label === "FitGirl");
			expect(steamBtn).toBeUndefined();
			expect(fitgirlBtn).toBeUndefined();
		});
	});

	describe("formatProgressUpdate", () => {
		it("should format progress update correctly", () => {
			// Arrange
			const game = createMockGame();
			const progress: DownloadProgressMessage = {
				hash: "abc123",
				name: "Test Game",
				progress: 0.5,
				download_speed: 10485760, // 10 MB/s
				eta: 3600,
				state: "downloading",
				category: "games",
			};

			// Act
			const result = formatter.formatProgressUpdate(game, progress);

			// Assert
			expect(result.id).toBe("test-guid-123");
			expect(result.embed?.color).toBe(0xffaa00);
			const statusField = result.embed?.fields?.find(
				(f) => f.name === "Status",
			);
			expect(statusField?.value).toBe("Downloading... 50%");
		});

		it("should format speed correctly", () => {
			// Arrange
			const game = createMockGame();
			const progress: DownloadProgressMessage = {
				hash: "abc123",
				name: "Test Game",
				progress: 0.25,
				download_speed: 5242880, // 5 MB/s
				eta: 7200,
				state: "downloading",
			};

			// Act
			const result = formatter.formatProgressUpdate(game, progress);

			// Assert
			const speedField = result.embed?.fields?.find((f) => f.name === "Speed");
			expect(speedField?.value).toBe("5.00 MB/s");
		});

		it("should format ETA correctly", () => {
			// Arrange
			const game = createMockGame();
			const progress: DownloadProgressMessage = {
				hash: "abc123",
				name: "Test Game",
				progress: 0.75,
				download_speed: 1048576,
				eta: 3665, // 1h 1m 5s
				state: "downloading",
			};

			// Act
			const result = formatter.formatProgressUpdate(game, progress);

			// Assert
			const etaField = result.embed?.fields?.find((f) => f.name === "ETA");
			expect(etaField?.value).toBe("1h 1m");
		});

		it("should show Unknown for invalid ETA", () => {
			// Arrange
			const game = createMockGame();
			const progress: DownloadProgressMessage = {
				hash: "abc123",
				name: "Test Game",
				progress: 0.1,
				download_speed: 1048576,
				eta: 8640000,
				state: "downloading",
			};

			// Act
			const result = formatter.formatProgressUpdate(game, progress);

			// Assert
			const etaField = result.embed?.fields?.find((f) => f.name === "ETA");
			expect(etaField?.value).toBe("Unknown");
		});

		it("should include rating in progress update", () => {
			// Arrange
			const game = createMockGame({ rating: "upvote" });
			const progress: DownloadProgressMessage = {
				hash: "abc123",
				name: "Test Game",
				progress: 0.5,
				download_speed: 1048576,
				eta: 100,
				state: "downloading",
			};

			// Act
			const result = formatter.formatProgressUpdate(game, progress);

			// Assert
			const ratingField = result.embed?.fields?.find(
				(f) => f.name === "Rating",
			);
			expect(ratingField?.value).toContain("Upvoted");
		});
	});

	describe("formatDownloadComplete", () => {
		it("should format completion correctly", () => {
			// Arrange
			const game = createMockGame({
				download_completed_at: "2024-01-15T13:00:00Z",
			});

			// Act
			const result = formatter.formatDownloadComplete(game);

			// Assert
			expect(result.embed?.color).toBe(0x00aaff);
			const statusField = result.embed?.fields?.find(
				(f) => f.name === "Status",
			);
			expect(statusField?.value).toBe("Download Complete");
		});

		it("should disable download button", () => {
			// Arrange
			const game = createMockGame();

			// Act
			const result = formatter.formatDownloadComplete(game);

			// Assert
			const buttons = result.components?.[0]?.components ?? [];
			const downloadBtn = buttons.find((b) => b.label === "Downloaded");
			expect(downloadBtn?.disabled).toBe(true);
		});
	});

	describe("formatDownloadStarted", () => {
		it("should format download started correctly", () => {
			// Arrange
			const game = createMockGame({
				download_started_at: "2024-01-15T12:30:00Z",
			});

			// Act
			const result = formatter.formatDownloadStarted(game);

			// Assert
			expect(result.embed?.color).toBe(0xffaa00);
			const statusField = result.embed?.fields?.find(
				(f) => f.name === "Status",
			);
			expect(statusField?.value).toBe("Download Started...");
		});

		it("should use game channel_id over default", () => {
			// Arrange
			const game = createMockGame({ discord_channel_id: "custom-channel" });

			// Act
			const result = formatter.formatDownloadStarted(game);

			// Assert
			expect(result.channel_id).toBe("custom-channel");
		});
	});
});
