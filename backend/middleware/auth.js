const jwt = require('jsonwebtoken');
const config = require('../config/config');

const authenticateToken = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return res.sendStatus(401);

  jwt.verify(token, config.jwtSecret, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

const authenticateSocket = (socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) return next(new Error('Authentication error'));

  jwt.verify(token, config.jwtSecret, (err, user) => {
    if (err) return next(new Error('Authentication error'));
    socket.userId = user.id;
    next();
  });
};

module.exports = {
  authenticateToken,
  authenticateSocket
};
