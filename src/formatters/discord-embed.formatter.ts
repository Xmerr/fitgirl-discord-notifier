import type {
	DiscordComponent,
	DiscordEmbed,
	DiscordEmbedFormatterOptions,
	DiscordPostMessage,
	DownloadProgressMessage,
	FitGirlRelease,
	GameRecord,
	IDiscordEmbedFormatter,
} from "../types/index.js";

const COLORS = {
	NEW_RELEASE: 0x00ff00, // Green
	DOWNLOADING: 0xffaa00, // Orange
	COMPLETED: 0x00aaff, // Blue
} as const;

const BUTTON_STYLES = {
	PRIMARY: 1,
	SECONDARY: 2,
	SUCCESS: 3,
	DANGER: 4,
	LINK: 5,
} as const;

export class DiscordEmbedFormatter implements IDiscordEmbedFormatter {
	private readonly channelId: string;

	constructor(options: DiscordEmbedFormatterOptions) {
		this.channelId = options.channelId;
	}

	formatRelease(release: FitGirlRelease): DiscordPostMessage {
		const embed = this.buildReleaseEmbed(release);
		const components = this.buildReleaseComponents(release);

		return {
			id: release.guid,
			channel_id: this.channelId,
			embed,
			components,
			context: { guid: release.guid },
		};
	}

	formatProgressUpdate(
		game: GameRecord,
		progress: DownloadProgressMessage,
		ratings: { upvotes: number; downvotes: number },
	): DiscordPostMessage {
		const percentage = Math.round(progress.progress * 100);
		const speedMBps = (progress.download_speed / (1024 * 1024)).toFixed(2);
		const etaFormatted = this.formatEta(progress.eta);

		const embed: DiscordEmbed = {
			title: game.game_name,
			url: game.fitgirl_url,
			color: COLORS.DOWNLOADING,
			fields: [
				{
					name: "Status",
					value: `Downloading... ${percentage}%`,
					inline: true,
				},
				{
					name: "Speed",
					value: `${speedMBps} MB/s`,
					inline: true,
				},
				{
					name: "ETA",
					value: etaFormatted,
					inline: true,
				},
				{
					name: "Size",
					value: `${game.size_repack} (${game.size_original} original)`,
					inline: false,
				},
				{
					name: "Ratings",
					value: this.formatRatings(ratings),
					inline: false,
				},
			],
		};

		if (game.steam_url) {
			embed.thumbnail = {
				url: `https://cdn.cloudflare.steamstatic.com/steam/apps/${game.steam_app_id}/header.jpg`,
			};
		}

		const components = this.buildProgressComponents(game, true);

		return {
			id: game.guid,
			channel_id: game.discord_channel_id ?? this.channelId,
			embed,
			components,
			context: { guid: game.guid },
		};
	}

	formatDownloadComplete(
		game: GameRecord,
		ratings: { upvotes: number; downvotes: number },
	): DiscordPostMessage {
		const embed: DiscordEmbed = {
			title: game.game_name,
			url: game.fitgirl_url,
			color: COLORS.COMPLETED,
			fields: [
				{
					name: "Status",
					value: "Download Complete",
					inline: true,
				},
				{
					name: "Size",
					value: `${game.size_repack} (${game.size_original} original)`,
					inline: true,
				},
				{
					name: "Ratings",
					value: this.formatRatings(ratings),
					inline: false,
				},
			],
		};

		if (game.steam_url) {
			embed.thumbnail = {
				url: `https://cdn.cloudflare.steamstatic.com/steam/apps/${game.steam_app_id}/header.jpg`,
			};
		}

		const components = this.buildProgressComponents(game, false);

		return {
			id: game.guid,
			channel_id: game.discord_channel_id ?? this.channelId,
			embed,
			components,
			context: { guid: game.guid },
		};
	}

	formatDownloadStarted(
		game: GameRecord,
		ratings: { upvotes: number; downvotes: number },
	): DiscordPostMessage {
		const embed: DiscordEmbed = {
			title: game.game_name,
			url: game.fitgirl_url,
			color: COLORS.DOWNLOADING,
			fields: [
				{
					name: "Status",
					value: "Download Started...",
					inline: true,
				},
				{
					name: "Size",
					value: `${game.size_repack} (${game.size_original} original)`,
					inline: true,
				},
				{
					name: "Ratings",
					value: this.formatRatings(ratings),
					inline: false,
				},
			],
		};

		if (game.steam_url) {
			embed.thumbnail = {
				url: `https://cdn.cloudflare.steamstatic.com/steam/apps/${game.steam_app_id}/header.jpg`,
			};
		}

		const components = this.buildProgressComponents(game, true);

		return {
			id: game.guid,
			channel_id: game.discord_channel_id ?? this.channelId,
			embed,
			components,
			context: { guid: game.guid },
		};
	}

