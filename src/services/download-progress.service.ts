import type { ILogger } from "@xmer/consumer-shared";
import type {
	DownloadProgressMessage,
	DownloadProgressServiceOptions,
	IDiscordEmbedFormatter,
	IDiscordPublisher,
	IDownloadProgressService,
	IGamesRepository,
	IProgressThrottler,
} from "../types/index.js";

export class DownloadProgressService implements IDownloadProgressService {
	private readonly gamesRepository: IGamesRepository;
	private readonly discordPublisher: IDiscordPublisher;
	private readonly formatter: IDiscordEmbedFormatter;
	private readonly progressThrottler: IProgressThrottler;
	private readonly logger: ILogger;

	constructor(options: DownloadProgressServiceOptions) {
		this.gamesRepository = options.gamesRepository;
		this.discordPublisher = options.discordPublisher;
		this.formatter = options.formatter;
		this.progressThrottler = options.progressThrottler;
		this.logger = options.logger.child({
			component: "DownloadProgressService",
		});
	}

	async handleProgress(progress: DownloadProgressMessage): Promise<void> {
		// Find game by torrent hash
		const game = await this.gamesRepository.findByTorrentHash(progress.hash);
		if (!game) {
			this.logger.debug("No game found for torrent hash", {
				hash: progress.hash,
			});
			return;
		}

		// Check throttle
		const shouldUpdate = await this.progressThrottler.shouldUpdate(game.guid);
		if (!shouldUpdate) {
			this.logger.debug("Throttled, skipping update", { guid: game.guid });
			return;
		}

		// Mark throttle
		await this.progressThrottler.markUpdated(game.guid);

		// Format message
		const message = this.formatter.formatProgressUpdate(game, progress);

		// Update Discord
		await this.discordPublisher.sendPost(message);

		this.logger.info("Progress update sent", {
			guid: game.guid,
			progress: Math.round(progress.progress * 100),
		});
	}
}
