const config = {
  port: process.env.PORT || 5000,
  dbPath: './database.db',
  jwtSecret: process.env.JWT_SECRET || 'your_jwt_secret_default', // Use environment variable with fallback
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  socketMethods: ['GET', 'POST'],
  
  // Logging configuration
  logging: {
    // Log level based on environment
    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    // Log file paths
    files: {
      error: 'logs/error.log',
      combined: 'logs/all.log',
    },
    // Morgan format based on environment
    morganFormat: process.env.NODE_ENV === 'production' ? 'combined' : 'dev'
  }
};

export default config;