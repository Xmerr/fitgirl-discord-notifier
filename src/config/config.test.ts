import { describe, expect, it } from "bun:test";
import { Config } from "./config.js";

describe("Config", () => {
	it("should load required environment variables", () => {
		// Arrange
		const env = {
			RABBITMQ_URL: "amqp://localhost:5672",
			REDIS_URL: "redis://localhost:6379",
			DISCORD_CHANNEL_ID: "123456789",
			POSTGRES_URL: "postgres://localhost/fitgirl",
		};

		// Act
		const config = new Config(env);

		// Assert
		expect(config.rabbitmqUrl).toBe("amqp://localhost:5672");
		expect(config.redisUrl).toBe("redis://localhost:6379");
		expect(config.discordChannelId).toBe("123456789");
		expect(config.postgresUrl).toBe("postgres://localhost/fitgirl");
	});

	it("should use default values for optional environment variables", () => {
		// Arrange
		const env = {
			RABBITMQ_URL: "amqp://localhost:5672",
			REDIS_URL: "redis://localhost:6379",
			DISCORD_CHANNEL_ID: "123456789",
			POSTGRES_URL: "postgres://localhost/fitgirl",
		};

		// Act
		const config = new Config(env);

		// Assert
		expect(config.progressThrottleMs).toBe(30000);
		expect(config.lokiHost).toBeUndefined();
		expect(config.logLevel).toBe("info");
	});

	it("should use custom values for optional environment variables", () => {
		// Arrange
		const env = {
			RABBITMQ_URL: "amqp://localhost:5672",
			REDIS_URL: "redis://localhost:6379",
			DISCORD_CHANNEL_ID: "123456789",
			POSTGRES_URL: "postgres://localhost/fitgirl",
			PROGRESS_THROTTLE_MS: "60000",
			LOKI_HOST: "http://loki:3101",
			LOG_LEVEL: "debug",
		};

		// Act
		const config = new Config(env);

		// Assert
		expect(config.progressThrottleMs).toBe(60000);
		expect(config.lokiHost).toBe("http://loki:3101");
		expect(config.logLevel).toBe("debug");
	});

	it("should throw ConfigurationError for missing RABBITMQ_URL", () => {
		// Arrange
		const env = {
			REDIS_URL: "redis://localhost:6379",
			DISCORD_CHANNEL_ID: "123456789",
			POSTGRES_URL: "postgres://localhost/fitgirl",
		};

		// Act & Assert
		expect(() => new Config(env)).toThrow(
			"Missing required environment variable: RABBITMQ_URL",
		);
	});

	it("should throw ConfigurationError for missing REDIS_URL", () => {
		// Arrange
		const env = {
			RABBITMQ_URL: "amqp://localhost:5672",
			DISCORD_CHANNEL_ID: "123456789",
			POSTGRES_URL: "postgres://localhost/fitgirl",
		};

		// Act & Assert
		expect(() => new Config(env)).toThrow(
			"Missing required environment variable: REDIS_URL",
		);
	});

	it("should throw ConfigurationError for missing DISCORD_CHANNEL_ID", () => {
		// Arrange
		const env = {
			RABBITMQ_URL: "amqp://localhost:5672",
			REDIS_URL: "redis://localhost:6379",
			POSTGRES_URL: "postgres://localhost/fitgirl",
		};

		// Act & Assert
		expect(() => new Config(env)).toThrow(
			"Missing required environment variable: DISCORD_CHANNEL_ID",
		);
	});

	it("should throw ConfigurationError for missing POSTGRES_URL", () => {
		// Arrange
		const env = {
			RABBITMQ_URL: "amqp://localhost:5672",
			REDIS_URL: "redis://localhost:6379",
			DISCORD_CHANNEL_ID: "123456789",
		};

		// Act & Assert
		expect(() => new Config(env)).toThrow(
			"Missing required environment variable: POSTGRES_URL",
		);
	});

	it("should use default value for invalid PROGRESS_THROTTLE_MS", () => {
		// Arrange
		const env = {
			RABBITMQ_URL: "amqp://localhost:5672",
			REDIS_URL: "redis://localhost:6379",
			DISCORD_CHANNEL_ID: "123456789",
			POSTGRES_URL: "postgres://localhost/fitgirl",
			PROGRESS_THROTTLE_MS: "invalid",
		};

		// Act
		const config = new Config(env);

		// Assert
		expect(config.progressThrottleMs).toBe(30000);
	});
});
