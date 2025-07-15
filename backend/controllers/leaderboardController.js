// backend/controllers/leaderboardController.js
const { collection, getDocs, query, orderBy, limit } = require('firebase/firestore');
const { FIREBASE_DB } = require('../config/firebase');

// Helper to safely parse stats which might be stored as strings
const parseStat = (stat) => {
    const num = parseFloat(stat);
    return isNaN(num) ? 0 : num;
};

// @desc    Get leaderboard data
// @route   GET /api/v1/leaderboards
// @access  Public
exports.getLeaderboard = async (req, res) => {
    // Note: The 'stat' query parameter should be the full path in the document, e.g., 'stats.fabled_default_currentlevel'
    const { stat = 'stats.fabled_default_currentlevel', order = 'desc', limit: queryLimit = 10 } = req.query;

    try {
        const playerProfilesRef = collection(FIREBASE_DB, 'player_profiles');
        
        // Firestore requires indexes for any orderBy clause that isn't on the document ID.
        const q = query(playerProfilesRef, orderBy(stat, order), limit(parseInt(queryLimit)));

        const querySnapshot = await getDocs(q);
        
        let leaderboard = [];
        querySnapshot.forEach(doc => {
            const data = doc.data();
            // Nested access to get the stat value
            const statValue = stat.split('.').reduce((o, i) => (o ? o[i] : undefined), data);

            leaderboard.push({
                playerName: data.playerName || 'Unknown',
                statValue: statValue !== undefined ? statValue : 'N/A'
            });
        });
        
        // Perform a secondary sort in code as Firestore's string sorting can be inconsistent for numbers
        leaderboard.sort((a, b) => {
            const statA = parseStat(a.statValue);
            const statB = parseStat(b.statValue);
            return order === 'desc' ? statB - statA : statA - statB;
        });
        
        res.status(200).json({
            success: true,
            leaderboard
        });

    } catch (error) {
        console.error(`Error fetching leaderboard for stat "${stat}":`, error);
        // Check for a specific Firestore "missing index" error code
        if (error.code === 'failed-precondition') {
            return res.status(500).json({ 
                success: false, 
                message: `Server error: A required database index is missing for the stat '${stat}'. Please create the composite index in your Firestore settings.` 
            });
        }
        res.status(500).json({ success: false, message: 'Server error fetching leaderboard data.' });
    }
};