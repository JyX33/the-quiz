import { logAction, logger } from '../logger.js';
import { authenticateSocket } from '../middleware/auth.js';
import db, { runTransaction } from '../models/db.js';

// In-memory session scores and question tracking
const sessionScores = {};
const sessionResponses = {}; // Track responses per question
const lastHeartbeat = {};

// Function to persist session scores to database periodically
const persistSessionScores = (sessionId, userId, score, correct) => {
  try {
    db.run(
      'INSERT OR REPLACE INTO scores (session_id, user_id, score, correct_answers, time_taken) VALUES (?, ?, ?, ?, ?)',
      [sessionId, userId, score, correct, 0],
      (err) => {
        if (err) {
          logger.error('Failed to persist score:', {
            error: err.message,
            sessionId,
            userId
          });
        } else {
          logger.debug('Score persisted to database:', {
            sessionId,
            userId,
            score,
            correct
          });
        }
      }
    );
  } catch (error) {
    logger.error('Error in score persistence:', {
      error: error.message,
      sessionId,
      userId
    });
  }
};

const setupSockets = (io) => {
  // Socket authentication middleware
  io.use(authenticateSocket);

  io.on('connection', (socket) => {
    logger.info('User connected to socket', { userId: socket.userId });

    // Heartbeat handling
    socket.on('heartbeat', () => {
      try {
        lastHeartbeat[socket.userId] = Date.now();
      } catch (error) {
        logger.error('Error processing heartbeat:', { error: error.message, userId: socket.userId });
        socket.emit('error', 'Failed to process heartbeat');
      }
    });

    socket.on('joinSession', ({ sessionId }) => {
      try {
        db.get('SELECT * FROM quiz_sessions WHERE id = ?', [sessionId], (err, session) => {
          if (err) {
            logger.error('Error fetching session:', { error: err.message, sessionId });
            return socket.emit('error', 'Session not found');
          }
          if (!session) {
            logger.warn('Attempt to join non-existent session:', { sessionId, userId: socket.userId });
            return socket.emit('error', 'Session not found');
          }

          if (session.status === 'in_progress') {
            // Get the current question
            const currentQuestion = session.current_question;
            
            // Get the quiz data to know total questions
            db.get(
              'SELECT questions FROM quizzes WHERE id = ?',
              [session.quiz_id],
              (err, quiz) => {
                if (err || !quiz) return;
                
                try {
                  const questions = JSON.parse(quiz.questions);
                  
                  // Send the current quiz state to the reconnecting user
                  socket.emit('quizStateRestored', {
                    currentQuestion,
                    totalQuestions: questions.length,
                    question: questions[currentQuestion]
                  });
                } catch (error) {
                  logger.error('Error parsing quiz questions:', {
                    error: error.message,
                    sessionId,
                    userId: socket.userId
                  });
                }
              }
            );
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
              try {
                await logAction(socket.userId, 'join_session');
                logger.info('User joined session:', { sessionId, userId: socket.userId });
                
                socket.join(sessionId);
                
                // Retrieve existing scores for this session if any exist
                if (session.status === 'in_progress') {
                  db.get(
                    'SELECT score, correct_answers FROM scores WHERE session_id = ? AND user_id = ?',
                    [sessionId, socket.userId],
                    (err, scoreData) => {
                      if (err) {
                        logger.error('Error retrieving scores on reconnect:', {
                          error: err.message,
                          sessionId,
                          userId: socket.userId
                        });
                      } else if (scoreData) {
                        // Initialize the in-memory score from persisted data
                        if (!sessionScores[sessionId]) {
                          sessionScores[sessionId] = {};
                        }
                        sessionScores[sessionId][socket.userId] = {
                          score: scoreData.score,
                          correct: scoreData.correct_answers
                        };
                        
                        logger.info('Restored player scores from database:', {
                          sessionId,
                          userId: socket.userId,
                          score: scoreData.score
                        });
                        
                        // Notify the reconnected user of their current score
                        socket.emit('scoreRestored', {
                          score: scoreData.score,
                          correct: scoreData.correct_answers
                        });
                      } else {
                        // No existing score, initialize with zero
                        if (!sessionScores[sessionId]) {
                          sessionScores[sessionId] = {};
                        }
                        if (!sessionScores[sessionId][socket.userId]) {
                          sessionScores[sessionId][socket.userId] = { score: 0, correct: 0 };
                        }
                      }
                      
                      // Always emit the latest scores to all clients
                      io.to(sessionId).emit('scoreUpdate', sessionScores[sessionId] || {});
                    }
                  );
                }
                
                db.all(
                  'SELECT qsp.user_id, u.username FROM quiz_session_players qsp JOIN users u ON qsp.user_id = u.id WHERE qsp.session_id = ?',
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
                    io.to(sessionId).emit('playerJoined', players.map((p) => ({ id: p.user_id, username: p.username })));
                  }
                );
              } catch (error) {
                logger.error('Error in join session process:', { 
                  error: error.message, 
                  sessionId, 
                  userId: socket.userId 
                });
                socket.emit('error', 'Error completing join session');
              }
            }
          );
        });
      } catch (error) {
        logger.error('Error in joinSession handler:', { 
          error: error.message, 
          userId: socket.userId 
        });
        socket.emit('error', 'Failed to process join request');
      }
    });

    socket.on('leaveSession', ({ sessionId }) => {
      try {
        logger.info('User leaving session:', { sessionId, userId: socket.userId });
        db.run(
          'DELETE FROM quiz_session_players WHERE session_id = ? AND user_id = ?',
          [sessionId, socket.userId],
          async (err) => {
            if (err) {
              logger.error('Failed to leave session:', {
                error: err.message,
                sessionId,
                userId: socket.userId
              });
              return socket.emit('error', 'Failed to leave session');
            }
            try {
              await logAction(socket.userId, 'leave_session');
              logger.info('User left session successfully:', { sessionId, userId: socket.userId });

              db.all(
                'SELECT qsp.user_id, u.username FROM quiz_session_players qsp JOIN users u ON qsp.user_id = u.id WHERE qsp.session_id = ?',
                [sessionId],
                (err, players) => {
                  if (err) {
                    logger.error('Error fetching session players:', {
                      error: err.message,
                      sessionId
                    });
                    return;
                  }
                  logger.debug('Emitting player left event:', {
                    sessionId,
                    playerCount: players.length
                  });
                  io.to(sessionId).emit('playerLeft', players.map((p) => ({ id: p.user_id, username: p.username })));
                }
              );
            } catch (error) {
              logger.error('Error in leave session process:', { 
                error: error.message, 
                sessionId, 
                userId: socket.userId 
              });
              socket.emit('error', 'Error completing leave session');
            }
          }
        );
      } catch (error) {
        logger.error('Error in leaveSession handler:', { 
          error: error.message, 
          userId: socket.userId 
        });
        socket.emit('error', 'Failed to process leave request');
      }
    });

    socket.on('startQuiz', ({ sessionId }) => {
      try {
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
                try {
                  await logAction(socket.userId, 'start_quiz');
                  io.to(sessionId).emit('quizStarted');
                } catch (error) {
                  logger.error('Error logging start quiz action:', { 
                    error: error.message, 
                    sessionId, 
                    userId: socket.userId 
                  });
                }
              }
            );
          }
        );
      } catch (error) {
        logger.error('Error in startQuiz handler:', { 
          error: error.message, 
          userId: socket.userId 
        });
        socket.emit('error', 'Failed to process start quiz request');
      }
    });

    socket.on('startQuestion', ({ sessionId }) => {
      try {
        db.get(
          'SELECT * FROM quiz_sessions WHERE id = ? AND creator_id = ?',
          [sessionId, socket.userId],
          (err, session) => {
            if (err || !session) {
              logger.warn('Unauthorized question start attempt:', { 
                sessionId, 
                userId: socket.userId 
              });
              return socket.emit('error', 'Unauthorized or session not found');
            }
            
            // Reset responses tracking for this question
            if (!sessionResponses[sessionId]) {
              sessionResponses[sessionId] = {};
            }
            sessionResponses[sessionId][session.current_question] = new Set();
            
            // Notify all players that question has started
            io.to(sessionId).emit('questionStarted');
            logger.info('Question started:', { 
              sessionId, 
              questionNumber: session.current_question 
            });
          }
        );
      } catch (error) {
        logger.error('Error in startQuestion handler:', { 
          error: error.message, 
          userId: socket.userId 
        });
        socket.emit('error', 'Failed to process start question request');
      }
    });

    socket.on('submitAnswer', ({ sessionId, answer }) => {
      try {
        db.get('SELECT * FROM quiz_sessions WHERE id = ?', [sessionId], (err, session) => {
          if (err || !session) return;
          const quizId = session.quiz_id;
          const currentQuestion = session.current_question;

          // Track that this player has responded
          if (sessionResponses[sessionId]?.[currentQuestion]) {
            sessionResponses[sessionId][currentQuestion].add(socket.userId);
          }

          db.get('SELECT questions FROM quizzes WHERE id = ?', [quizId], (err, quiz) => {
            if (err || !quiz) return;
            try {
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
              
              // Persist scores to database with each submission
              const playerScore = sessionScores[sessionId][socket.userId];
              persistSessionScores(
                sessionId, 
                socket.userId, 
                playerScore.score, 
                playerScore.correct
              );

              io.to(sessionId).emit('scoreUpdate', sessionScores[sessionId]);

              // Check if all players have responded
              db.all(
                'SELECT user_id FROM quiz_session_players WHERE session_id = ?',
                [sessionId],
                (err, players) => {
                  if (err) return;
                  const allPlayers = players.map(p => p.user_id);
                  const respondedPlayers = sessionResponses[sessionId][currentQuestion];
                  
                  if (respondedPlayers && allPlayers.every(id => respondedPlayers.has(id))) {
                    // All players have responded, notify the room
                    io.to(sessionId).emit('allPlayersResponded');
                  }
                }
              );
            } catch (error) {
              logger.error('Error processing quiz answer:', { 
                error: error.message, 
                sessionId, 
                userId: socket.userId 
              });
            }
          });
        });
      } catch (error) {
        logger.error('Error in submitAnswer handler:', { 
          error: error.message, 
          userId: socket.userId 
        });
        socket.emit('error', 'Failed to process answer submission');
      }
    });

    socket.on('nextQuestion', ({ sessionId }) => {
      try {
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
      } catch (error) {
        logger.error('Error in nextQuestion handler:', { 
          error: error.message, 
          userId: socket.userId 
        });
        socket.emit('error', 'Failed to process next question request');
      }
    });

    socket.on('endQuiz', ({ sessionId }) => {
      try {
        db.get(
          'SELECT * FROM quiz_sessions WHERE id = ? AND creator_id = ?',
          [sessionId, socket.userId],
          (err, session) => {
            if (err || !session) return socket.emit('error', 'Unauthorized or session not found');
            
            runTransaction(() => {
              return new Promise((resolve, reject) => {
                // First update the session status to finished
                db.run(
                  'UPDATE quiz_sessions SET status = ? WHERE id = ?',
                  ['finished', sessionId],
                  (err) => {
                    if (err) {
                      reject(err);
                      return;
                    }
                    
                    const scores = sessionScores[sessionId] || {};
                    const playerIds = Object.keys(scores);
                    
                    if (playerIds.length === 0) {
                      // No scores to save
                      resolve();
                      return;
                    }
                    
                    // Use a counter to track when all scores are saved
                    let completed = 0;
                    let hasError = false;
                    
                    playerIds.forEach((userId) => {
                      const data = scores[userId];
                      db.run(
                        'INSERT INTO scores (session_id, user_id, score, correct_answers, time_taken) VALUES (?, ?, ?, ?, ?)',
                        [sessionId, userId, data.score, data.correct, 0],
                        (err) => {
                          completed++;
                          
                          if (err && !hasError) {
                            hasError = true;
                            reject(err);
                            return;
                          }
                          
                          if (completed === playerIds.length && !hasError) {
                            // Log the action
                            db.run(
                              'INSERT INTO logs (user_id, action) VALUES (?, ?)',
                              [socket.userId, 'end_quiz'],
                              (err) => {
                                if (err) reject(err);
                                else resolve();
                              }
                            );
                          }
                        }
                      );
                    });
                  }
                );
              });
            })
            .then(() => {
              const scores = sessionScores[sessionId] || {};
              io.to(sessionId).emit('quizEnded', scores);
              delete sessionScores[sessionId];
              delete sessionResponses[sessionId];
              logger.info('Quiz ended successfully:', { 
                sessionId, 
                userId: socket.userId,
                playerCount: Object.keys(scores).length
              });
            })
            .catch((err) => {
              logger.error('Error saving quiz scores:', { 
                error: err.message, 
                sessionId, 
                userId: socket.userId
              });
              socket.emit('error', 'Failed to save scores');
            });
          }
        );
      } catch (error) {
        logger.error('Error in endQuiz handler:', { 
          error: error.message, 
          userId: socket.userId 
        });
        socket.emit('error', 'Failed to process end quiz request');
      }
    });

    socket.on('disconnect', () => {
      try {
        logger.info('User disconnected from socket', { userId: socket.userId });
      } catch (error) {
        logger.error('Error handling socket disconnect:', { 
          error: error.message,
          userId: socket.userId ? socket.userId : 'unknown'
        });
      }
    });
  });
};

