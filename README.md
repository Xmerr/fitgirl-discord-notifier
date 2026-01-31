# FitGirl Discord Notifier

Multi-consumer service bridging fitgirl-rss-reader with Discord, qBittorrent, and user feedback collection. Posts rich game release notifications with interactive buttons, handles downloads, tracks progress, and collects ratings.

## Links

- [GitHub](https://github.com/Xmerr/fitgirl-discord-notifier)
- [Docker Hub](https://hub.docker.com/r/xmer/fitgirl-discord-notifier)

## Architecture

```
fitgirl.release.new ──────────► ReleaseNewConsumer ──► Discord post with buttons

discord.interaction.button ───► ButtonInteractionConsumer ──► Download/Rating handling
  (fitgirl_* prefix only)

qbittorrent.downloads.progress ► DownloadProgressConsumer ──► Discord progress updates
  (category: games only)

qbittorrent.downloads.complete ► DownloadCompleteConsumer ──► Discord completion update
```

## How to Run

### Local Development

```bash
# Install dependencies
bun install

# Copy and configure environment
cp .env.example .env

# Run the service
bun run start
```

### Docker

```bash
docker run -d \
  --name fitgirl-discord-notifier \
  -e RABBITMQ_URL=amqp://user:pass@rabbitmq:5672 \
  -e REDIS_URL=redis://redis:6379 \
  -e DISCORD_CHANNEL_ID=123456789012345678 \
  -v fitgirl-data:/app/data \
  xmer/fitgirl-discord-notifier:latest
```

### Docker Compose

```yaml
services:
  fitgirl-discord-notifier:
    image: xmer/fitgirl-discord-notifier:latest
    container_name: fitgirl-discord-notifier
    restart: unless-stopped
    environment:
      - RABBITMQ_URL=amqp://user:pass@rabbitmq:5672
      - REDIS_URL=redis://redis:6379
      - DISCORD_CHANNEL_ID=123456789012345678
      - PROGRESS_THROTTLE_MS=30000
      - LOKI_HOST=http://loki:3101
      - LOG_LEVEL=info
    volumes:
      - fitgirl-data:/app/data
    networks:
      - microservices

volumes:
  fitgirl-data:

networks:
  microservices:
    external: true
```

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `RABBITMQ_URL` | Yes | | AMQP connection URI |
| `REDIS_URL` | Yes | | Redis connection URI for progress throttling |
| `DISCORD_CHANNEL_ID` | Yes | | Target Discord channel for game releases |
| `DATABASE_PATH` | No | `/app/data/fitgirl.db` | SQLite database file path |
| `PROGRESS_THROTTLE_MS` | No | `30000` | Minimum interval between progress updates |
| `LOKI_HOST` | No | | Grafana Loki endpoint for logging |
| `LOG_LEVEL` | No | `info` | Log verbosity (debug, info, warn, error) |

## Volumes

| Volume | Required | Description |
|--------|----------|-------------|
| `/app/data` | Yes | SQLite database storage |

## Queue Bindings

| Exchange | Routing Key | Queue |
|----------|-------------|-------|
| `fitgirl` | `release.new` | `fitgirl.release.new.discord-notifier` |
| `discord` | `interaction.button` | `discord.interaction.button.fitgirl` |
| `qbittorrent` | `downloads.progress` | `qbittorrent.downloads.progress.fitgirl` |
| `qbittorrent` | `downloads.complete` | `qbittorrent.downloads.complete.fitgirl` |

## Discord Button Actions

Button `custom_id` format: `fitgirl_{action}_{guid}`

| Action | Description |
|--------|-------------|
| `download` | Initiates download via qBittorrent |
| `upvote` | Records positive rating |
| `downvote` | Records negative rating |

## Database Schema

- **games**: Stores all game releases with download status
- **ratings**: One rating per user per game (upvote/downvote)
- **steam_corrections**: User-submitted Steam URL corrections (future feature)
