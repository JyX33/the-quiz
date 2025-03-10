const config = {
  port: process.env.PORT || 5000,
  dbPath: process.env.NODE_ENV === 'production' ? '/app/database.db' : './database.db',
  jwtSecret: process.env.JWT_SECRET || 'your_jwt_secret_default',
  corsOrigin: 'https://is80s4w8kkccgko8808ookww.82.29.170.182.sslip.io',
  socketMethods: ['GET', 'POST'],
  
  // Logging configuration
  logging: {
    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    files: {
      error: process.env.NODE_ENV === 'production' ? '/tmp/logs/error.log' : 'logs/error.log',
      combined: process.env.NODE_ENV === 'production' ? '/tmp/logs/all.log' : 'logs/all.log',
    },
    morganFormat: process.env.NODE_ENV === 'production' ? 'combined' : 'dev'
  }
};

export default config;