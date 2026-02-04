import { Database } from "bun:sqlite";
import { existsSync, readFileSync, readdirSync } from "node:fs";
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

			// Run migrations for existing databases
			this.runMigrations();

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

	private runMigrations(): void {
		if (!this.db) return;

		// Create migrations table if it doesn't exist
		this.db.exec(`
			CREATE TABLE IF NOT EXISTS _migrations (
				id INTEGER PRIMARY KEY AUTOINCREMENT,
				name TEXT NOT NULL UNIQUE,
				applied_at TEXT NOT NULL DEFAULT (datetime('now'))
			)
		`);

		const migrationsDir = join(__dirname, "migrations");
		if (!existsSync(migrationsDir)) {
			return;
		}

		const migrationFiles = readdirSync(migrationsDir)
			.filter((f) => f.endsWith(".sql"))
			.sort();

		for (const file of migrationFiles) {
			const applied = this.db
				.prepare("SELECT 1 FROM _migrations WHERE name = ?")
				.get(file);

			if (!applied) {
				const migrationPath = join(migrationsDir, file);
				const migration = readFileSync(migrationPath, "utf-8");

				// Execute each statement separately to handle ALTER TABLE failures gracefully
				const statements = migration
					.split(";")
					.map((s) => s.trim())
					.filter((s) => s.length > 0 && !s.startsWith("--"));

				for (const statement of statements) {
					try {
						this.db.exec(statement);
					} catch (err) {
						// Ignore "duplicate column" errors from ALTER TABLE
						const msg = err instanceof Error ? err.message : String(err);
						if (!msg.includes("duplicate column name")) {
							throw err;
						}
					}
				}

				this.db
					.prepare("INSERT INTO _migrations (name) VALUES (?)")
					.run(file);
				this.logger.info("Migration applied", { migration: file });
			}
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
