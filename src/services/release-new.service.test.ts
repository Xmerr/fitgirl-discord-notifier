import { beforeEach, describe, expect, it, mock } from "bun:test";
import type { ILogger } from "@xmer/consumer-shared";
import { DuplicateGameError } from "../errors/index.js";
import type {
	FitGirlRelease,
	GameRecord,
	IDiscordEmbedFormatter,
	IDiscordPublisher,
	IGamesRepository,
} from "../types/index.js";
import { ReleaseNewService } from "./release-new.service.js";

const mockLogger: ILogger = {
	debug: mock(() => {}),
	info: mock(() => {}),
	warn: mock(() => {}),
	error: mock(() => {}),
	child: mock(() => mockLogger),
};

const createMockRelease = (): FitGirlRelease => ({
	guid: "test-guid-123",
	title_raw: "Test Game – v1.0",
	game_name: "Test Game",
	fitgirl_url: "https://fitgirl-repacks.site/test-game/",
	pub_date: "2024-01-15T12:00:00.000Z",
	size_original: "45 GB",
	size_repack: "22 GB",
	dlcs_included: false,
	steam: null,
});

const createMockGameRecord = (): GameRecord => ({
	id: 1,
	guid: "test-guid-123",
	game_name: "Test Game",
	title_raw: "Test Game – v1.0",
	fitgirl_url: "https://fitgirl-repacks.site/test-game/",
	steam_app_id: null,
	steam_url: null,
	steam_name: null,
	magnet_link: null,
	torrent_hash: null,
	discord_message_id: null,
	discord_channel_id: "channel-123",
	size_original: "45 GB",
	size_repack: "22 GB",
	pub_date: "2024-01-15T12:00:00.000Z",
	download_started_at: null,
	download_completed_at: null,
	created_at: "2024-01-15T12:00:00.000Z",
});

describe("ReleaseNewService", () => {
	let mockGamesRepository: {
		create: ReturnType<typeof mock>;
		findByGuid: ReturnType<typeof mock>;
	};
	let mockDiscordPublisher: {
		sendPost: ReturnType<typeof mock>;
	};
	let mockFormatter: {
		formatRelease: ReturnType<typeof mock>;
	};
	let service: ReleaseNewService;

	beforeEach(() => {
		mockGamesRepository = {
			create: mock(() => Promise.resolve(createMockGameRecord())),
			findByGuid: mock(() => Promise.resolve(null)),
		};

		mockDiscordPublisher = {
			sendPost: mock(() => Promise.resolve()),
		};

		mockFormatter = {
			formatRelease: mock(() => ({
				id: "test-guid-123",
				channel_id: "channel-123",
				embed: { title: "Test Game" },
			})),
		};

		service = new ReleaseNewService({
			gamesRepository: mockGamesRepository as unknown as IGamesRepository,
			discordPublisher: mockDiscordPublisher as unknown as IDiscordPublisher,
			formatter: mockFormatter as unknown as IDiscordEmbedFormatter,
			channelId: "channel-123",
			logger: mockLogger,
		});
	});

	describe("processRelease", () => {
		it("should store release and post to Discord", async () => {
			// Arrange
			const release = createMockRelease();

			// Act
			await service.processRelease(release);

			// Assert
			expect(mockGamesRepository.findByGuid).toHaveBeenCalledWith(
				"test-guid-123",
			);
			expect(mockGamesRepository.create).toHaveBeenCalledWith(
				release,
				"channel-123",
			);
			expect(mockFormatter.formatRelease).toHaveBeenCalledWith(release);
			expect(mockDiscordPublisher.sendPost).toHaveBeenCalled();
		});

		it("should throw DuplicateGameError for existing release", async () => {
			// Arrange
			const release = createMockRelease();
			mockGamesRepository.findByGuid.mockResolvedValue(createMockGameRecord());

			// Act & Assert
			await expect(service.processRelease(release)).rejects.toThrow(
				DuplicateGameError,
			);
			expect(mockGamesRepository.create).not.toHaveBeenCalled();
			expect(mockDiscordPublisher.sendPost).not.toHaveBeenCalled();
		});

		it("should not create or post if duplicate exists", async () => {
			// Arrange
			const release = createMockRelease();
			mockGamesRepository.findByGuid.mockResolvedValue(createMockGameRecord());

			// Act
			try {
				await service.processRelease(release);
			} catch {
				// Expected
			}

			// Assert
			expect(mockGamesRepository.create).not.toHaveBeenCalled();
		});
	});
});
