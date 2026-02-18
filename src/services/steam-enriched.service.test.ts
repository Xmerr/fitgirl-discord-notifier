import { beforeEach, describe, expect, it, mock } from "bun:test";
import type { ILogger } from "@xmer/consumer-shared";
import type {
	IGamesRepository,
	SteamData,
	SteamEnrichedMessage,
} from "../types/index.js";
import { SteamEnrichedService } from "./steam-enriched.service.js";

describe("SteamEnrichedService", () => {
	const mockLogger: ILogger = {
		debug: mock(() => {}),
		info: mock(() => {}),
		warn: mock(() => {}),
		error: mock(() => {}),
		child: mock(() => mockLogger),
	};

	let service: SteamEnrichedService;
	let mockGamesRepository: { updateSteamData: ReturnType<typeof mock> };

	const sampleSteamData: SteamData = {
		app_id: 12345,
		name: "Test Game",
		steam_url: "https://store.steampowered.com/app/12345",
		price: "$29.99",
		ratings: {
			total_positive: 1000,
			total_negative: 100,
			review_score_desc: "Very Positive",
		},
		categories: ["Single-player"],
		media: {
			header_image: "https://cdn.steam.com/header.jpg",
		},
	};

	beforeEach(() => {
		mockGamesRepository = {
			updateSteamData: mock(() => Promise.resolve()),
		};

		service = new SteamEnrichedService({
			gamesRepository: mockGamesRepository as unknown as IGamesRepository,
			logger: mockLogger,
		});
	});

	describe("handleEnriched", () => {
		it("should update steam data in repository", async () => {
			// Arrange
			const message: SteamEnrichedMessage = {
				gameId: 42,
				steam: sampleSteamData,
				timestamp: "2024-01-01T00:00:00Z",
			};

			// Act
			await service.handleEnriched(message);

			// Assert
			expect(mockGamesRepository.updateSteamData).toHaveBeenCalledWith(
				42,
				sampleSteamData,
			);
		});

		it("should update with null steam when not found", async () => {
			// Arrange
			const message: SteamEnrichedMessage = {
				gameId: 42,
				steam: null,
				timestamp: "2024-01-01T00:00:00Z",
			};

			// Act
			await service.handleEnriched(message);

			// Assert
			expect(mockGamesRepository.updateSteamData).toHaveBeenCalledWith(
				42,
				null,
			);
		});
	});
});
