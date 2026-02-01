import type { Database } from "bun:sqlite";
import type {
	BaseConsumerOptions,
	ILogger,
	IPublisher,
} from "@xmer/consumer-shared";
import type { Channel } from "amqplib";
import type { Redis } from "ioredis";

// FitGirl Release (from fitgirl-rss-reader)
export interface SteamRatings {
	total_positive: number;
	total_negative: number;
	review_score_desc: string;
}

export interface SteamMovie {
	id: number;
	name: string;
	thumbnail: string;
	webm_480?: string;
	webm_max?: string;
}

export interface SteamMedia {
	header_image?: string;
	screenshots?: string[];
	movies?: SteamMovie[];
}

export interface SteamData {
	app_id: number;
	name: string;
	steam_url: string;
	release_date?: string;
	price?: string;
	ratings?: SteamRatings;
	categories?: string[];
	media: SteamMedia;
}

export interface FitGirlRelease {
	guid: string;
	title_raw: string;
	game_name: string;
	version?: string;
	dlcs_included: boolean;
	dlc_count?: number;
	fitgirl_url: string;
	pub_date: string;
	size_original: string;
	size_repack: string;
	genres?: string[];
	magnet_link?: string;
	steam: SteamData | null;
}

// Discord Interaction Messages
export interface ButtonInteractionMessage {
	custom_id: string;
	user_id: string;
	user_name: string;
	channel_id: string;
	guild_id?: string;
	message_id: string;
	correlation_id: string;
	context?: Record<string, unknown>;
	interaction_id: string;
	interaction_token: string;
}

export interface ModalInteractionMessage {
	custom_id: string;
	user_id: string;
	user_name: string;
	channel_id: string;
	guild_id?: string;
	correlation_id?: string;
	interaction_id: string;
	interaction_token: string;
	inputs: Record<string, string>;
}

// qBittorrent Messages
export interface DownloadProgressMessage {
	hash: string;
	name: string;
	progress: number;
	download_speed: number;
	eta: number;
	state: string;
	category?: string;
	save_path?: string;
}

export interface DownloadCompleteMessage {
	hash: string;
	name: string;
	save_path: string;
	category?: string;
	total_size: number;
}

// Database Models
export interface GameRecord {
	id: number;
	guid: string;
	game_name: string;
	title_raw: string;
	fitgirl_url: string;
	steam_app_id: number | null;
	steam_url: string | null;
	steam_name: string | null;
	magnet_link: string | null;
	torrent_hash: string | null;
	discord_message_id: string | null;
	discord_channel_id: string | null;
	size_original: string;
	size_repack: string;
	pub_date: string;
	download_started_at: string | null;
	download_completed_at: string | null;
	created_at: string;
}

export interface RatingRecord {
	id: number;
	game_id: number;
	user_id: string;
	rating: "upvote" | "downvote";
	created_at: string;
	updated_at: string;
}

export interface SteamCorrectionRecord {
	id: number;
	game_id: number;
	user_id: string;
	original_steam_url: string | null;
	corrected_steam_url: string;
	created_at: string;
}

// Discord Embed Types
export interface DiscordEmbed {
	title?: string;
	description?: string;
	url?: string;
	color?: number;
	fields?: Array<{ name: string; value: string; inline?: boolean }>;
	thumbnail?: { url: string };
	image?: { url: string };
	footer?: { text: string; icon_url?: string };
	timestamp?: string;
}

export interface DiscordComponent {
	type: number;
	components?: DiscordComponent[];
	style?: number;
	label?: string;
	custom_id?: string;
	url?: string;
	disabled?: boolean;
	emoji?: { name: string; id?: string };
}

export interface DiscordPostMessage {
	id: string;
	channel_id: string;
	content?: string;
	embed?: DiscordEmbed;
	components?: DiscordComponent[];
	context?: Record<string, unknown>;
}

// qBittorrent Add Download
// Must match qbittorrent-consumer's DownloadAddMessage contract
export interface QbittorrentAddDownload {
	id: string;
	magnetLink: string;
	category: "sonarr" | "radarr" | "games";
}

// Service Interfaces
export interface IReleaseNewService {
	processRelease(release: FitGirlRelease): Promise<void>;
}

export interface IButtonInteractionService {
	handleInteraction(message: ButtonInteractionMessage): Promise<void>;
}

export interface IDownloadProgressService {
	handleProgress(message: DownloadProgressMessage): Promise<void>;
}

export interface IDownloadCompleteService {
	handleComplete(message: DownloadCompleteMessage): Promise<void>;
}

export interface IModalInteractionService {
	handleModalSubmission(message: ModalInteractionMessage): Promise<void>;
}

// Repository Interfaces
export interface IGamesRepository {
	create(release: FitGirlRelease, channelId: string): Promise<GameRecord>;
	findByGuid(guid: string): Promise<GameRecord | null>;
	findByTorrentHash(hash: string): Promise<GameRecord | null>;
	updateDiscordMessageId(guid: string, messageId: string): Promise<void>;
	updateTorrentHash(guid: string, hash: string): Promise<void>;
	updateDownloadStarted(guid: string): Promise<void>;
	updateDownloadCompleted(guid: string): Promise<void>;
	deleteAll(): Promise<number>;
}

