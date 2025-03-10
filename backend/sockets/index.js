import { logUserAction, logger } from '../logger.js';
import { authenticateSocket } from '../middleware/auth.js';
import db, { runTransaction } from '../models/db.js';

// In-memory session scores, question tracking, and bonus tracking
const sessionScores = {};
const sessionResponses = {}; // Track responses per question
const lastHeartbeat = {};
const sessionBonuses = {}; // Track bonus usage per session
const MAX_BONUSES = 3;

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
                await logUserAction(socket.userId, 'join_session');
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

                      // Initialize player bonuses
                      db.run(
                        'INSERT OR IGNORE INTO player_bonuses (session_id, user_id, bonuses_used, bonus_active) VALUES (?, ?, 0, 0)',
                        [sessionId, socket.userId],
                        (err) => {
                          if (err) {
                            logger.error('Error initializing player bonuses:', {
                              error: err.message,
                              sessionId,
                              userId: socket.userId
                            });
                          }

                          // Initialize in-memory bonus tracking
                          if (!sessionBonuses[sessionId]) {
                            sessionBonuses[sessionId] = {};
                          }
                          sessionBonuses[sessionId][socket.userId] = {
                            bonusesUsed: 0,
                            bonusActive: false
                          };
                        }
                      );
                      
                      // Always emit the latest scores to all clients
                      io.to(sessionId).emit('scoreUpdate', sessionScores[sessionId] || {});

                      // Send initial bonus info to the player
                      socket.emit('bonusInfo', {
                        bonusesRemaining: MAX_BONUSES,
                        bonusActive: false
                      });
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
              await logUserAction(socket.userId, 'leave_session');
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
        // Log the request with more detail
        logger.debug('Start quiz request received:', {
          sessionId,
          userId: socket.userId,
          username: socket.username
        });

        // First check if the session exists, regardless of creator
        db.get(
          'SELECT * FROM quiz_sessions WHERE id = ?',
          [sessionId],
          async (err, session) => {
            if (err) {
              logger.error('Error checking session for start:', { 
                error: err.message, 
                sessionId 
              });
              return socket.emit('error', 'Failed to start quiz');
            }
            
            if (!session) {
              logger.warn('Quiz start attempt for non-existent session:', { 
                sessionId, 
                userId: socket.userId 
              });
              return socket.emit('error', 'Session not found');
            }
            
            // Now check if user is authorized to start the quiz
            // Either they are the creator or an admin (checking creator_id is safe)
            if (session.creator_id !== socket.userId) {
              // Log the discrepancy in detail
              logger.warn('Unauthorized quiz start attempt:', { 
                sessionId, 
                userId: socket.userId,
                creatorId: session.creator_id,
                reason: 'User is not the session creator'
              });
              return socket.emit('error', 'You are not authorized to start this quiz');
            }
            
            // If we get here, the user is authorized to start the quiz
            db.run(
              'UPDATE quiz_sessions SET status = ? WHERE id = ?',
              ['in_progress', sessionId],
              async (err) => {
                if (err) {
                  logger.error('Failed to update session status:', {
                    error: err.message,
                    sessionId
                  });
                  return socket.emit('error', 'Failed to start quiz');
                }
                
                try {
                  await logUserAction(socket.userId, 'start_quiz');
                  logger.info('Quiz started successfully:', {
                    sessionId,
                    startedBy: socket.userId
                  });
                  io.to(sessionId).emit('quizStarted');
                } catch (error) {
                  logger.error('Error logging start quiz action:', { 
                    error: error.message, 
                    sessionId, 
                    userId: socket.userId 
                  });
                  // Still emit the event since the database operation succeeded
                  io.to(sessionId).emit('quizStarted');
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
            
            const currentQuestion = session.current_question;
            
            // Reset responses tracking for this question - IMPROVED initialization
            if (!sessionResponses[sessionId]) {
              sessionResponses[sessionId] = {};
            }
            
            // Initialize this question's responses as a new Set
            sessionResponses[sessionId][currentQuestion] = new Set();
            
            logger.debug('Initialized response tracking for question:', {
              sessionId,
              questionNumber: currentQuestion
            });
            
            // Notify all players that question has started
            io.to(sessionId).emit('questionStarted');
            logger.info('Question started:', { 
              sessionId, 
              questionNumber: currentQuestion 
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
          if (err || !session) {
            logger.warn('Answer submitted for non-existent session:', { sessionId, userId: socket.userId });
            return socket.emit('error', 'Session not found');
          }
          
          const quizId = session.quiz_id;
          const currentQuestion = session.current_question;
          
          // Track that this player has responded - with null checking
          if (!sessionResponses[sessionId]) {
            sessionResponses[sessionId] = {};
          }
          if (!sessionResponses[sessionId][currentQuestion]) {
            sessionResponses[sessionId][currentQuestion] = new Set();
          }
          sessionResponses[sessionId][currentQuestion].add(socket.userId);
    
          db.get('SELECT questions FROM quizzes WHERE id = ?', [quizId], (err, quiz) => {
            if (err) {
              logger.error('Database error fetching quiz questions:', { 
                error: err.message, 
                quizId,
                sessionId
              });
              return;
            }
            
            if (!quiz) {
              logger.error('Quiz not found:', { quizId, sessionId });
              return;
            }
            
            try {
              // Parse the questions
              let questions;
              try {
                questions = JSON.parse(quiz.questions);
              } catch (parseError) {
                logger.error('Error parsing quiz questions JSON:', {
                  error: parseError.message,
                  quizId,
                  sessionId
                });
                return;
              }
              
              // Check if the current question index is valid
              if (!questions || !Array.isArray(questions) || currentQuestion >= questions.length) {
                logger.error('Invalid question index:', {
                  currentQuestion,
                  questionsLength: questions ? questions.length : 0,
                  quizId,
                  sessionId
                });
                return;
              }
              
              // Check if the question has a correctAnswer property
              const questionData = questions[currentQuestion];
              if (!questionData || typeof questionData.correctAnswer === 'undefined') {
                logger.error('Question missing correctAnswer property:', {
                  questionData: JSON.stringify(questionData),
                  currentQuestion,
                  quizId,
                  sessionId
                });
                return;
              }
              
              const correctAnswer = questionData.correctAnswer;
    
              // Initialize scores structure if needed
              if (!sessionScores[sessionId]) {
                sessionScores[sessionId] = {};
              }
              if (!sessionScores[sessionId][socket.userId]) {
                sessionScores[sessionId][socket.userId] = { score: 0, correct: 0 };
              }
    
              // Check if bonus is active for this player
              const playerBonus = sessionBonuses[sessionId]?.[socket.userId];
              let bonusActive = false;
              let pointsEarned = 0;

              // Award points for correct answer
              if (answer === correctAnswer) {
                // Base points
                pointsEarned = 10;

                // Check if bonus should be applied
                if (playerBonus?.bonusActive) {
                  pointsEarned *= 2; // Double points with bonus
                  bonusActive = true;
                }

                sessionScores[sessionId][socket.userId].score += pointsEarned;
                sessionScores[sessionId][socket.userId].correct += 1;
                
                logger.debug('Correct answer submitted:', {
                  userId: socket.userId,
                  question: currentQuestion,
                  sessionId,
                  pointsEarned,
                  bonusActive
                });
              } else {
                logger.debug('Incorrect answer submitted:', {
                  userId: socket.userId,
                  question: currentQuestion,
                  answer,
                  correctAnswer,
                  sessionId,
                  bonusActive
                });
              }

              // If bonus was active, consume it and increment usage
              if (bonusActive) {
                db.run(
                  'UPDATE player_bonuses SET bonus_active = 0, bonuses_used = bonuses_used + 1 WHERE session_id = ? AND user_id = ?',
                  [sessionId, socket.userId],
                  (err) => {
                    if (err) {
                      logger.error('Error updating bonus usage:', {
                        error: err.message,
                        sessionId,
                        userId: socket.userId
                      });
                    } else {
                      // Update in-memory bonus tracking
                      if (sessionBonuses[sessionId]?.[socket.userId]) {
                        sessionBonuses[sessionId][socket.userId].bonusActive = false;
                        sessionBonuses[sessionId][socket.userId].bonusesUsed += 1;

                        // Notify player of updated bonus status
                        socket.emit('bonusInfo', {
                          bonusesRemaining: MAX_BONUSES - sessionBonuses[sessionId][socket.userId].bonusesUsed,
                          bonusActive: false
                        });
                      }
                    }
                  }
                );
              }
              
              // Persist scores to database
              const playerScore = sessionScores[sessionId][socket.userId];
              persistSessionScores(
                sessionId, 
                socket.userId, 
                playerScore.score, 
                playerScore.correct
              );
    
              // Update everyone with the new scores
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
                    logger.info('All players responded to question:', {
                      sessionId,
                      question: currentQuestion,
                      playerCount: allPlayers.length
                    });
                    io.to(sessionId).emit('allPlayersResponded');
                  }
                }
              );
            } catch (error) {
              logger.error('Error processing quiz answer:', { 
                error: error.message,
                stack: error.stack,
                sessionId, 
                userId: socket.userId,
                currentQuestion
              });
            }
          });
        });
      } catch (error) {
        logger.error('Error in submitAnswer handler:', { 
          error: error.message,
          stack: error.stack,
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
            if (err || !session) {
              logger.warn('Unauthorized next question attempt:', { 
                sessionId, 
                userId: socket.userId 
              });
              return socket.emit('error', 'Unauthorized or session not found');
            }
            
            // Get current question and quiz info to check bounds
            const currentQuestion = session.current_question;
            const quizId = session.quiz_id;
            
            // Get quiz details to check number of questions
            db.get(
              'SELECT questions FROM quizzes WHERE id = ?',
              [quizId],
              (err, quiz) => {
                if (err || !quiz) {
                  logger.error('Failed to fetch quiz details for next question:', {
                    error: err ? err.message : 'Quiz not found',
                    quizId,
                    sessionId
                  });
                  return socket.emit('error', 'Could not advance to next question');
                }
                
                let questions;
                try {
                  questions = JSON.parse(quiz.questions);
                } catch (parseError) {
                  logger.error('Error parsing quiz questions:', {
                    error: parseError.message,
                    quizId,
                    sessionId
                  });
                  return socket.emit('error', 'Error processing quiz data');
                }
                
                // Check if we've reached the end of questions
                if (!Array.isArray(questions) || currentQuestion + 1 >= questions.length) {
                  logger.info('Reached end of questions:', {
                    currentQuestion,
                    totalQuestions: Array.isArray(questions) ? questions.length : 0,
                    sessionId
                  });
                  
                  // Notify client that we've reached the end
                  socket.emit('error', 'No more questions available. Please end the quiz.');
                  return;
                }
                
                // Safe to proceed to next question
                db.run(
                  'UPDATE quiz_sessions SET current_question = current_question + 1 WHERE id = ?',
                  [sessionId],
                  (err) => {
                    if (err) {
                      logger.error('Failed to advance question:', {
                        error: err.message,
                        sessionId
                      });
                      return socket.emit('error', 'Failed to advance question');
                    }
                    
                    logger.info('Advanced to next question:', {
                      sessionId,
                      newQuestion: currentQuestion + 1,
                      totalQuestions: questions.length
                    });
                    
                    io.to(sessionId).emit('nextQuestion', currentQuestion + 1);
                  }
                );
              }
            );
          }
        );
      } catch (error) {
        logger.error('Error in nextQuestion handler:', { 
          error: error.message,
          stack: error.stack,
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
                      // Use INSERT OR REPLACE instead of INSERT to handle existing scores
                      db.run(
                        'INSERT OR REPLACE INTO scores (session_id, user_id, score, correct_answers, time_taken) VALUES (?, ?, ?, ?, ?)',
                        [sessionId, userId, data.score, data.correct, 0],
                        (err) => {
                          completed++;
                          
                          if (err && !hasError) {
                            hasError = true;
                            logger.error('Error saving score:', {
                              error: err.message,
                              sessionId,
                              userId
                            });
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
              
              // Clean up in-memory data
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

    socket.on('activateBonus', ({ sessionId }) => {
      try {
        // Check if player has bonuses available
        db.get(
          'SELECT bonuses_used, bonus_active FROM player_bonuses WHERE session_id = ? AND user_id = ?',
          [sessionId, socket.userId],
          (err, bonusData) => {
            if (err || !bonusData) {
              logger.error('Error fetching bonus data:', {
                error: err ? err.message : 'No bonus data found',
                sessionId,
                userId: socket.userId
              });
              return socket.emit('error', 'Could not activate bonus');
            }

            if (bonusData.bonuses_used >= MAX_BONUSES) {
              return socket.emit('error', 'No bonuses remaining');
            }

            if (bonusData.bonus_active) {
              return socket.emit('error', 'Bonus already active');
            }

            // Update bonus status in database
            db.run(
              'UPDATE player_bonuses SET bonus_active = 1 WHERE session_id = ? AND user_id = ?',
              [sessionId, socket.userId],
              (err) => {
                if (err) {
                  logger.error('Error activating bonus:', {
                    error: err.message,
                    sessionId,
                    userId: socket.userId
                  });
                  return socket.emit('error', 'Failed to activate bonus');
                }

                // Update in-memory bonus tracking
                if (!sessionBonuses[sessionId]) {
                  sessionBonuses[sessionId] = {};
                }
                if (!sessionBonuses[sessionId][socket.userId]) {
                  sessionBonuses[sessionId][socket.userId] = {
                    bonusesUsed: bonusData.bonuses_used,
                    bonusActive: true
                  };
                } else {
                  sessionBonuses[sessionId][socket.userId].bonusActive = true;
                }

                socket.emit('bonusInfo', {
                  bonusesRemaining: MAX_BONUSES - bonusData.bonuses_used,
                  bonusActive: true
                });

                logger.info('Bonus activated:', {
                  sessionId,
                  userId: socket.userId,
                  bonusesUsed: bonusData.bonuses_used
                });
              }
            );
          }
        );
      } catch (error) {
        logger.error('Error in activateBonus handler:', {
          error: error.message,
          userId: socket.userId
        });
        socket.emit('error', 'Failed to process bonus activation');
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