// Setup a periodic task to persist scores
function setupScorePersistence(intervalMs = 30000) { // Default: 30 seconds
  setInterval(() => {
    try {
      for (const sessionId in sessionScores) {
        for (const userId in sessionScores[sessionId]) {
          const { score, correct } = sessionScores[sessionId][userId];
          persistSessionScores(sessionId, userId, score, correct);
        }
      }
    } catch (error) {
      logger.error('Error in score persistence interval:', { error: error.message });
    }
  }, intervalMs);
}

const SESSION_TIMEOUT = 15000; // 15 seconds

function cleanupInactiveSessions(io) {
  setInterval(() => {
    try {
      const now = Date.now();

      for (const userId in lastHeartbeat) {
        if (now - lastHeartbeat[userId] > SESSION_TIMEOUT) {
          logger.warn('Disconnecting inactive user:', { userId });
          delete lastHeartbeat[userId];

          // Find the session and remove the player
          db.get(
            'SELECT session_id FROM quiz_session_players WHERE user_id = ?',
            [userId],
            (err, result) => {
              if (err) {
                logger.error('Error finding session for inactive user:', {
                  error: err.message,
                  userId
                });
                return;
              }

              if (result) {
                const { session_id } = result;

                db.run(
                  'DELETE FROM quiz_session_players WHERE session_id = ? AND user_id = ?',
                  [session_id, userId],
                  (err) => {
                    if (err) {
                      logger.error('Error removing inactive user from session:', {
                        error: err.message,
                        userId,
                        sessionId: session_id
                      });
                      return;
                    }
                    logger.info('Removed inactive user from session:', { userId, sessionId: session_id });
                    io.to(session_id).emit('playerLeft', userId); // Notify other clients
                  }
                );

                // Check if the session is now empty
                db.get(
                  'SELECT COUNT(*) AS count FROM quiz_session_players WHERE session_id = ?',
                  [session_id],
                  (err, result) => {
                    if (err) {
                      logger.error('Error counting players in session:', {
                        error: err.message,
                        sessionId: session_id
                      });
                      return;
                    }

                    if (result.count === 0) {
                      logger.info('Cleaning up empty session:', { sessionId: session_id });
                      // Optionally, perform cleanup actions like marking the session as finished
                      // or deleting the session from the database
                    }
                  }
                );
              }
            }
          );
        }
      }
    } catch (error) {
      logger.error('Error in cleanup inactive sessions:', { error: error.message });
    }
  }, 10000); // Check every 10 seconds
}

export default (io) => {
  setupSockets(io);
  setupScorePersistence(); // Start score persistence
  cleanupInactiveSessions(io);
};