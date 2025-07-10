const axios_delivery = require('axios');
const Product_delivery = require('../models/Product');
const User_delivery = require('../models/User');
require('dotenv').config();

const _executeCommand = async (command, user, product) => {
    if (!command || !command.trim()) return;

    const pluginUrl = process.env.PLUGIN_API_URL;
    const pluginSecret = process.env.WEBHOOK_SECRET;

    if (!pluginUrl || !pluginSecret) {
        console.error('Plugin URL or secret is not configured in the backend .env file.');
        return;
    }

    // Prepare placeholders for the plugin to resolve
    // The plugin will handle {player}, {world}, {onlinePlayers}, {maxPlayers}, {newPlayersToday}
    // The backend will handle {uuid} and {username} (from web user data)
    const processedCommand = command
        .replace(/{uuid}/g, user.minecraft_uuid || 'N/A') // Ensure UUID is replaced
        .replace(/{username}/g, user.username || 'N/A'); // Ensure username is replaced

    // NEW: Create a player context object to send to the plugin
    const playerContext = {
        playerName: user.minecraft_username || user.username, // Use Minecraft username if available, else web username
        worldName: 'world', // Placeholder: You might need to get this dynamically if your server supports it
        uuid: user.minecraft_uuid || 'N/A',
        username: user.username || 'N/A' // Web username
    };

    try {
        await axios_delivery.post(
            `${pluginUrl}/execute-command`,
            { 
                command: processedCommand,
                playerContext: playerContext // NEW: Send player context
            },
            { headers: { 'Authorization': `Bearer ${pluginSecret}` } }
        );
        console.log(`Successfully sent command to plugin: ${processedCommand}`);
    } catch (error) {
        console.error(`Failed to send command "${processedCommand}" to plugin:`, error.response ? error.response.data : error.message);
    }
};

const deliveryService = {
    deliverProduct: async (userId, productId) => {
        try {
            const user = await User_delivery.findById(userId);
            const product = await Product_delivery.findById(productId);

            if (!user || !product) {
                throw new Error(`Invalid user (${userId}) or product (${productId}) for delivery.`);
            }
            if (!user.minecraft_uuid) {
                console.warn(`User ${user.username} has no linked Minecraft account. Skipping delivery for product ${product.name}.`);
                return;
            }

            if (product.in_game_commands && product.in_game_commands.length > 0) {
                console.log(`Executing ${product.in_game_commands.length} command(s) for product: ${product.name}`);
                for (const command of product.in_game_commands) {
                    await _executeCommand(command, user, product);
                }
            } else {
                console.log(`Product ${product.name} has no specific in-game commands.`);
            }
            
            return true;
        } catch (error) {
            console.error('Delivery Service Error:', error.message);
            throw error;
        }
    }
};

module.exports = deliveryService;
