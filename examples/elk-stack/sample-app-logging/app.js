// Sample Node.js Application with Structured Logging
// Demonstrates integration with ELK Stack

const express = require('express');
const winston = require('winston');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3000;

// Configure Winston logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: {
    service: 'sample-app',
    environment: process.env.NODE_ENV || 'development'
  },
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/app.log' }),
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

// Middleware to parse JSON
app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
  const requestId = uuidv4();
  req.requestId = requestId;
  req.startTime = Date.now();

  logger.info('Incoming request', {
    requestId,
    method: req.method,
    path: req.path,
    userAgent: req.get('user-agent'),
    ip: req.ip
  });

  // Response logging
  res.on('finish', () => {
    const latency = Date.now() - req.startTime;
    const logLevel = res.statusCode >= 400 ? 'error' : 'info';

    logger.log(logLevel, 'Request completed', {
      requestId,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      latency,
      userAgent: req.get('user-agent')
    });
  });

  next();
});

// In-memory data store (for demo purposes)
let users = [
  { id: 1, name: 'Alice', email: 'alice@example.com' },
  { id: 2, name: 'Bob', email: 'bob@example.com' }
];
let userIdCounter = 3;

// Routes

// Root endpoint
app.get('/', (req, res) => {
  logger.info('Root endpoint accessed', { requestId: req.requestId });
  res.json({
    message: 'Sample Application with ELK Logging',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      users: '/api/users',
      simulateError: '/api/simulate-error'
    }
  });
});

// Health check
app.get('/api/health', (req, res) => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  };

  logger.info('Health check', {
    requestId: req.requestId,
    ...health
  });

  res.json(health);
});

// Get all users
app.get('/api/users', (req, res) => {
  logger.info('Fetching all users', {
    requestId: req.requestId,
    userCount: users.length
  });

  res.json({ users });
});

// Get user by ID
app.get('/api/users/:id', (req, res) => {
  const userId = parseInt(req.params.id);
  const user = users.find(u => u.id === userId);

  if (!user) {
    logger.warn('User not found', {
      requestId: req.requestId,
      userId
    });
    return res.status(404).json({ error: 'User not found' });
  }

  logger.info('User fetched', {
    requestId: req.requestId,
    userId
  });

  res.json({ user });
});

// Create user
app.post('/api/users', (req, res) => {
  const { name, email } = req.body;

  // Validation
  if (!name || !email) {
    logger.warn('Invalid user data', {
      requestId: req.requestId,
      data: req.body
    });
    return res.status(400).json({ error: 'Name and email are required' });
  }

  const user = {
    id: userIdCounter++,
    name,
    email
  };

  users.push(user);

  logger.info('User created successfully', {
    requestId: req.requestId,
    userId: user.id,
    name,
    email
  });

  res.status(201).json({ user });
});

// Update user
app.put('/api/users/:id', (req, res) => {
  const userId = parseInt(req.params.id);
  const { name, email } = req.body;
  const userIndex = users.findIndex(u => u.id === userId);

  if (userIndex === -1) {
    logger.warn('User not found for update', {
      requestId: req.requestId,
      userId
    });
    return res.status(404).json({ error: 'User not found' });
  }

  users[userIndex] = {
    ...users[userIndex],
    ...(name && { name }),
    ...(email && { email })
  };

  logger.info('User updated', {
    requestId: req.requestId,
    userId,
    changes: { name, email }
  });

  res.json({ user: users[userIndex] });
});

// Delete user
app.delete('/api/users/:id', (req, res) => {
  const userId = parseInt(req.params.id);
  const userIndex = users.findIndex(u => u.id === userId);

  if (userIndex === -1) {
    logger.warn('User not found for deletion', {
      requestId: req.requestId,
      userId
    });
    return res.status(404).json({ error: 'User not found' });
  }

  const deletedUser = users.splice(userIndex, 1)[0];

  logger.info('User deleted', {
    requestId: req.requestId,
    userId,
    deletedUser
  });

  res.json({ message: 'User deleted', user: deletedUser });
});

// Simulate error endpoint (for testing error logging)
app.post('/api/simulate-error', (req, res) => {
  const errorType = req.body.type || 'generic';

  logger.error('Simulated error triggered', {
    requestId: req.requestId,
    errorType
  });

  const errors = {
    generic: new Error('This is a simulated error'),
    database: new Error('Database connection failed'),
    validation: new Error('Validation error: Invalid input'),
    timeout: new Error('Request timeout after 5000ms')
  };

  const error = errors[errorType] || errors.generic;

  logger.error('Error occurred', {
    requestId: req.requestId,
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack
    },
    method: req.method,
    path: req.path
  });

  res.status(500).json({
    error: error.message,
    requestId: req.requestId
  });
});

// 404 handler
app.use((req, res) => {
  logger.warn('Route not found', {
    requestId: req.requestId,
    method: req.method,
    path: req.path
  });

  res.status(404).json({ error: 'Route not found' });
});

// Error handler
app.use((err, req, res, next) => {
  logger.error('Unhandled error', {
    requestId: req.requestId,
    error: {
      name: err.name,
      message: err.message,
      stack: err.stack
    }
  });

  res.status(500).json({
    error: 'Internal server error',
    requestId: req.requestId
  });
});

// Start server
app.listen(PORT, () => {
  logger.info('Server started', {
    port: PORT,
    environment: process.env.NODE_ENV || 'development',
    nodeVersion: process.version
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});

module.exports = app;
