import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { ILogger } from "@xmer/consumer-shared";
import postgres, { type Sql } from "postgres";
import { DatabaseError } from "../errors/index.js";
import type { DatabaseManagerOptions, IDatabaseManager } from "../types/index.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

export class DatabaseManager implements IDatabaseManager {
	private readonly connectionString: string;
	private readonly logger: ILogger;
	private sql: Sql | null = null;

	constructor(options: DatabaseManagerOptions) {
		this.connectionString = options.connectionString;
		this.logger = options.logger.child({ component: "DatabaseManager" });
	}

	async initialize(): Promise<void> {
		try {
			this.sql = postgres(this.connectionString, {
				max: 10,
				idle_timeout: 20,
				connect_timeout: 10,
			});

			// Test connection
			await this.sql`SELECT 1`;

			// Run schema
			const schemaPath = join(__dirname, "schema.sql");
			const schema = readFileSync(schemaPath, "utf-8");

			// Split schema into statements and execute each
			const statements = schema
				.split(";")
				.map((s) => s.trim())
				.filter((s) => s.length > 0 && !s.startsWith("--"));

			for (const statement of statements) {
				await this.sql.unsafe(statement);
			}

			this.logger.info("Database initialized");
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			throw new DatabaseError(
				`Failed to initialize database: ${message}`,
				"initialize",
				{ connectionString: this.connectionString.replace(/:[^@]+@/, ":***@") },
			);
		}
	}

	getSql(): Sql {
		if (!this.sql) {
			throw new DatabaseError(
				"Database not initialized. Call initialize() first.",
				"getSql",
			);
		}
		return this.sql;
	}

	async close(): Promise<void> {
		if (this.sql) {
			await this.sql.end();
			this.sql = null;
			this.logger.info("Database closed");
		}
	}
}
