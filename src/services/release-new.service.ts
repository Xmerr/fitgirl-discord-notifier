import type { ILogger } from "@xmer/consumer-shared";
import { DuplicateGameError } from "../errors/index.js";
import type {
	FitGirlRelease,
	IDiscordEmbedFormatter,
	IDiscordPublisher,
	IGamesRepository,
	IReleaseNewService,
	ReleaseNewServiceOptions,
} from "../types/index.js";

export class ReleaseNewService implements IReleaseNewService {
	private readonly gamesRepository: IGamesRepository;
	private readonly discordPublisher: IDiscordPublisher;
	private readonly formatter: IDiscordEmbedFormatter;
	private readonly channelId: string;
	private readonly logger: ILogger;

	constructor(options: ReleaseNewServiceOptions) {
		this.gamesRepository = options.gamesRepository;
		this.discordPublisher = options.discordPublisher;
		this.formatter = options.formatter;
		this.channelId = options.channelId;
		this.logger = options.logger.child({ component: "ReleaseNewService" });
	}

	async processRelease(release: FitGirlRelease): Promise<void> {
		this.logger.info("Processing new release", {
			guid: release.guid,
			game_name: release.game_name,
		});

		// Check for duplicate
		const existing = await this.gamesRepository.findByGuid(release.guid);
		if (existing) {
			this.logger.info("Release already exists, skipping", {
				guid: release.guid,
			});
			throw new DuplicateGameError(release.guid);
		}

		// Store in database
		await this.gamesRepository.create(release, this.channelId);

		// Format and send Discord message
		const message = this.formatter.formatRelease(release);
		await this.discordPublisher.sendPost(message);

		this.logger.info("Release posted to Discord", {
			guid: release.guid,
			game_name: release.game_name,
		});
	}
}
