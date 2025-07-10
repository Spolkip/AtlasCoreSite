// backend/services/DeliveryService.js
const axios = require('axios');
const Product = require('../models/Product');
const User = require('../models/User');
const { Setting } = require('../models/Setting'); // Import the Setting model correctly
require('dotenv').config();

const deliveryService = {
  // Helper function to execute a single command with placeholders
  _executeCommand: async (command, user, product) => {
    if (!command || !command.trim()) return;

    // Replace placeholders
    const processedCommand = command
      .replace(/{uuid}/g, user.minecraft_uuid)
      .replace(/{username}/g, user.username)
      .replace(/{product_id}/g, product.id)
      .replace(/{product_name}/g, product.name);
    
    console.log(`Executing delivery command: ${processedCommand}`);

    await axios.post(process.env.SPIGOT_WEBHOOK_URL, {
      command: processedCommand,
      secret: process.env.SPIGOT_SECRET_KEY
    });
  },

  deliverProduct: async (userId, productId) => {
    try {
      const user = await User.findById(userId);
      const product = await Product.findById(productId);

      if (!user || !product || !user.minecraft_uuid) {
        throw new Error('Invalid user or product data for delivery.');
      }

      // --- Execute Product-Specific Commands ---
      if (product.in_game_commands && product.in_game_commands.length > 0) {
        console.log(`Executing ${product.in_game_commands.length} command(s) for product: ${product.name}`);
        for (const command of product.in_game_commands) {
          await deliveryService._executeCommand(command, user, product);
        }
      } else {
        console.log(`Product ${product.name} has no specific in-game commands.`);
      }
      
      // --- Execute Global Command ---
      // We assume findAll will get all settings and we can find the one we need.
      const settings = await Setting.findAll();
      const globalCommandSetting = settings.find(s => s.key === 'global_purchase_command');
      
      if (globalCommandSetting && globalCommandSetting.value) {
        console.log('Executing global purchase command.');
        await deliveryService._executeCommand(globalCommandSetting.value, user, product);
      }

      return true;
    } catch (error) {
      console.error('Delivery error:', error.message);
      throw error;
    }
  }
};

module.exports = deliveryService;