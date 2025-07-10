// backend/app.js
const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const path = require('path');
const errorHandler = require('./middleware/error');

// Load env vars
dotenv.config();

// Initialize Firebase connection
// This replaces the old connectDB() call. Requiring this file runs the initialization code within it.
require('./config/firebase');

// Route files
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const productRoutes = require('./routes/productRoutes');
const orderRoutes = require('./routes/orderRoutes');
const adminRoutes = require('./routes/adminRoutes');
const settingsRoutes = require('./routes/settingsRoutes');
const serverRoutes = require('./routes/serverRoutes');

const app = express();

// Body parser
app.use(express.json());

// Enable CORS
app.use(cors());

// Mount routers
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/products', productRoutes);
app.use('/api/v1/orders', orderRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/settings', settingsRoutes);
app.use('/api/v1/server', serverRoutes);

// Custom error handler
app.use(errorHandler);

// Serve static assets in production
if (process.env.NODE_ENV === 'production') {
  // Set static folder
  app.use(express.static(path.join(__dirname, '../../frontend/build')));

  app.get('*', (req, res) =>
    res.sendFile(path.resolve(__dirname, '../../frontend/build', 'index.html'))
  );
}

const PORT = process.env.PORT || 5000;

const server = app.listen(
  PORT,
  console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`)
);

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
  console.log(`Error: ${err.message}`);
  // Close server & exit process
  server.close(() => process.exit(1));
});
