import type {
	BaseConsumerOptions,
	ILogger,
	IPublisher,
} from "@xmer/consumer-shared";
import type { Channel } from "amqplib";
import type { Redis } from "ioredis";
import type { Sql } from "postgres";

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
	corrected_name: string | null;
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
	updated_at: string;
	// Steam enrichment data
	steam_header_image: string | null;
	steam_price: string | null;
	steam_categories: string | null;
	steam_review_score: string | null;
	steam_review_desc: string | null;
	steam_total_positive: number | null;
	steam_total_negative: number | null;
	// Single rating per game
	rating: "upvote" | "downvote" | null;
	// Steam refresh tracking
	steam_refreshed_at: string | null;
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
	updateRating(guid: string, rating: "upvote" | "downvote"): Promise<void>;
	updateSteamData(id: number, steam: SteamData | null): Promise<void>;
	deleteAll(): Promise<number>;
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
	): DiscordPostMessage;
	formatDownloadComplete(game: GameRecord): DiscordPostMessage;
	formatDownloadStarted(game: GameRecord): DiscordPostMessage;
}

// Database Interface
export interface IDatabaseManager {
	initialize(): Promise<void>;
	getSql(): Sql;
	close(): Promise<void>;
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
	qbittorrentPublisher: IQbittorrentPublisher;
	discordPublisher: IDiscordPublisher;
	formatter: IDiscordEmbedFormatter;
	logger: ILogger;
}

export interface DownloadProgressServiceOptions {
	gamesRepository: IGamesRepository;
	discordPublisher: IDiscordPublisher;
	formatter: IDiscordEmbedFormatter;
	progressThrottler: IProgressThrottler;
	logger: ILogger;
}

export interface DownloadCompleteServiceOptions {
	gamesRepository: IGamesRepository;
	discordPublisher: IDiscordPublisher;
	formatter: IDiscordEmbedFormatter;
	logger: ILogger;
}

export interface ModalInteractionServiceOptions {
	gamesRepository: IGamesRepository;
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
	sql: Sql;
	logger: ILogger;
}

export interface DatabaseManagerOptions {
	connectionString: string;
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

// Steam Enriched Types
export interface SteamEnrichedMessage {
	gameId: number;
	steam: SteamData | null;
	timestamp: string;
}

export interface ISteamEnrichedService {
	handleEnriched(message: SteamEnrichedMessage): Promise<void>;
}

export interface SteamEnrichedServiceOptions {
	gamesRepository: IGamesRepository;
	logger: ILogger;
}

export interface SteamEnrichedConsumerOptions extends BaseConsumerOptions {
	steamEnrichedService: ISteamEnrichedService;
}
