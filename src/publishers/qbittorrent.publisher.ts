import { BasePublisher } from "@xmer/consumer-shared";
import type {
	IQbittorrentPublisher,
	QbittorrentAddDownload,
} from "../types/index.js";

export class QbittorrentPublisher
	extends BasePublisher
	implements IQbittorrentPublisher
{
	async addDownload(download: QbittorrentAddDownload): Promise<void> {
		await this.publish(
			"downloads.add",
			download as unknown as Record<string, unknown>,
		);
	}
}