	private buildReleaseEmbed(release: FitGirlRelease): DiscordEmbed {
		const fields: DiscordEmbed["fields"] = [
			{
				name: "Size",
				value: `${release.size_repack} (${release.size_original} original)`,
				inline: true,
			},
		];

		if (release.version) {
			fields.push({
				name: "Version",
				value: release.version,
				inline: true,
			});
		}

		if (release.dlcs_included && release.dlc_count) {
			fields.push({
				name: "DLCs",
				value: `${release.dlc_count} included`,
				inline: true,
			});
		}

		if (release.steam?.ratings) {
			const { total_positive, total_negative, review_score_desc } =
				release.steam.ratings;
			const total = total_positive + total_negative;
			const percentage =
				total > 0 ? Math.round((total_positive / total) * 100) : 0;
			fields.push({
				name: "Steam Reviews",
				value: `${review_score_desc} (${percentage}% of ${total.toLocaleString()})`,
				inline: false,
			});
		}

		if (release.genres && release.genres.length > 0) {
			const genresFiltered = release.genres.filter(
				(g) => g !== "Lossless Repack",
			);
			if (genresFiltered.length > 0) {
				fields.push({
					name: "Genres",
					value: genresFiltered.join(", "),
					inline: false,
				});
			}
		}

		// Build description with links
		const links: string[] = [];
		if (release.steam?.steam_url) {
			links.push(`[Steam](${release.steam.steam_url})`);
		}
		links.push(`[FitGirl](${release.fitgirl_url})`);

		const embed: DiscordEmbed = {
			title: release.game_name,
			url: release.fitgirl_url,
			description: links.join(" | "),
			color: COLORS.NEW_RELEASE,
			fields,
			timestamp: release.pub_date,
			footer: {
				text: "FitGirl Repacks",
			},
		};

		if (release.steam?.media.header_image) {
			embed.thumbnail = { url: release.steam.media.header_image };
		}

		// Use first screenshot as main image if available
		const firstScreenshot = release.steam?.media.screenshots?.[0];
		if (firstScreenshot) {
			embed.image = { url: firstScreenshot };
		}

		return embed;
	}

	private buildReleaseComponents(release: FitGirlRelease): DiscordComponent[] {
		const buttons: DiscordComponent[] = [];

		if (release.magnet_link) {
			buttons.push({
				type: 2,
				style: BUTTON_STYLES.PRIMARY,
				label: "Download",
				custom_id: `fitgirl_download_${release.guid}`,
			});
		}

		buttons.push(
			{
				type: 2,
				style: BUTTON_STYLES.SUCCESS,
				custom_id: `fitgirl_upvote_${release.guid}`,
				emoji: { name: "👍" },
			},
			{
				type: 2,
				style: BUTTON_STYLES.DANGER,
				custom_id: `fitgirl_downvote_${release.guid}`,
				emoji: { name: "👎" },
			},
		);

		return [{ type: 1, components: buttons }];
	}

	private buildProgressComponents(
		game: GameRecord,
		downloading: boolean,
	): DiscordComponent[] {
		const buttons: DiscordComponent[] = [];

		buttons.push(
			{
				type: 2,
				style: BUTTON_STYLES.SECONDARY,
				label: downloading ? "Downloading..." : "Downloaded",
				custom_id: `fitgirl_download_${game.guid}`,
				disabled: true,
			},
			{
				type: 2,
				style: BUTTON_STYLES.SUCCESS,
				custom_id: `fitgirl_upvote_${game.guid}`,
				emoji: { name: "👍" },
			},
			{
				type: 2,
				style: BUTTON_STYLES.DANGER,
				custom_id: `fitgirl_downvote_${game.guid}`,
				emoji: { name: "👎" },
			},
		);

		return [{ type: 1, components: buttons }];
	}

	private formatEta(seconds: number): string {
		if (seconds <= 0 || seconds === 8640000) return "Unknown";

		const hours = Math.floor(seconds / 3600);
		const minutes = Math.floor((seconds % 3600) / 60);
		const secs = seconds % 60;

		if (hours > 0) {
			return `${hours}h ${minutes}m`;
		}
		if (minutes > 0) {
			return `${minutes}m ${secs}s`;
		}
		return `${secs}s`;
	}

	private formatRatings(ratings: {
		upvotes: number;
		downvotes: number;
	}): string {
		return `👍 ${ratings.upvotes} | 👎 ${ratings.downvotes}`;
	}
}
