import type { ILogger } from "@xmer/consumer-shared";
import { GameNotFoundError, InvalidSteamUrlError } from "../errors/index.js";
import type {
	ICorrectionsRepository,
	IDiscordPublisher,
	IGamesRepository,
	IModalInteractionService,
	ModalInteractionMessage,
	ModalInteractionServiceOptions,
} from "../types/index.js";

const STEAM_URL_REGEX = /^https:\/\/store\.steampowered\.com\/app\/(\d+)/;

export class ModalInteractionService implements IModalInteractionService {
	private readonly gamesRepository: IGamesRepository;
	private readonly correctionsRepository: ICorrectionsRepository;
	private readonly discordPublisher: IDiscordPublisher;
	private readonly logger: ILogger;

	constructor(options: ModalInteractionServiceOptions) {
		this.gamesRepository = options.gamesRepository;
		this.correctionsRepository = options.correctionsRepository;
		this.discordPublisher = options.discordPublisher;
		this.logger = options.logger.child({
			component: "ModalInteractionService",
		});
	}

	async handleModalSubmission(message: ModalInteractionMessage): Promise<void> {
		const guid = this.parseGuidFromCustomId(message.custom_id);
		const steamUrl = message.inputs.steam_url;

		// Validate Steam URL is present (consumer should have validated this)
		if (!steamUrl) {
			throw new Error("Missing steam_url in inputs");
		}

		this.logger.info("Handling Steam URL correction modal", {
			guid,
			user_id: message.user_id,
		});

		// Validate Steam URL format
		const appId = this.extractSteamAppId(steamUrl);
		if (!appId) {
			await this.sendErrorResponse(
				message.interaction_id,
				message.interaction_token,
				"Invalid Steam URL format. Please provide a URL like: https://store.steampowered.com/app/123456",
			);
			throw new InvalidSteamUrlError(steamUrl);
		}

		// Find the game
		const game = await this.gamesRepository.findByGuid(guid);
		if (!game) {
			await this.sendErrorResponse(
				message.interaction_id,
				message.interaction_token,
				"Game not found. The original post may have been deleted.",
			);
			throw new GameNotFoundError(guid);
		}

		// Store the correction
		await this.correctionsRepository.create(
			game.id,
			message.user_id,
			game.steam_url,
			steamUrl,
		);

		this.logger.info("Steam URL correction stored", {
			guid,
			game_id: game.id,
			user_id: message.user_id,
			original_url: game.steam_url,
			corrected_url: steamUrl,
			steam_app_id: appId,
		});

		// Send success response
		await this.discordPublisher.sendInteractionResponse(
			message.interaction_id,
			message.interaction_token,
			`Steam URL correction recorded for "${game.game_name}". Thank you for helping improve our matching!`,
			true,
		);
	}

	private parseGuidFromCustomId(customId: string): string {
		// Format: fitgirl_fixsteam_modal_{guid}
		const prefix = "fitgirl_fixsteam_modal_";
		if (!customId.startsWith(prefix)) {
			throw new Error(`Invalid custom_id format: ${customId}`);
		}
		return customId.slice(prefix.length);
	}

	private extractSteamAppId(url: string): string | null {
		const match = url.match(STEAM_URL_REGEX);
		return match?.[1] ?? null;
	}

	private async sendErrorResponse(
		interactionId: string,
		interactionToken: string,
		errorMessage: string,
	): Promise<void> {
		await this.discordPublisher.sendInteractionResponse(
			interactionId,
			interactionToken,
			errorMessage,
			true,
		);
	}
}
