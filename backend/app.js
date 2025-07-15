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
const wikiRoutes = require('./routes/wikiRoutes');
const chatRoutes = require('./routes/chatRoutes');
const characterProfileRoutes = require('./routes/characterProfileRoutes');
const leaderboardRoutes = require('./routes/leaderboardRoutes'); // Import leaderboard routes

const app = express();

app.use(express.json());
app.use(cors());

// Mount routers
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/products', productRoutes);
app.use('/api/v1/orders', orderRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/settings', settingsRoutes);
app.use('/api/v1/server', serverRoutes);
app.use('/api/v1/wiki', wikiRoutes);
app.use('/api/v1/chat', chatRoutes);
app.use('/api/v1/profile', characterProfileRoutes);
app.use('/api/v1/leaderboards', leaderboardRoutes); // Mount leaderboard routes

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
