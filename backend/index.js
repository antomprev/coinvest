require('dotenv').config();
const express = require('express');
const cors = require('cors');

// Import routes
const authRoutes = require('./routes/auth');
const ideaRoutes = require('./routes/ideas');
const likeRoutes = require('./routes/likes');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Coinvest API is running' });
});

// Routes
app.use('/auth', authRoutes);
app.use('/ideas', ideaRoutes);
app.use('/ideas', likeRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.method} ${req.path} not found`
    }
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'Internal server error'
    }
  });
});

app.listen(PORT, () => {
  console.log(`✅ Coinvest API running on http://localhost:${PORT}`);
  console.log(`📚 API Documentation: ${process.env.NODE_ENV === 'development' ? 'See API_DESIGN.md' : 'API Reference'}`);
});
