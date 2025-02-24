## Logging Patterns

### Structured Logging Pattern

- Centralized logger configuration (backend/logger.js)
- Consistent log format across all components
- Metadata enrichment for context

### Error Handling Pattern

```javascript
try {
  // Operation
} catch (error) {
  logger.error('Operation failed', {
    error: error.message,
    stack: error.stack,
    context: { /* relevant data */ }
  });
  throw error;
}
```

### HTTP Request Logging

- Morgan middleware integration
- Request/response cycle tracking
- Performance monitoring capability

### Database Operation Logging

- Action tracking with user context
- Transaction logging
- Error state capture

### System Event Logging

- Application lifecycle events
- Configuration changes
- Security events

### Log Level Usage

- ERROR: Application failures requiring immediate attention
- WARN: Potential issues or deprecated features
- INFO: Important business events and state changes
- HTTP: API request/response details
- DEBUG: Detailed debugging information
