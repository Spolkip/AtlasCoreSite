// backend/app.js
const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const path = require('path');
const errorHandler = require('./middleware/error');

dotenv.config();
require('./config/firebase');

// Route files
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const productRoutes = require('./routes/productRoutes');
const orderRoutes = require('./routes/orderRoutes');
const adminRoutes = require('./routes/adminRoutes');
const settingsRoutes = require('./routes/settingsRoutes');
const serverRoutes = require('./routes/serverRoutes');
// ---- START OF FIX: Import the new player stats route ----
const playerStatsRoutes = require('./routes/playerStatsRoutes');
// ---- END OF FIX ----

const app = express();

app.use(express.json());
app.use(cors()); // Enable CORS for all backend routes

// Mount routers
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/products', productRoutes);
app.use('/api/v1/orders', orderRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/settings', settingsRoutes);
app.use('/api/v1/server', serverRoutes);
// ---- START OF FIX: Mount the new player stats route ----
app.use('/api/v1/player-stats', playerStatsRoutes);
// ---- END OF FIX ----

app.use(errorHandler);

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../../frontend/build')));
  app.get('*', (req, res) =>
    res.sendFile(path.resolve(__dirname, '../../frontend/build', 'index.html'))
  );
}

const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`));

process.on('unhandledRejection', (err, promise) => {
  console.log(`Error: ${err.message}`);
  server.close(() => process.exit(1));
});
