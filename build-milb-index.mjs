import fs from 'fs/promises';
import path from 'path';

const normalizeName = (name) => {
  if (!name) return "";
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, "")
    .toLowerCase();
};

// --- HEADSHOT OVERRIDES ---
// Add players here if their MLB photo is missing or they have a weird name in the CSV
const MANUAL_OVERRIDES = {
  "carloslagrange": 801739,
  "georgelombard": 806146,
  "georgelombardjr": 806146,
  "spencerjones": 682987,
  "cobymorales": 815089,
  "wilbersondepena": 821648,
  "daxkilby": 828076,
  "jacksonlovich": 804944,
  // "playername": 123456
};

async function buildMilbIndex() {
  // Start with your manual overrides as the base
  const index = { ...MANUAL_OVERRIDES };
  
  try {
    const teamsResponse = await fetch('https://statsapi.mlb.com/api/v1/teams?sportIds=11,12,13,14,15,16');
    const teamsData = await teamsResponse.json();

    console.log(`Found ${teamsData.teams?.length || 0} teams. Fetching rosters...`);

    const rosterPromises = teamsData.teams.map(async (team) => {
      try {
        const rosterRes = await fetch(`https://statsapi.mlb.com/api/v1/teams/${team.id}/roster`);
        const rosterData = await rosterRes.json();
        
        if (rosterData.roster) {
          for (const player of rosterData.roster) {
            const normalized = normalizeName(player.person.fullName);
            
            // Only add the MLB API ID if we haven't manually overridden it above
            if (!index[normalized]) {
              index[normalized] = player.person.id;
            }
          }
        }
      } catch (err) {
        console.warn(`Failed to fetch roster for team ${team.id}:`, err.message);
      }
    });

    await Promise.all(rosterPromises);

    const outputPath = path.resolve(process.cwd(), 'public', 'milb-player-index.json');
    await fs.writeFile(outputPath, JSON.stringify(index));
    
    console.log(`Successfully indexed ${Object.keys(index).length} MiLB players to ${outputPath}`);

  } catch (error) {
    console.error("Fatal error building MiLB index:", error);
    process.exit(1);
  }
}

buildMilbIndex();