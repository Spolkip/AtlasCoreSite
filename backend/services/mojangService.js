const axios = require('axios');
require('dotenv').config();

const mojangService = {
  getUUIDFromUsername: async (username) => {
    try {
      const response = await axios.get(`${process.env.MOJANG_API_URL}/users/profiles/minecraft/${username}`);
      return response.data.id;
    } catch (error) {
      console.error('Mojang API error:', error.message);
      return null;
    }
  },

  getUsernameFromUUID: async (uuid) => {
    try {
      const response = await axios.get(`${process.env.MOJANG_API_URL}/user/profile/${uuid}`);
      return response.data.name;
    } catch (error) {
      console.error('Mojang API error:', error.message);
      return null;
    }
  }
};

module.exports = { mojangService };