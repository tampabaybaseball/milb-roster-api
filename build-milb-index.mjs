#!/usr/bin/env node

import https from 'https';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Utility to perform HTTPS GET requests
 */
function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (err) {
          reject(new Error(`Failed to parse JSON from ${url}: ${err.message}`));
        }
      });
    }).on('error', reject);
  });
}

/**
 * Normalize player name: lowercase, decompose accents, strip punctuation, collapse whitespace
 */
function normalizePlayerName(name) {
  if (!name || typeof name !== 'string') return '';
  
  return name
    .toLowerCase()
    .normalize('NFD')                    // Decompose accents
    .replace(/[\u0300-\u036f]/g, '')     // Remove diacritics
    .replace(/[^a-z0-9\s]/g, '')         // Strip punctuation/special chars
    .trim()
    .replace(/\s+/g, '');                // Collapse whitespace
}

/**
 * Main build function
 */
async function buildMilbIndex() {
  try {
    console.log('🔄 Starting MILB roster index build...\n');

    // Step 1: Fetch all minor league teams
    console.log('📥 Fetching minor league teams...');
    let teams = [];
    try {
      const teamsData = await fetchJSON('https://statsapi.mlb.com/api/v1/teams?sportIds=11,12,13,14,15,16');
      teams = teamsData.teams || [];
      console.log(`✅ Found ${teams.length} minor league teams\n`);
    } catch (err) {
      console.error('❌ Failed to fetch teams:', err.message);
      process.exit(1);
    }

    // Step 2: Fetch rosters for all teams in parallel
    console.log(`📋 Fetching rosters for ${teams.length} teams in parallel...\n`);
    const rosterPromises = teams.map(team =>
      (async () => {
        try {
          const rosterData = await fetchJSON(`https://statsapi.mlb.com/api/v1/teams/${team.id}/roster`);
          return {
            teamId: team.id,
            teamName: team.name,
            roster: rosterData.roster || [],
            success: true,
          };
        } catch (err) {
          console.warn(`⚠️  Failed to fetch roster for team ${team.id} (${team.name}): ${err.message}`);
          return {
            teamId: team.id,
            teamName: team.name,
            roster: [],
            success: false,
            error: err.message,
          };
        }
      })()
    );

    const rosterResults = await Promise.all(rosterPromises);

    // Step 3: Build the flat key-value lookup map
    console.log('🔨 Building player index...\n');
    const playerIndex = {};
    let totalPlayersIndexed = 0;
    let duplicateCount = 0;

    rosterResults.forEach(result => {
      if (!result.success) return;

      result.roster.forEach(player => {
        if (player.person && player.person.fullName) {
          const normalizedName = normalizePlayerName(player.person.fullName);
          if (normalizedName) {
            // If we encounter duplicate normalized names, keep the first one
            if (playerIndex[normalizedName]) {
              duplicateCount++;
            } else {
              playerIndex[normalizedName] = player.person.id;
              totalPlayersIndexed++;
            }
          }
        }
      });
    });

    console.log(`✅ Indexed ${totalPlayersIndexed} players`);
    if (duplicateCount > 0) {
      console.log(`ℹ️  Skipped ${duplicateCount} duplicate normalized names\n`);
    }

    // Step 4: Ensure output directory exists
    const publicDir = path.join(__dirname, 'public');
    if (!fs.existsSync(publicDir)) {
      fs.mkdirSync(publicDir, { recursive: true });
      console.log('📁 Created public directory\n');
    }

    // Step 5: Write minified JSON to file
    const outputPath = path.join(publicDir, 'milb-player-index.json');
    fs.writeFileSync(outputPath, JSON.stringify(playerIndex), 'utf8');
    console.log(`💾 Wrote index to ${outputPath}`);
    console.log(`📊 File size: ${(fs.statSync(outputPath).size / 1024).toFixed(2)} KB\n`);

    console.log('✨ Build complete!\n');
  } catch (err) {
    console.error('❌ Unexpected error during build:', err.message);
    process.exit(1);
  }
}

// Run the build
buildMilbIndex();