import { ConfigurationError } from "@xmer/consumer-shared";

export class Config {
	readonly rabbitmqUrl: string;
	readonly redisUrl: string;
	readonly discordChannelId: string;
	readonly postgresUrl: string;
	readonly progressThrottleMs: number;
	readonly lokiHost: string | undefined;
	readonly logLevel: string;

	constructor(env: Record<string, string | undefined> = process.env) {
		this.rabbitmqUrl = this.requireEnv(env, "RABBITMQ_URL");
		this.redisUrl = this.requireEnv(env, "REDIS_URL");
		this.discordChannelId = this.requireEnv(env, "DISCORD_CHANNEL_ID");
		this.postgresUrl = this.requireEnv(env, "POSTGRES_URL");
		this.progressThrottleMs = this.parseNumber(env.PROGRESS_THROTTLE_MS, 30000);
		this.lokiHost = env.LOKI_HOST;
		this.logLevel = env.LOG_LEVEL ?? "info";
	}

	private requireEnv(
		env: Record<string, string | undefined>,
		key: string,
	): string {
		const value = env[key];
		if (!value) {
			throw new ConfigurationError(
				`Missing required environment variable: ${key}`,
				key,
			);
		}
		return value;
	}

	private parseNumber(value: string | undefined, defaultValue: number): number {
		if (!value) return defaultValue;
		const parsed = Number.parseInt(value, 10);
		return Number.isNaN(parsed) ? defaultValue : parsed;
	}
}
