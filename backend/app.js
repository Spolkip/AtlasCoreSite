const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const path = require('path');
// The errorHandler is now imported directly, not destructured.
const errorHandler = require('./middleware/error');

// Load env vars
dotenv.config();

// With Firebase, the database connection is handled when the firebase.js module
// is imported by other files (like your controllers), so no explicit
// connection call is needed here.

const app = express();

// --- Body Parser Middleware ---
// This line is crucial. It tells Express to parse incoming JSON requests.
// It must be placed BEFORE your routes are defined.
app.use(express.json());


// CORS - Allows requests from other domains (like your frontend)
app.use(cors());

// --- API Routes ---
app.use('/api/v1/auth', require('./routes/authRoutes'));
app.use('/api/v1/users', require('./routes/userRoutes'));
app.use('/api/v1/products', require('./routes/productRoutes'));
app.use('/api/v1/orders', require('./routes/orderRoutes'));
app.use('/api/v1/settings', require('./routes/settingsRoutes'));
app.use('/api/v1/admin', require('./routes/adminRoutes'));

// --- Serve Frontend in Production ---
if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, '../frontend/build')));

    app.get('*', (req, res) =>
        res.sendFile(
            path.resolve(__dirname, '../', 'frontend', 'build', 'index.html')
        )
    );
} else {
    app.get('/', (req, res) => {
        res.send('API is running....');
    });
}

// Error Handler Middleware (must be last)
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

app.listen(
    PORT,
    console.log(
        `Server running in ${process.env.NODE_ENV} mode on port ${PORT}`
    )
);
