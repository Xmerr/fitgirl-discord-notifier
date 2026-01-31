import { beforeEach, describe, expect, it, mock } from "bun:test";
import type { ILogger } from "@xmer/consumer-shared";
import type { Redis } from "ioredis";
import { ProgressThrottler } from "./progress-throttler.js";

const mockLogger: ILogger = {
	debug: mock(() => {}),
	info: mock(() => {}),
	warn: mock(() => {}),
	error: mock(() => {}),
	child: mock(() => mockLogger),
};

describe("ProgressThrottler", () => {
	let mockRedis: {
		exists: ReturnType<typeof mock>;
		setex: ReturnType<typeof mock>;
		quit: ReturnType<typeof mock>;
	};
	let throttler: ProgressThrottler;

	beforeEach(() => {
		mockRedis = {
			exists: mock(() => Promise.resolve(0)),
			setex: mock(() => Promise.resolve("OK")),
			quit: mock(() => Promise.resolve("OK")),
		};

		throttler = new ProgressThrottler({
			redis: mockRedis as unknown as Redis,
			throttleMs: 30000,
			logger: mockLogger,
		});
	});

	describe("shouldUpdate", () => {
		it("should return true when key does not exist", async () => {
			// Arrange
			mockRedis.exists.mockResolvedValue(0);

			// Act
			const result = await throttler.shouldUpdate("test-guid");

			// Assert
			expect(result).toBe(true);
			expect(mockRedis.exists).toHaveBeenCalledWith(
				"fitgirl:throttle:test-guid",
			);
		});

		it("should return false when key exists", async () => {
			// Arrange
			mockRedis.exists.mockResolvedValue(1);

			// Act
			const result = await throttler.shouldUpdate("test-guid");

			// Assert
			expect(result).toBe(false);
		});
	});

	describe("markUpdated", () => {
		it("should set key with correct TTL", async () => {
			// Act
			await throttler.markUpdated("test-guid");

			// Assert
			expect(mockRedis.setex).toHaveBeenCalledWith(
				"fitgirl:throttle:test-guid",
				30,
				"1",
			);
		});

		it("should calculate TTL correctly for different throttle values", async () => {
			// Arrange
			const customThrottler = new ProgressThrottler({
				redis: mockRedis as unknown as Redis,
				throttleMs: 60000,
				logger: mockLogger,
			});

			// Act
			await customThrottler.markUpdated("test-guid");

			// Assert
			expect(mockRedis.setex).toHaveBeenCalledWith(
				"fitgirl:throttle:test-guid",
				60,
				"1",
			);
		});
	});

	describe("disconnect", () => {
		it("should call redis quit", async () => {
			// Act
			await throttler.disconnect();

			// Assert
			expect(mockRedis.quit).toHaveBeenCalled();
		});
	});
});
