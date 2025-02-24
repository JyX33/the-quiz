module.exports = {
  port: process.env.PORT || 5000,
  dbPath: './database.db',
  jwtSecret: 'your_jwt_secret', // TODO: Move to environment variable
  corsOrigin: 'http://localhost:5173',
  socketMethods: ['GET', 'POST']
};
