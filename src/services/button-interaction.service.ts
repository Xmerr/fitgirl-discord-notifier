import type { ILogger } from "@xmer/consumer-shared";
import { GameNotFoundError } from "../errors/index.js";
import type {
	ButtonInteractionMessage,
	ButtonInteractionServiceOptions,
	DiscordPostMessage,
	IButtonInteractionService,
	IDiscordEmbedFormatter,
	IDiscordPublisher,
	IGamesRepository,
	IQbittorrentPublisher,
	IRatingsRepository,
} from "../types/index.js";

type ButtonAction = "download" | "upvote" | "downvote";

export class ButtonInteractionService implements IButtonInteractionService {
	private readonly gamesRepository: IGamesRepository;
	private readonly ratingsRepository: IRatingsRepository;
	private readonly qbittorrentPublisher: IQbittorrentPublisher;
	private readonly discordPublisher: IDiscordPublisher;
	private readonly formatter: IDiscordEmbedFormatter;
	private readonly logger: ILogger;

	constructor(options: ButtonInteractionServiceOptions) {
		this.gamesRepository = options.gamesRepository;
		this.ratingsRepository = options.ratingsRepository;
		this.qbittorrentPublisher = options.qbittorrentPublisher;
		this.discordPublisher = options.discordPublisher;
		this.formatter = options.formatter;
		this.logger = options.logger.child({
			component: "ButtonInteractionService",
		});
	}

	async handleInteraction(message: ButtonInteractionMessage): Promise<void> {
		const { action, guid } = this.parseCustomId(message.custom_id);

		this.logger.info("Handling button interaction", {
			action,
			guid,
			user_id: message.user_id,
		});

		const game = await this.gamesRepository.findByGuid(guid);
		if (!game) {
			throw new GameNotFoundError(guid);
		}

		switch (action) {
			case "download":
				await this.handleDownload(game.guid, message.user_id);
				break;
			case "upvote":
				await this.handleRating(game.id, game.guid, message.user_id, "upvote");
				break;
			case "downvote":
				await this.handleRating(
					game.id,
					game.guid,
					message.user_id,
					"downvote",
				);
				break;
		}
	}

	private parseCustomId(customId: string): {
		action: ButtonAction;
		guid: string;
	} {
		// Format: fitgirl_{action}_{guid}
		const parts = customId.split("_");
		if (parts.length < 3) {
			throw new Error(`Invalid custom_id format: ${customId}`);
		}

		const action = parts[1] as ButtonAction;
		const guid = parts.slice(2).join("_");

		if (!["download", "upvote", "downvote"].includes(action)) {
			throw new Error(`Unknown action: ${action}`);
		}

		return { action, guid };
	}

	private async handleDownload(guid: string, userId: string): Promise<void> {
		const game = await this.gamesRepository.findByGuid(guid);
		if (!game) {
			throw new GameNotFoundError(guid);
		}

		// Check if download already started
		if (game.download_started_at) {
			this.logger.info("Download already started, skipping", { guid });
			return;
		}

		if (!game.magnet_link) {
			this.logger.warn("No magnet link available", { guid });
			return;
		}

		// Publish download request to qBittorrent
		await this.qbittorrentPublisher.addDownload({
			magnet_link: game.magnet_link,
			category: "games",
			tags: [guid],
		});

		// Update database
		await this.gamesRepository.updateDownloadStarted(guid);

		// Update Discord message
		const ratings = await this.ratingsRepository.getCountsByGameId(game.id);
		const updatedGame = await this.gamesRepository.findByGuid(guid);
		if (updatedGame) {
			const message = this.formatter.formatDownloadStarted(
				updatedGame,
				ratings,
			);
			await this.discordPublisher.sendPost(message);
		}

		this.logger.info("Download initiated", { guid, user_id: userId });
	}

	private async handleRating(
		gameId: number,
		guid: string,
		userId: string,
		rating: "upvote" | "downvote",
	): Promise<void> {
		await this.ratingsRepository.upsert(gameId, userId, rating);

		// Get updated counts and update Discord message
		const ratings = await this.ratingsRepository.getCountsByGameId(gameId);
		const game = await this.gamesRepository.findByGuid(guid);

		if (game) {
			let message: DiscordPostMessage;
			if (game.download_completed_at) {
				message = this.formatter.formatDownloadComplete(game, ratings);
			} else if (game.download_started_at) {
				message = this.formatter.formatDownloadStarted(game, ratings);
			} else {
				// Re-send the original release format with updated ratings
				// For now, just update with download started format since we don't store full release data
				message = this.formatter.formatDownloadStarted(game, ratings);
			}
			await this.discordPublisher.sendPost(message);
		}

		this.logger.info("Rating recorded", { guid, user_id: userId, rating });
	}
}
