// This file is kept for backward compatibility
// The logging functionality has been consolidated in the main logger.js file

import db from './db.js';
import { logger, logUserAction } from '../logger.js';

// Re-export logAction but use the unified implementation
const logAction = (userId, action) => logUserAction(db, userId, action);

export { logAction };