import type { ILogger } from "@xmer/consumer-shared";
import type { Redis } from "ioredis";
import type {
	IProgressThrottler,
	ProgressThrottlerOptions,
} from "../types/index.js";

const KEY_PREFIX = "fitgirl:throttle:";

export class ProgressThrottler implements IProgressThrottler {
	private readonly redis: Redis;
	private readonly throttleMs: number;
	private readonly logger: ILogger;

	constructor(options: ProgressThrottlerOptions) {
		this.redis = options.redis;
		this.throttleMs = options.throttleMs;
		this.logger = options.logger.child({ component: "ProgressThrottler" });
	}

	async shouldUpdate(guid: string): Promise<boolean> {
		const key = `${KEY_PREFIX}${guid}`;
		const exists = await this.redis.exists(key);
		const shouldUpdate = exists === 0;

		this.logger.debug("Throttle check", { guid, shouldUpdate });
		return shouldUpdate;
	}

	async markUpdated(guid: string): Promise<void> {
		const key = `${KEY_PREFIX}${guid}`;
		const ttlSeconds = Math.ceil(this.throttleMs / 1000);
		await this.redis.setex(key, ttlSeconds, "1");

		this.logger.debug("Throttle marked", { guid, ttlSeconds });
	}

	async disconnect(): Promise<void> {
		await this.redis.quit();
		this.logger.info("Disconnected from Redis");
	}
}
