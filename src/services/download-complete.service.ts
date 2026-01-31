import type { ILogger } from "@xmer/consumer-shared";
import type {
	DownloadCompleteMessage,
	DownloadCompleteServiceOptions,
	IDiscordEmbedFormatter,
	IDiscordPublisher,
	IDownloadCompleteService,
	IGamesRepository,
	IRatingsRepository,
} from "../types/index.js";

export class DownloadCompleteService implements IDownloadCompleteService {
	private readonly gamesRepository: IGamesRepository;
	private readonly ratingsRepository: IRatingsRepository;
	private readonly discordPublisher: IDiscordPublisher;
	private readonly formatter: IDiscordEmbedFormatter;
	private readonly logger: ILogger;

	constructor(options: DownloadCompleteServiceOptions) {
		this.gamesRepository = options.gamesRepository;
		this.ratingsRepository = options.ratingsRepository;
		this.discordPublisher = options.discordPublisher;
		this.formatter = options.formatter;
		this.logger = options.logger.child({
			component: "DownloadCompleteService",
		});
	}

	async handleComplete(complete: DownloadCompleteMessage): Promise<void> {
		// Find game by torrent hash
		const game = await this.gamesRepository.findByTorrentHash(complete.hash);
		if (!game) {
			this.logger.debug("No game found for torrent hash", {
				hash: complete.hash,
			});
			return;
		}

		// Update database
		await this.gamesRepository.updateDownloadCompleted(game.guid);

		// Get ratings and format message
		const ratings = await this.ratingsRepository.getCountsByGameId(game.id);
		const updatedGame = await this.gamesRepository.findByGuid(game.guid);

		if (updatedGame) {
			const message = this.formatter.formatDownloadComplete(
				updatedGame,
				ratings,
			);
			await this.discordPublisher.sendPost(message);
		}

		this.logger.info("Download complete", {
			guid: game.guid,
			game_name: game.game_name,
		});
	}
}
