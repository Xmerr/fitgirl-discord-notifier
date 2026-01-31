import { BasePublisher } from "@xmer/consumer-shared";
import type { DiscordPostMessage, IDiscordPublisher } from "../types/index.js";

export class DiscordPublisher
	extends BasePublisher
	implements IDiscordPublisher
{
	async sendPost(message: DiscordPostMessage): Promise<void> {
		await this.publish(
			"post.send",
			message as unknown as Record<string, unknown>,
		);
	}
}
