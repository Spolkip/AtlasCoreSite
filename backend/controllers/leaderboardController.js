// backend/controllers/leaderboardController.js
const { collection, getDocs } = require('firebase/firestore');
const { FIREBASE_DB } = require('../config/firebase');

/**
 * Defines the leaderboards to be generated and groups them into categories.
 * The key is the display name of the leaderboard.
 * The value is the exact key used in the 'stats' map of a player's profile document.
 */
const LEADERBOARD_CATEGORIES = {
    "General": {
        "Player Balance": "vault_eco_balance",
        "Power Level": "auraskills_power",
        "Player Kills": "statistic_player_kills",
        "Deaths": "statistic_deaths",
    },
    "Combat Skills": {
        "Fighting": "auraskills_fighting",
        "Archery": "auraskills_archery",
        "Defense": "auraskills_defense",
        "Agility": "auraskills_agility",
        "Endurance": "auraskills_endurance",
    },
    "Gathering Skills": {
        "Farming": "auraskills_farming",
        "Foraging": "auraskills_foraging",
        "Fishing": "auraskills_fishing",
        "Excavation": "auraskills_excavation",
        "Mining": "auraskills_mining",
    },
    "Crafting & Magic": {
        "Alchemy": "auraskills_alchemy",
        "Enchanting": "auraskills_enchanting",
        "Forging": "auraskills_forging",
        "Sorcery": "auraskills_sorcery",
        "Healing": "auraskills_healing",
    }
};

/**
 * @desc    Get all leaderboards data by processing player profiles
 * @route   GET /api/v1/leaderboards
 * @access  Public
 */
exports.getLeaderboards = async (req, res) => {
    try {
        const profilesCollectionRef = collection(FIREBASE_DB, 'player_profiles');
        const querySnapshot = await getDocs(profilesCollectionRef);

        if (querySnapshot.empty) {
            return res.status(200).json({ 
                success: true, 
                message: 'No player profiles found to generate leaderboards.',
                leaderboards: {} 
            });
        }

        // Map all player profiles into a more usable format
        const allPlayers = [];
        querySnapshot.forEach(doc => {
            const data = doc.data();
            allPlayers.push({
                uuid: doc.id,
                username: data.playerName || 'Unknown',
                stats: data.stats || {}
            });
        });

        const categorizedLeaderboards = {};
        
        // Generate each leaderboard based on the configuration
        for (const [categoryName, boards] of Object.entries(LEADERBOARD_CATEGORIES)) {
            categorizedLeaderboards[categoryName] = {};
            for (const [boardName, statKey] of Object.entries(boards)) {
                const rankedPlayers = allPlayers
                    .map(player => {
                        // Safely parse the score, defaulting to 0 if invalid or missing
                        const score = parseFloat(player.stats[statKey]) || 0;
                        return {
                            uuid: player.uuid,
                            username: player.username,
                            score: score
                        };
                    })
                    .sort((a, b) => b.score - a.score) // Sort descending
                    .slice(0, 25) // Take top 25 players
                    .map((player, index) => ({
                        ...player,
                        rank: index + 1 // Add rank
                    }));
                
                categorizedLeaderboards[categoryName][boardName] = { topPlayers: rankedPlayers };
            }
        }

        res.status(200).json({ success: true, leaderboards: categorizedLeaderboards });

    } catch (error) {
        console.error('Error fetching and processing leaderboards:', error);
        res.status(500).json({ success: false, message: 'Server error generating leaderboard data.' });
    }
};
