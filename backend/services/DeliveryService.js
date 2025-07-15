// backend/services/DeliveryService.js

const axios = require('axios');
const Product = require('../models/Product');
const User = require('../models/User');
require('dotenv').config();

/**
 * Executes a single command by sending it to the Minecraft plugin's webhook.
 * This function is now corrected to pass the raw command string and context,
 * allowing the plugin's PlaceholderAPI to handle placeholder replacement.
 *
 * @param {string} command The raw command string with placeholders (e.g., "give {player} diamond 1").
 * @param {object} user The user object from the database, containing web and Minecraft details.
 * @param {object} context The context of the command execution (e.g., a product or promo code).
 * @private
 */
const _executeCommand = async (command, user, context) => {
    // Do not execute if the command is empty or just whitespace.
    if (!command || !command.trim()) {
        console.warn(`Skipping empty command for ${context.name}`);
        return;
    }

    // Retrieve plugin connection details from environment variables.
    const pluginUrl = process.env.PLUGIN_API_URL || `http://localhost:${process.env.WEBHOOK_PORT || 4567}`;
    const pluginSecret = process.env.WEBHOOK_SECRET;

    // Validate that the plugin URL and secret are configured.
    if (!pluginUrl || !pluginSecret) {
        console.error('CRITICAL: PLUGIN_API_URL or WEBHOOK_SECRET is not configured in the backend .env file. Cannot execute commands.');
        return;
    }

    // Create a context object with player information.
    // This will be used by the Minecraft plugin (via PlaceholderAPI) to replace placeholders.
    const playerContext = {
        // Use the Minecraft username if available, otherwise fall back to the web username.
        playerName: user.minecraft_username || user.username,
        uuid: user.minecraft_uuid || 'N/A',
        // The web username is also included for any custom logic.
        username: user.username || 'N/A'
    };

    try {
        // Post the raw command and the player context to the plugin's /execute-command endpoint.
        // The plugin's WebServer.java will handle the placeholder replacement and command dispatch.
        await axios.post(
            `${pluginUrl}/execute-command`,
            {
                command: command,
                playerContext: playerContext
            },
            {
                headers: {
                    'Authorization': `Bearer ${pluginSecret}`,
                    'Content-Type': 'application/json'
                },
                timeout: 10000 // 10-second timeout
            }
        );
        console.log(`Successfully dispatched command for user ${user.username}: "${command}"`);
    } catch (error) {
        // Log detailed error information for easier debugging.
        const errorMessage = error.response ? JSON.stringify(error.response.data) : error.message;
        console.error(`Failed to send command "${command}" to plugin for user ${user.username}. Error: ${errorMessage}`);
    }
};

/**
 * The main delivery service object.
 */
const deliveryService = {
    /**
     * Delivers a purchased product to a user by executing its associated in-game commands.
     * @param {string} userId The ID of the user receiving the product.
     * @param {string} productId The ID of the product being delivered.
     * @returns {Promise<void>}
     * @throws Will throw an error if the user or product cannot be found.
     */
    deliverProduct: async (userId, productId) => {
        try {
            // Fetch user and product details from the database.
            const user = await User.findById(userId);
            const product = await Product.findById(productId);

            // Validate that both user and product exist.
            if (!user || !product) {
                throw new Error(`Invalid user (ID: ${userId}) or product (ID: ${productId}) for delivery.`);
            }

            // Check if the user has linked their Minecraft account.
            if (!user.minecraft_uuid) {
                console.warn(`User ${user.username} (ID: ${userId}) has no linked Minecraft account. Skipping in-game delivery for product: ${product.name}.`);
                return;
            }

            // Check if the product has any commands to execute.
            if (product.in_game_commands && product.in_game_commands.length > 0) {
                console.log(`Executing ${product.in_game_commands.length} command(s) for user ${user.username} for product: ${product.name}`);
                // Execute each command associated with the product.
                for (const command of product.in_game_commands) {
                    await _executeCommand(command, user, product);
                }
            } else {
                console.log(`Product ${product.name} has no in-game commands to execute.`);
            }
        } catch (error) {
            console.error('Delivery Service Error:', error.message);
            // Re-throw the error to be handled by the calling function in orderController.js.
            throw error;
        }
    },

    /**
     * Executes a list of commands for a specific user, typically for promo code rewards.
     * @param {string} userId The ID of the user to execute commands for.
     * @param {string[]} commands The array of command strings to execute.
     * @returns {Promise<void>}
     */
    executeCommandsForUser: async (userId, commands) => {
        if (!commands || commands.length === 0) return;
        try {
            const user = await User.findById(userId);
            if (!user || !user.minecraft_uuid) {
                console.warn(`User ${userId} has no linked Minecraft account. Skipping promo command execution.`);
                return;
            }
            console.log(`Executing ${commands.length} promo commands for user ${user.username}`);
            for (const command of commands) {
                await _executeCommand(command, user, { name: 'Promo Code Reward' });
            }
        } catch (error) {
            console.error('Promo Command Execution Service Error:', error.message);
        }
    }
};

module.exports = deliveryService;
