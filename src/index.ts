import {
	ConnectionManager,
	DlqHandler,
	createLogger,
} from "@xmer/consumer-shared";
import { Redis } from "ioredis";
import { Config } from "./config/config.js";
import { ButtonInteractionConsumer } from "./consumers/button-interaction.consumer.js";
import { DownloadCompleteConsumer } from "./consumers/download-complete.consumer.js";
import { DownloadProgressConsumer } from "./consumers/download-progress.consumer.js";
import { ModalInteractionConsumer } from "./consumers/modal-interaction.consumer.js";
import { ReleaseNewConsumer } from "./consumers/release-new.consumer.js";
import { ResetConsumer } from "./consumers/reset.consumer.js";
import { DatabaseManager } from "./database/database.js";
import { DiscordEmbedFormatter } from "./formatters/discord-embed.formatter.js";
import { DiscordPublisher } from "./publishers/discord.publisher.js";
import { QbittorrentPublisher } from "./publishers/qbittorrent.publisher.js";
import { CorrectionsRepository } from "./repositories/corrections.repository.js";
import { GamesRepository } from "./repositories/games.repository.js";
import { RatingsRepository } from "./repositories/ratings.repository.js";
import { ButtonInteractionService } from "./services/button-interaction.service.js";
import { DownloadCompleteService } from "./services/download-complete.service.js";
import { DownloadProgressService } from "./services/download-progress.service.js";
import { ModalInteractionService } from "./services/modal-interaction.service.js";
import { ReleaseNewService } from "./services/release-new.service.js";
import { ResetService } from "./services/reset.service.js";
import { ProgressThrottler } from "./state/progress-throttler.js";

