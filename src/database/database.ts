import { Database } from "bun:sqlite";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { ILogger } from "@xmer/consumer-shared";
import { DatabaseError } from "../errors/index.js";
import type {
	DatabaseManagerOptions,
	IDatabaseManager,
} from "../types/index.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

export class DatabaseManager implements IDatabaseManager {
	private readonly path: string;
	private readonly logger: ILogger;
	private db: Database | null = null;

	constructor(options: DatabaseManagerOptions) {
		this.path = options.path;
		this.logger = options.logger.child({ component: "DatabaseManager" });
	}

	async initialize(): Promise<void> {
		try {
			this.db = new Database(this.path, { create: true });
			this.db.exec("PRAGMA journal_mode = WAL");
			this.db.exec("PRAGMA foreign_keys = ON");

			const schemaPath = join(__dirname, "schema.sql");
			const schema = readFileSync(schemaPath, "utf-8");
			this.db.exec(schema);

			this.logger.info("Database initialized", { path: this.path });
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			throw new DatabaseError(
				`Failed to initialize database: ${message}`,
				"initialize",
				{ path: this.path },
			);
		}
	}

	getDb(): Database {
		if (!this.db) {
			throw new DatabaseError(
				"Database not initialized. Call initialize() first.",
				"getDb",
			);
		}
		return this.db;
	}

	close(): void {
		if (this.db) {
			this.db.close();
			this.db = null;
			this.logger.info("Database closed");
		}
	}
}
