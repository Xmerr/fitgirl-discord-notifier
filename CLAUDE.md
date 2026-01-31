# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

FitGirl Discord Notifier is a multi-consumer microservice that bridges fitgirl-rss-reader with Discord and qBittorrent. It posts rich game release notifications with interactive buttons, handles download requests, tracks progress, and collects user ratings.

Uses [`@xmer/consumer-shared`](../consumer-shared/) for RabbitMQ connection management, base consumer/publisher abstractions, DLQ retry logic, logging, and common error classes.

## Commands

```bash
bun install              # Install dependencies
bun run build            # Compile TypeScript to dist/
bun run lint             # Run Biome linter/formatter
bun run lint:fix         # Auto-fix lint issues
bun run typecheck        # Run TypeScript type checking
bun test                 # Run all tests
bun run test:coverage    # Run tests with coverage (95% threshold)
bun run start            # Run service (requires .env file)
```

Run a single test file:
```bash
bun test src/services/release-new.service.test.ts
```

## Architecture

```
Message Flow:

Inbound (fitgirl-rss-reader -> Discord):
fitgirl.release.new ─────────► ReleaseNewConsumer ─────► Discord post

Inbound (Discord -> qBittorrent):
discord.interaction.button ──► ButtonInteractionConsumer ─► qbittorrent.downloads.add

Inbound (qBittorrent -> Discord):
qbittorrent.downloads.progress ─► DownloadProgressConsumer ─► Discord update
qbittorrent.downloads.complete ─► DownloadCompleteConsumer ─► Discord update

State:
SQLite: games, ratings, steam_corrections
Redis: progress throttling (30s default)
```

### Key Components

- **`src/index.ts`**: Service orchestration. Wires together all dependencies, initializes database, connects to RabbitMQ and Redis, starts consumers, and handles graceful shutdown.

- **`src/database/database.ts`**: SQLite database manager using Bun native `bun:sqlite`. Handles schema initialization.

- **`src/repositories/`**: Data access layer for SQLite tables.
  - `games.repository.ts` - Game records with download status
  - `ratings.repository.ts` - User ratings (one per user per game)
  - `corrections.repository.ts` - Steam URL corrections (future feature)

- **`src/consumers/`**: RabbitMQ consumers extending `BaseConsumer`.
  - `release-new.consumer.ts` - Handles new FitGirl releases
  - `button-interaction.consumer.ts` - Handles Discord button clicks (fitgirl_* prefix)
  - `download-progress.consumer.ts` - Handles qBittorrent progress (games category)
  - `download-complete.consumer.ts` - Handles qBittorrent completion (games category)

- **`src/services/`**: Business logic for each consumer.
  - `release-new.service.ts` - Store game, format embed, post to Discord
  - `button-interaction.service.ts` - Download/rating handling
  - `download-progress.service.ts` - Throttled progress updates
  - `download-complete.service.ts` - Completion notifications

- **`src/publishers/`**: RabbitMQ publishers extending `BasePublisher`.
  - `discord.publisher.ts` - Posts to `discord` exchange
  - `qbittorrent.publisher.ts` - Posts to `qbittorrent` exchange

- **`src/formatters/discord-embed.formatter.ts`**: Formats Discord embeds for releases, progress, and completion.

- **`src/state/progress-throttler.ts`**: Redis-based throttling to limit Discord updates during downloads.

## RabbitMQ Topology

| Resource | Name |
|----------|------|
| Exchange (consume) | `fitgirl` (topic, durable) |
| Exchange (consume) | `discord` (topic, durable) |
| Exchange (consume) | `qbittorrent` (topic, durable) |
| Queue | `fitgirl.release.new.discord-notifier` |
| Queue | `discord.interaction.button.fitgirl` |
| Queue | `qbittorrent.downloads.progress.fitgirl` |
| Queue | `qbittorrent.downloads.complete.fitgirl` |
| DLQ alert routing key | `notifications.dlq.fitgirl-discord-notifier` |

## Database Schema

```sql
-- games: All game releases with download status
-- ratings: One rating per user per game (upvote/downvote)
-- steam_corrections: User-submitted Steam URL corrections
```

## Button Custom ID Format

`fitgirl_{action}_{guid}`

Actions: `download`, `upvote`, `downvote`

## Environment Variables

Required: `RABBITMQ_URL`, `REDIS_URL`, `DISCORD_CHANNEL_ID`

Optional: `DATABASE_PATH` (default: `/app/data/fitgirl.db`), `PROGRESS_THROTTLE_MS` (default: `30000`), `LOKI_HOST`, `LOG_LEVEL` (default: `info`)

## Testing

Tests use Bun's test runner with the arrange-act-assert pattern. All external dependencies (SQLite, Redis, RabbitMQ) are mocked at the module level.

```typescript
import { describe, it, expect, mock, beforeEach } from "bun:test";
```

## Error Handling

Custom errors in `src/errors/index.ts`:
- `GameNotFoundError` - Game not found in database
- `InvalidSteamUrlError` - Invalid Steam URL format
- `DatabaseError` - SQLite operation failure
- `DuplicateGameError` - Attempted to insert duplicate game

Uses `NonRetryableError` from `@xmer/consumer-shared` for validation failures in consumers.

## Deferred Features

See `/_specs/fitgirl-discord-notifier-deferred-issues.md` for:
- Modal-based Steam URL correction (blocked by discord-bot ModalHandler)
- `modal-interaction.consumer.ts` implementation
