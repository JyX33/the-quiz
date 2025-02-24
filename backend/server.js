const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const { v4: uuidv4 } = require('uuid');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: 'http://localhost:5173',
    methods: ['GET', 'POST'],
  },
});

app.use(cors());
app.use(express.json());

// Database setup
const db = new sqlite3.Database('./database.db', (err) => {
  if (err) {
    console.error('Database connection error:', err);
  } else {
    console.log('Connected to SQLite database');
  }
});

// Database schema
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      theme TEXT DEFAULT 'Alliance'
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS quizzes (
      id TEXT PRIMARY KEY,
      creator_id INTEGER,
      questions TEXT NOT NULL,
      category TEXT,
      difficulty TEXT,
      FOREIGN KEY (creator_id) REFERENCES users(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS quiz_sessions (
      id TEXT PRIMARY KEY,
      quiz_id TEXT,
      creator_id INTEGER,
      status TEXT DEFAULT 'waiting',
      current_question INTEGER DEFAULT 0,
      FOREIGN KEY (quiz_id) REFERENCES quizzes(id),
      FOREIGN KEY (creator_id) REFERENCES users(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS quiz_session_players (
      session_id TEXT,
      user_id INTEGER,
      PRIMARY KEY (session_id, user_id),
      FOREIGN KEY (session_id) REFERENCES quiz_sessions(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS scores (
      session_id TEXT,
      user_id INTEGER,
      score INTEGER NOT NULL,
      correct_answers INTEGER NOT NULL,
      time_taken INTEGER NOT NULL,
      PRIMARY KEY (session_id, user_id),
      FOREIGN KEY (session_id) REFERENCES quiz_sessions(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      action TEXT NOT NULL,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);
});

// Helper functions
const logAction = (userId, action) => {
  db.run('INSERT INTO logs (user_id, action) VALUES (?, ?)', [userId, action], (err) => {
    if (err) console.error('Logging error:', err);
  });
};

const authenticateToken = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return res.sendStatus(401);
  jwt.verify(token, 'your_jwt_secret', (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

// In-memory session scores
const sessionScores = {};

// User routes
app.post('/api/users/register', async (req, res) => {
  const { username, password } = req.body;
  const hashedPassword = await bcrypt.hash(password, 10);
  db.run('INSERT INTO users (username, password) VALUES (?, ?)', [username, hashedPassword], function (err) {
    if (err) return res.status(400).json({ error: err.message });
    logAction(this.lastID, 'register');
    res.json({ id: this.lastID });
  });
});

app.post('/api/users/login', (req, res) => {
  const { username, password } = req.body;
  db.get('SELECT * FROM users WHERE username = ?', [username], async (err, user) => {
    if (err || !user) return res.status(400).json({ error: 'User not found' });
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) return res.status(400).json({ error: 'Invalid password' });
    const token = jwt.sign({ id: user.id, username: user.username }, 'your_jwt_secret', { expiresIn: '1h' });
    logAction(user.id, 'login');
    res.json({ token });
  });
});

app.get('/api/users/me', authenticateToken, (req, res) => {
  db.get('SELECT id, username, theme FROM users WHERE id = ?', [req.user.id], (err, user) => {
    if (err) return res.status(400).json({ error: err.message });
    res.json(user);
  });
});

app.put('/api/users/me/theme', authenticateToken, (req, res) => {
  const { theme } = req.body;
  db.run('UPDATE users SET theme = ? WHERE id = ?', [theme, req.user.id], function (err) {
    if (err) return res.status(400).json({ error: err.message });
    logAction(req.user.id, 'update_theme');
    res.json({ message: 'Theme updated' });
  });
});

// Quiz routes
app.post('/api/quizzes', authenticateToken, (req, res) => {
  const { questions, category, difficulty } = req.body;
  const quizId = uuidv4();
  db.run(
    'INSERT INTO quizzes (id, creator_id, questions, category, difficulty) VALUES (?, ?, ?, ?, ?)',
    [quizId, req.user.id, JSON.stringify(questions), category, difficulty],
    function (err) {
      if (err) return res.status(400).json({ error: err.message });
      logAction(req.user.id, 'create_quiz');
      res.json({ quizId });
    }
  );
});

app.get('/api/quizzes', authenticateToken, (req, res) => {
  db.all('SELECT id, category, difficulty FROM quizzes WHERE creator_id = ?', [req.user.id], (err, rows) => {
    if (err) return res.status(400).json({ error: err.message });
    res.json(rows);
  });
});

// Session routes
app.post('/api/sessions', authenticateToken, (req, res) => {
  const { quizId } = req.body;
  const sessionId = uuidv4();
  db.run('INSERT INTO quiz_sessions (id, quiz_id, creator_id, status) VALUES (?, ?, ?, ?)', [sessionId, quizId, req.user.id, 'waiting'], function (err) {
    if (err) return res.status(400).json({ error: err.message });
    logAction(req.user.id, 'create_session');
    res.json({ sessionId });
  });
});

// Leaderboard route
app.get('/api/leaderboard', (req, res) => {
  db.all('SELECT u.username, SUM(s.score) as total_score FROM scores s JOIN users u ON s.user_id = u.id GROUP BY u.id, u.username ORDER BY total_score DESC LIMIT 10', [], (err, rows) => {
    if (err) return res.status(400).json({ error: err.message });
    res.json(rows);
  });
});

// Socket.io logic
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) return next(new Error('Authentication error'));
  jwt.verify(token, 'your_jwt_secret', (err, user) => {
    if (err) return next(new Error('Authentication error'));
    socket.userId = user.id;
    next();
  });
});

io.on('connection', (socket) => {
  console.log(`User ${socket.userId} connected`);

  socket.on('joinSession', ({ sessionId }) => {
    db.get('SELECT * FROM quiz_sessions WHERE id = ?', [sessionId], (err, session) => {
      if (err || !session) return socket.emit('error', 'Session not found');
      db.run('INSERT OR IGNORE INTO quiz_session_players (session_id, user_id) VALUES (?, ?)', [sessionId, socket.userId], (err) => {
        if (err) return socket.emit('error', 'Failed to join session');
        logAction(socket.userId, 'join_session');
        socket.join(sessionId);
        db.all('SELECT user_id FROM quiz_session_players WHERE session_id = ?', [sessionId], (err, players) => {
          io.to(sessionId).emit('playerJoined', players.map((p) => p.user_id));
        });
      });
    });
  });

  socket.on('startQuiz', ({ sessionId }) => {
    db.get('SELECT * FROM quiz_sessions WHERE id = ? AND creator_id = ?', [sessionId, socket.userId], (err, session) => {
      if (err || !session) return socket.emit('error', 'Unauthorized or session not found');
      db.run('UPDATE quiz_sessions SET status = ? WHERE id = ?', ['in_progress', sessionId], (err) => {
        if (err) return socket.emit('error', 'Failed to start quiz');
        logAction(socket.userId, 'start_quiz');
        io.to(sessionId).emit('quizStarted');
      });
    });
  });

  socket.on('submitAnswer', ({ sessionId, answer }) => {
    db.get('SELECT * FROM quiz_sessions WHERE id = ?', [sessionId], (err, session) => {
      if (err || !session) return;
      const quizId = session.quiz_id;
      const currentQuestion = session.current_question;
      db.get('SELECT questions FROM quizzes WHERE id = ?', [quizId], (err, quiz) => {
        if (err || !quiz) return;
        const questions = JSON.parse(quiz.questions);
        const correctAnswer = questions[currentQuestion].correctAnswer;
        if (!sessionScores[sessionId]) sessionScores[sessionId] = {};
        if (!sessionScores[sessionId][socket.userId]) sessionScores[sessionId][socket.userId] = { score: 0, correct: 0 };
        if (answer === correctAnswer) {
          sessionScores[sessionId][socket.userId].score += 10;
          sessionScores[sessionId][socket.userId].correct += 1;
        }
        io.to(sessionId).emit('scoreUpdate', sessionScores[sessionId]);
      });
    });
  });

  socket.on('nextQuestion', ({ sessionId }) => {
    db.get('SELECT * FROM quiz_sessions WHERE id = ? AND creator_id = ?', [sessionId, socket.userId], (err, session) => {
      if (err || !session) return socket.emit('error', 'Unauthorized or session not found');
      db.run('UPDATE quiz_sessions SET current_question = current_question + 1 WHERE id = ?', [sessionId], (err) => {
        if (err) return socket.emit('error', 'Failed to advance question');
        io.to(sessionId).emit('nextQuestion', session.current_question + 1);
      });
    });
  });

  socket.on('endQuiz', ({ sessionId }) => {
    db.get('SELECT * FROM quiz_sessions WHERE id = ? AND creator_id = ?', [sessionId, socket.userId], (err, session) => {
      if (err || !session) return socket.emit('error', 'Unauthorized or session not found');
      db.run('UPDATE quiz_sessions SET status = ? WHERE id = ?', ['finished', sessionId], (err) => {
        if (err) return socket.emit('error', 'Failed to end quiz');
        const scores = sessionScores[sessionId] || {};
        for (const [userId, data] of Object.entries(scores)) {
          db.run(
            'INSERT INTO scores (session_id, user_id, score, correct_answers, time_taken) VALUES (?, ?, ?, ?, ?)',
            [sessionId, userId, data.score, data.correct, 0],
            (err) => {
              if (err) console.error('Error saving score:', err);
            }
          );
        }
        io.to(sessionId).emit('quizEnded', scores);
        delete sessionScores[sessionId];
      });
    });
  });
});

server.listen(5000, () => {
  console.log('Server running on port 5000');
});