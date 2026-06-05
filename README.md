# MILB Roster API

This repository serves as a static API backend that provides minor league baseball player data via GitHub Pages.

## How It Works

- **Daily Schedule**: A GitHub Actions workflow runs at 08:00 UTC (4:00 AM EDT) every day
- **Data Source**: Fetches roster data from the MLB Stats API
- **Output**: Generates a minified JSON lookup file (`milb-player-index.json`)
- **Hosting**: Served via GitHub Pages at `https://tampabaybaseball.github.io/milb-roster-api/public/milb-player-index.json`

## File Structure

```
milb-roster-api/
├── .github/workflows/update-index.yml    # GitHub Actions workflow
├── build-milb-index.mjs                  # Node.js build script
├── public/                               # Output directory (served by GitHub Pages)
│   └── milb-player-index.json            # Generated player index
└── README.md                             # This file
```

## Usage

Your Framer component can fetch the player index with:

```typescript
const response = await fetch(
  'https://tampabaybaseball.github.io/milb-roster-api/public/milb-player-index.json'
);
const playerIndex = await response.json();

// Example: Look up a player by normalized name
const playerId = playerIndex['spencerjones']; // Returns player ID
```

## Build Script Details

The `build-milb-index.mjs` script:
1. Fetches all minor league teams from the MLB Stats API
2. Fetches rosters for all teams in parallel
3. Normalizes player names (lowercase, removes accents, strips punctuation)
4. Creates a flat key-value lookup object
5. Outputs minified JSON to `public/milb-player-index.json`

## Manual Trigger

To manually run the workflow:
1. Go to **Actions** tab in the repository
2. Select **"Update MILB Player Index"**
3. Click **"Run workflow"**