async function main(): Promise<void> {
	const config = new Config();

	const logger = createLogger({
		job: "fitgirl-discord-notifier",
		environment: process.env.NODE_ENV ?? "production",
		level: config.logLevel as "debug" | "info" | "warn" | "error",
		loki: config.lokiHost ? { host: config.lokiHost } : undefined,
	});

	logger.info("Starting fitgirl-discord-notifier");

	// Initialize database
	const databaseManager = new DatabaseManager({
		path: config.databasePath,
		logger,
	});
	await databaseManager.initialize();

	// Initialize Redis
	const redis = new Redis(config.redisUrl);
	redis.on("error", (error: Error) => {
		logger.error("Redis connection error", { error: error.message });
	});
	redis.on("connect", () => {
		logger.info("Connected to Redis");
	});

	// Initialize progress throttler
	const progressThrottler = new ProgressThrottler({
		redis,
		throttleMs: config.progressThrottleMs,
		logger,
	});

	// Connect to RabbitMQ
	const connectionManager = new ConnectionManager({
		url: config.rabbitmqUrl,
		logger,
	});
	await connectionManager.connect();

	const channel = connectionManager.getChannel();

	// Initialize repositories
	const db = databaseManager.getDb();
	const gamesRepository = new GamesRepository({ db, logger });
	const ratingsRepository = new RatingsRepository({ db, logger });
	const correctionsRepository = new CorrectionsRepository({ db, logger });

	// Initialize formatter
	const formatter = new DiscordEmbedFormatter({
		channelId: config.discordChannelId,
	});

	// Initialize publishers
	const discordPublisher = new DiscordPublisher({
		channel,
		exchange: "discord",
		logger,
	});

	const qbittorrentPublisher = new QbittorrentPublisher({
		channel,
		exchange: "qbittorrent",
		logger,
	});

	// Initialize services
	const releaseNewService = new ReleaseNewService({
		gamesRepository,
		discordPublisher,
		formatter,
		channelId: config.discordChannelId,
		logger,
	});

	const buttonInteractionService = new ButtonInteractionService({
		gamesRepository,
		ratingsRepository,
		qbittorrentPublisher,
		discordPublisher,
		formatter,
		logger,
	});

	const modalInteractionService = new ModalInteractionService({
		gamesRepository,
		correctionsRepository,
		discordPublisher,
		logger,
	});

	const downloadProgressService = new DownloadProgressService({
		gamesRepository,
		ratingsRepository,
		discordPublisher,
		formatter,
		progressThrottler,
		logger,
	});

	const downloadCompleteService = new DownloadCompleteService({
		gamesRepository,
		ratingsRepository,
		discordPublisher,
		formatter,
		logger,
	});

	const resetService = new ResetService({
		gamesRepository,
		logger,
	});

	// Initialize DLQ handlers
	const releaseNewDlqHandler = new DlqHandler({
		channel,
		exchange: "fitgirl",
		queue: "fitgirl.release.new.discord-notifier",
		serviceName: "fitgirl-discord-notifier",
		logger,
	});

	const buttonInteractionDlqHandler = new DlqHandler({
		channel,
		exchange: "discord",
		queue: "discord.interaction.button.fitgirl",
		serviceName: "fitgirl-discord-notifier",
		logger,
	});

	const modalInteractionDlqHandler = new DlqHandler({
		channel,
		exchange: "discord",
		queue: "discord.interaction.modal.fitgirl",
		serviceName: "fitgirl-discord-notifier",
		logger,
	});

	const downloadProgressDlqHandler = new DlqHandler({
		channel,
		exchange: "qbittorrent",
		queue: "qbittorrent.downloads.progress.fitgirl",
		serviceName: "fitgirl-discord-notifier",
		logger,
	});

	const downloadCompleteDlqHandler = new DlqHandler({
		channel,
		exchange: "qbittorrent",
		queue: "qbittorrent.downloads.complete.fitgirl",
		serviceName: "fitgirl-discord-notifier",
		logger,
	});

	const resetDlqHandler = new DlqHandler({
		channel,
		exchange: "fitgirl",
		queue: "fitgirl.reset.discord-notifier",
		serviceName: "fitgirl-discord-notifier",
		logger,
	});

	// Initialize consumers
	const releaseNewConsumer = new ReleaseNewConsumer({
		channel,
		exchange: "fitgirl",
		queue: "fitgirl.release.new.discord-notifier",
		routingKey: "release.new",
		dlqHandler: releaseNewDlqHandler,
		logger,
		releaseNewService,
	});

	const buttonInteractionConsumer = new ButtonInteractionConsumer({
		channel,
		exchange: "discord",
		queue: "discord.interaction.button.fitgirl",
		routingKey: "interaction.button",
		dlqHandler: buttonInteractionDlqHandler,
		logger,
		buttonInteractionService,
	});

	const modalInteractionConsumer = new ModalInteractionConsumer({
		channel,
		exchange: "discord",
		queue: "discord.interaction.modal.fitgirl",
		routingKey: "interaction.modal",
		dlqHandler: modalInteractionDlqHandler,
		logger,
		modalInteractionService,
	});

	const downloadProgressConsumer = new DownloadProgressConsumer({
		channel,
		exchange: "qbittorrent",
		queue: "qbittorrent.downloads.progress.fitgirl",
		routingKey: "downloads.progress",
		dlqHandler: downloadProgressDlqHandler,
		logger,
		downloadProgressService,
	});

	const downloadCompleteConsumer = new DownloadCompleteConsumer({
		channel,
		exchange: "qbittorrent",
		queue: "qbittorrent.downloads.complete.fitgirl",
		routingKey: "downloads.complete",
		dlqHandler: downloadCompleteDlqHandler,
		logger,
		downloadCompleteService,
	});

	const resetConsumer = new ResetConsumer({
		channel,
		exchange: "fitgirl",
		queue: "fitgirl.reset.discord-notifier",
		routingKey: "reset",
		dlqHandler: resetDlqHandler,
		logger,
		resetService,
	});

	// Start consumers
	await releaseNewConsumer.start();
	await buttonInteractionConsumer.start();
	await modalInteractionConsumer.start();
	await downloadProgressConsumer.start();
	await downloadCompleteConsumer.start();
	await resetConsumer.start();

	logger.info("fitgirl-discord-notifier is running");

	// Shutdown handler
	const shutdown = async (): Promise<void> => {
		logger.info("Shutting down...");

		await releaseNewConsumer.stop();
		await buttonInteractionConsumer.stop();
		await modalInteractionConsumer.stop();
		await downloadProgressConsumer.stop();
		await downloadCompleteConsumer.stop();
		await resetConsumer.stop();

		await new Promise((resolve) => setTimeout(resolve, 2000));

		await connectionManager.close();
		await progressThrottler.disconnect();
		databaseManager.close();

		logger.info("Shutdown complete");
		process.exit(0);
	};

	process.on("SIGTERM", () => void shutdown());
	process.on("SIGINT", () => void shutdown());
}

main().catch((error) => {
	console.error("Fatal error:", error);
	process.exit(1);
});
