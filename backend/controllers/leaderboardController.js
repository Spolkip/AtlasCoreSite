// backend/controllers/leaderboardController.js
const { getDocs, collection, query, orderBy, limit } = require('firebase/firestore');
const { FIREBASE_DB } = require('../config/firebase');

/**
 * @desc    Get data for all leaderboards
 * @route   GET /api/v1/leaderboards
 * @access  Public
 */
exports.getLeaderboards = async (req, res) => {
    try {
        const playerProfilesRef = collection(FIREBASE_DB, 'player_profiles');

        // Helper function to fetch and sort a leaderboard
        const fetchLeaderboard = async (statKey) => {
            // Firestore does not support ordering by map fields directly with a descending limit.
            // We fetch all profiles and sort them in memory.
            // This is acceptable for a reasonable number of players, but for very large
            // servers, a more scalable solution (like a separate aggregated collection) would be needed.
            const snapshot = await getDocs(playerProfilesRef);
            
            const players = snapshot.docs.map(doc => doc.data());

            return players
                .filter(p => p.stats && p.stats[statKey]) // Ensure the player has the stat
                .sort((a, b) => Number(b.stats[statKey]) - Number(a.stats[statKey])) // Sort descending
                .slice(0, 10) // Get top 10
                .map(p => ({
                    uuid: p.uuid,
                    playerName: p.playerName,
                    [statKey]: p.stats[statKey]
                }));
        };

        const [
            balanceLeaderboard, 
            fightingLeaderboard, 
            miningLeaderboard,
            killsLeaderboard,
            deathsLeaderboard
        ] = await Promise.all([
            fetchLeaderboard('vault_eco_balance'),
            fetchLeaderboard('auraskills_fighting'),
            fetchLeaderboard('auraskills_mining'),
            fetchLeaderboard('statistic_player_kills'),
            fetchLeaderboard('statistic_deaths')
        ]);

        res.status(200).json({
            success: true,
            data: {
                balance: balanceLeaderboard,
                fighting: fightingLeaderboard,
                mining: miningLeaderboard,
                kills: killsLeaderboard,
                deaths: deathsLeaderboard,
            }
        });

    } catch (error) {
        console.error("Error fetching leaderboard data:", error);
        res.status(500).json({ success: false, message: 'Server error fetching leaderboards.' });
    }
};
