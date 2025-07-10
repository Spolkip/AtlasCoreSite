let serverStats = {
    onlinePlayers: 0,
    maxPlayers: 0,
    serverStatus: 'offline',
    newPlayersToday: 0
};

/**
 * Receives and updates server stats from the Minecraft plugin.
 */
exports.updateStats = (req, res) => {
    const { onlinePlayers, maxPlayers, serverStatus, newPlayersToday } = req.body;
    
    // Basic validation
    if (onlinePlayers === undefined || maxPlayers === undefined || serverStatus === undefined) {
        return res.status(400).json({ success: false, message: 'Invalid stats payload.' });
    }

    serverStats = { onlinePlayers, maxPlayers, serverStatus, newPlayersToday };
    console.log('Received server stats update:', serverStats);
    res.status(200).json({ success: true, message: 'Stats updated successfully.' });
};

/**
 * Provides the latest server stats to the frontend.
 */
exports.getStats = (req, res) => {
    res.status(200).json({ success: true, stats: serverStats });
};