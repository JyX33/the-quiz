# backend

To install dependencies:

```bash
bun install
```

To run:

```bash
bun run index.ts
```

This project was created using `bun init` in bun v1.2.0. [Bun](https://bun.sh) is a fast all-in-one JavaScript runtime.

## Logging

The application uses a structured logging system with the following components:

### Winston Logger

- Multiple log levels (error, warn, info, http, debug)
- Console output for development
- Separate log files for errors and combined logs
- JSON-formatted logs with metadata
- Timestamp and colorized output

### Morgan HTTP Logger

- HTTP request logging integrated with Winston
- Development mode: detailed request information
- Production mode: Apache-style combined format

### Log Files

Located in the `logs` directory:

- `error.log`: Contains only error-level logs
- `all.log`: Contains all log levels

### Configuration

Logging settings can be configured in `config/config.js`:

- Log levels based on environment
- File paths for logs
- Morgan format settings

### Usage Example

```javascript
import { logger } from './logger.js';

// Basic logging
logger.info('Operation successful');

// Logging with metadata
logger.error('Operation failed', {
  error: err.message,
  stack: err.stack,
  userId: user.id
});
```