export interface IRatingsRepository {
	upsert(
		gameId: number,
		userId: string,
		rating: "upvote" | "downvote",
	): Promise<void>;
	getCountsByGameId(
		gameId: number,
	): Promise<{ upvotes: number; downvotes: number }>;
}

export interface ICorrectionsRepository {
	create(
		gameId: number,
		userId: string,
		originalUrl: string | null,
		correctedUrl: string,
	): Promise<void>;
}

// Publisher Interfaces
export interface IDiscordPublisher extends IPublisher {
	sendPost(message: DiscordPostMessage): Promise<void>;
	sendInteractionResponse(
		interactionId: string,
		interactionToken: string,
		content: string,
		ephemeral?: boolean,
	): Promise<void>;
}

export interface IQbittorrentPublisher extends IPublisher {
	addDownload(download: QbittorrentAddDownload): Promise<void>;
}

// State Interfaces
export interface IProgressThrottler {
	shouldUpdate(guid: string): Promise<boolean>;
	markUpdated(guid: string): Promise<void>;
	disconnect(): Promise<void>;
}

// Formatter Interface
export interface IDiscordEmbedFormatter {
	formatRelease(release: FitGirlRelease): DiscordPostMessage;
	formatProgressUpdate(
		game: GameRecord,
		progress: DownloadProgressMessage,
		ratings: { upvotes: number; downvotes: number },
	): DiscordPostMessage;
	formatDownloadComplete(
		game: GameRecord,
		ratings: { upvotes: number; downvotes: number },
	): DiscordPostMessage;
	formatDownloadStarted(
		game: GameRecord,
		ratings: { upvotes: number; downvotes: number },
	): DiscordPostMessage;
}

// Database Interface
export interface IDatabaseManager {
	initialize(): Promise<void>;
	getDb(): Database;
	close(): void;
}

// Constructor Options
export interface ReleaseNewConsumerOptions extends BaseConsumerOptions {
	releaseNewService: IReleaseNewService;
}

export interface ButtonInteractionConsumerOptions extends BaseConsumerOptions {
	buttonInteractionService: IButtonInteractionService;
}

export interface DownloadProgressConsumerOptions extends BaseConsumerOptions {
	downloadProgressService: IDownloadProgressService;
}

export interface DownloadCompleteConsumerOptions extends BaseConsumerOptions {
	downloadCompleteService: IDownloadCompleteService;
}

export interface ModalInteractionConsumerOptions extends BaseConsumerOptions {
	modalInteractionService: IModalInteractionService;
}

export interface ReleaseNewServiceOptions {
	gamesRepository: IGamesRepository;
	discordPublisher: IDiscordPublisher;
	formatter: IDiscordEmbedFormatter;
	channelId: string;
	logger: ILogger;
}

export interface ButtonInteractionServiceOptions {
	gamesRepository: IGamesRepository;
	ratingsRepository: IRatingsRepository;
	qbittorrentPublisher: IQbittorrentPublisher;
	discordPublisher: IDiscordPublisher;
	formatter: IDiscordEmbedFormatter;
	logger: ILogger;
}

export interface DownloadProgressServiceOptions {
	gamesRepository: IGamesRepository;
	ratingsRepository: IRatingsRepository;
	discordPublisher: IDiscordPublisher;
	formatter: IDiscordEmbedFormatter;
	progressThrottler: IProgressThrottler;
	logger: ILogger;
}

export interface DownloadCompleteServiceOptions {
	gamesRepository: IGamesRepository;
	ratingsRepository: IRatingsRepository;
	discordPublisher: IDiscordPublisher;
	formatter: IDiscordEmbedFormatter;
	logger: ILogger;
}

export interface ModalInteractionServiceOptions {
	gamesRepository: IGamesRepository;
	correctionsRepository: ICorrectionsRepository;
	discordPublisher: IDiscordPublisher;
	logger: ILogger;
}

export interface PublisherOptions {
	channel: Channel;
	exchange: string;
	logger: ILogger;
}

export interface ProgressThrottlerOptions {
	redis: Redis;
	throttleMs: number;
	logger: ILogger;
}

export interface GamesRepositoryOptions {
	db: Database;
	logger: ILogger;
}

export interface RatingsRepositoryOptions {
	db: Database;
	logger: ILogger;
}

export interface CorrectionsRepositoryOptions {
	db: Database;
	logger: ILogger;
}

export interface DatabaseManagerOptions {
	path: string;
	logger: ILogger;
}

export interface DiscordEmbedFormatterOptions {
	channelId: string;
}

// Reset Message Types
export interface ResetMessage {
	source: string;
	timestamp: string;
	target?: "rss-reader" | "discord-notifier" | "all";
	reason?: string;
}

export interface IResetService {
	handleReset(message: ResetMessage): Promise<void>;
}

export interface ResetServiceOptions {
	gamesRepository: IGamesRepository;
	logger: ILogger;
}

export interface ResetConsumerOptions extends BaseConsumerOptions {
	resetService: IResetService;
}
