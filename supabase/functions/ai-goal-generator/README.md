# AI Goal Generator V2 - Bulletproof Architecture

## Overview

Enterprise-grade AI goal generator with bulletproof architecture, ACID transactions, and comprehensive error handling.

## Architecture Principles

- **Single Responsibility**: Each component has one clear purpose
- **ACID Compliance**: Database transactions ensure data consistency  
- **Circuit Breaker**: Graceful AI service degradation
- **Structured Logging**: Production-ready monitoring
- **Error Boundaries**: Consistent error handling and user experience

## Components

### Core Services
- **`index.ts`** - Main request handler and CORS management
- **`orchestrator.ts`** - Business logic coordinator  
- **`ai-service.ts`** - Gemini AI integration with circuit breaker
- **`database-service.ts`** - ACID transaction management
- **`data-mapper.ts`** - AI response to database entity mapping

### Support Services  
- **`validator.ts`** - Request validation and sanitization
- **`error-handler.ts`** - Centralized error management
- **`logger.ts`** - Structured logging for monitoring
- **`schema.ts`** - AI function calling schema definition

### Database
- **PostgreSQL Stored Procedure**: `create_complete_financial_goal()` ensures atomic operations

## Data Flow

```
Request → Validation → AI Generation → Data Mapping → Database Transaction → Response
```

## Error Handling Strategy

- **Circuit Breaker**: AI failures automatically trigger fallback responses
- **Database Rollback**: Any database error rolls back the entire transaction
- **Graceful Degradation**: System continues operating even with partial failures
- **User-Friendly Messages**: Technical errors mapped to clear user messaging

## Deployment

### Prerequisites
1. Supabase project with required database tables
2. GEMINI_API_KEY environment variable
3. Supabase service role key

### Database Setup
```sql
-- Run migration to create stored procedure
psql -f supabase/migrations/20250820_create_goal_transaction_procedure.sql
```

### Environment Variables
```bash
GEMINI_API_KEY=your_gemini_api_key
SUPABASE_URL=your_supabase_url  
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
ENVIRONMENT=production
```

### Deployment Command
```bash
supabase functions deploy ai-goal-generator
```

## Testing

### Health Check
```bash
curl https://your-project.supabase.co/functions/v1/ai-goal-generator
```

### Goal Generation Test
```bash
curl -X POST https://your-project.supabase.co/functions/v1/ai-goal-generator \
  -H "Content-Type: application/json" \
  -d '{
    "goalType": "retirement",
    "questionnaireAnswers": {
      "current_age": 30,
      "retirement_age": 65,
      "monthly_income": 5000,
      "current_savings": 10000
    }
  }'
```

## Monitoring

### Log Structure
All logs are JSON structured with:
- `timestamp`: ISO 8601 timestamp
- `level`: DEBUG, INFO, WARN, ERROR  
- `service`: ai-goal-generator
- `message`: Human readable message
- `requestId`: Unique request identifier
- Additional context fields

### Key Metrics
- Request success/failure rates
- AI generation response times
- Database operation latencies  
- Circuit breaker state changes
- Error categorization

### Alerting
Monitor for:
- Error rate > 5%
- AI service circuit breaker opening
- Database transaction failures
- Response times > 30 seconds

## Performance Characteristics

- **Target Response Time**: < 5 seconds
- **AI Generation**: < 3 seconds (with fallback)
- **Database Operations**: < 1 second
- **Throughput**: 100+ requests/minute
- **Availability**: 99.9% (with circuit breaker)

## Security

- Row Level Security (RLS) on all database tables
- Input validation and sanitization
- Structured error responses (no data leakage)
- Service role authentication for database operations

## Troubleshooting

### Common Issues

1. **AI Generation Failures**
   - Check GEMINI_API_KEY configuration
   - Monitor circuit breaker state
   - Review AI service logs

2. **Database Transaction Failures**
   - Verify stored procedure exists
   - Check database connectivity
   - Review transaction logs

3. **Validation Errors**
   - Ensure required questionnaire fields
   - Validate goal type against allowed values
   - Check data types and formats

### Debug Mode
Set `ENVIRONMENT=development` to include additional debug information in error responses.