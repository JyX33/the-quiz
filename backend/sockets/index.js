import db from '../models/db.js';
import { logAction } from '../models/logger.js';
import { authenticateSocket } from '../middleware/auth.js';
import { logger } from '../logger.js';

// In-memory session scores
const sessionScores = {};

const setupSockets = (io) => {
  // Socket authentication middleware
  io.use(authenticateSocket);

  io.on('connection', (socket) => {
    logger.info('User connected to socket', { userId: socket.userId });

    socket.on('joinSession', ({ sessionId }) => {
      db.get('SELECT * FROM quiz_sessions WHERE id = ?', [sessionId], (err, session) => {
        if (err) {
          logger.error('Error fetching session:', { error: err.message, sessionId });
          return socket.emit('error', 'Session not found');
        }
        if (!session) {
          logger.warn('Attempt to join non-existent session:', { sessionId, userId: socket.userId });
          return socket.emit('error', 'Session not found');
        }
        
        db.run(
          'INSERT OR IGNORE INTO quiz_session_players (session_id, user_id) VALUES (?, ?)',
          [sessionId, socket.userId],
          async (err) => {
            if (err) {
              logger.error('Failed to join session:', { 
                error: err.message, 
                sessionId, 
                userId: socket.userId 
              });
              return socket.emit('error', 'Failed to join session');
            }
            await logAction(socket.userId, 'join_session');
            logger.info('User joined session:', { sessionId, userId: socket.userId });
            
            socket.join(sessionId);
            db.all(
              'SELECT user_id FROM quiz_session_players WHERE session_id = ?',
              [sessionId],
              (err, players) => {
                if (err) {
                  logger.error('Error fetching session players:', { 
                    error: err.message, 
                    sessionId 
                  });
                  return;
                }
                logger.debug('Emitting player joined event:', { 
                  sessionId, 
                  playerCount: players.length 
                });
                io.to(sessionId).emit('playerJoined', players.map((p) => p.user_id));
              }
            );
          }
        );
      });
    });

    socket.on('startQuiz', ({ sessionId }) => {
      db.get(
        'SELECT * FROM quiz_sessions WHERE id = ? AND creator_id = ?',
        [sessionId, socket.userId],
        async (err, session) => {
          if (err) {
            logger.error('Error checking session for start:', { 
              error: err.message, 
              sessionId 
            });
            return socket.emit('error', 'Failed to start quiz');
          }
          if (!session) {
            logger.warn('Unauthorized quiz start attempt:', { 
              sessionId, 
              userId: socket.userId 
            });
            return socket.emit('error', 'Unauthorized or session not found');
          }
          
          db.run(
            'UPDATE quiz_sessions SET status = ? WHERE id = ?',
            ['in_progress', sessionId],
            async (err) => {
              if (err) return socket.emit('error', 'Failed to start quiz');
              await logAction(socket.userId, 'start_quiz');
              io.to(sessionId).emit('quizStarted');
            }
          );
        }
      );
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
          if (!sessionScores[sessionId][socket.userId]) {
            sessionScores[sessionId][socket.userId] = { score: 0, correct: 0 };
          }

          if (answer === correctAnswer) {
            sessionScores[sessionId][socket.userId].score += 10;
            sessionScores[sessionId][socket.userId].correct += 1;
          }

          io.to(sessionId).emit('scoreUpdate', sessionScores[sessionId]);
        });
      });
    });

    socket.on('nextQuestion', ({ sessionId }) => {
      db.get(
        'SELECT * FROM quiz_sessions WHERE id = ? AND creator_id = ?',
        [sessionId, socket.userId],
        (err, session) => {
          if (err || !session) return socket.emit('error', 'Unauthorized or session not found');
          
          db.run(
            'UPDATE quiz_sessions SET current_question = current_question + 1 WHERE id = ?',
            [sessionId],
            (err) => {
              if (err) return socket.emit('error', 'Failed to advance question');
              io.to(sessionId).emit('nextQuestion', session.current_question + 1);
            }
          );
        }
      );
    });

    socket.on('endQuiz', ({ sessionId }) => {
      db.get(
        'SELECT * FROM quiz_sessions WHERE id = ? AND creator_id = ?',
        [sessionId, socket.userId],
        (err, session) => {
          if (err || !session) return socket.emit('error', 'Unauthorized or session not found');
          
          db.run(
            'UPDATE quiz_sessions SET status = ? WHERE id = ?',
            ['finished', sessionId],
            async (err) => {
              if (err) return socket.emit('error', 'Failed to end quiz');
              
              const scores = sessionScores[sessionId] || {};
              const savePromises = Object.entries(scores).map(([userId, data]) => {
                return new Promise((resolve, reject) => {
                  db.run(
                    'INSERT INTO scores (session_id, user_id, score, correct_answers, time_taken) VALUES (?, ?, ?, ?, ?)',
                    [sessionId, userId, data.score, data.correct, 0],
                    (err) => {
                      if (err) reject(err);
                      else resolve();
                    }
                  );
                });
              });

              try {
                await Promise.all(savePromises);
                io.to(sessionId).emit('quizEnded', scores);
                delete sessionScores[sessionId];
              } catch (err) {
logger.error('Error saving quiz scores:', { 
  error: err.message, 
  sessionId, 
  playerCount: Object.keys(scores).length 
});
                socket.emit('error', 'Failed to save scores');
              }
            }
          );
        }
      );
    });

    socket.on('disconnect', () => {
    logger.info('User disconnected from socket', { userId: socket.userId });
    });
  });
};

export default setupSockets;
