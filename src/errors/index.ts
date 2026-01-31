export class GameNotFoundError extends Error {
	constructor(
		public readonly guid: string,
		message = `Game not found: ${guid}`,
	) {
		super(message);
		this.name = "GameNotFoundError";
	}
}

export class InvalidSteamUrlError extends Error {
	constructor(
		public readonly url: string,
		message = `Invalid Steam URL: ${url}`,
	) {
		super(message);
		this.name = "InvalidSteamUrlError";
	}
}

export class DatabaseError extends Error {
	constructor(
		message: string,
		public readonly operation: string,
		public readonly context?: Record<string, unknown>,
	) {
		super(message);
		this.name = "DatabaseError";
	}
}

export class DuplicateGameError extends Error {
	constructor(
		public readonly guid: string,
		message = `Game already exists: ${guid}`,
	) {
		super(message);
		this.name = "DuplicateGameError";
	}
}
