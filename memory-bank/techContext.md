# Logging Infrastructure

### Core Components

- Winston logger for structured logging
- Morgan for HTTP request logging
- Custom logging format with metadata support

### Configuration

- Environment-aware logging levels
- Separate error and combined log files
- Configurable formats in config/config.js
- Configurable port in config/config.js

### Integration Points

- Database operations logging
- HTTP request tracking
- Error handling and exceptions
- Socket.io events (via Winston)

### Log File Structure

- Location: backend/logs/
- error.log: Critical errors only
- all.log: Complete application logs

### Best Practices

- Use appropriate log levels (error, warn, info, http, debug)
- Include relevant metadata with logs
- Structured JSON format for machine parsing
- Color-coded console output for development
