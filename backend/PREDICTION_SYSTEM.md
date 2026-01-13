# Traffic Prediction System

This document describes the traffic prediction system implementation for ESP devices in the Real-Time Adaptive Traffic System.

## Overview

The traffic prediction system uses AI to analyze historical traffic data and generate 48 half-hour traffic jam probability percentages for the next day for each ESP device.

## Architecture

### Components

1. **Database Schema** (`src/db/schema/iot-schema.ts`)
   - `half_hour_averages`: Stores half-hour average sensor readings
   - `predictions`: Stores AI-generated predictions

2. **AI Integration** (`src/lib/predications.ts`)
   - Historical data processing
   - AI model communication
   - Prediction generation and storage

3. **API Routes** (`src/routes/predictions.ts`)
   - GET `/predictions/:deviceId`: Get predictions for a specific ESP
   - GET `/predictions`: Get prediction overview for all devices
   - POST `/predictions/:deviceId/regenerate`: Force regenerate predictions

4. **Scheduled Processing** (`src/scheduled.ts`)
   - Daily cron job to process predictions for all devices
   - Runs at 2:00 AM daily

## Data Flow

### Daily Processing (Automated)

1. **Data Collection**: Raw sensor readings are collected throughout the day
2. **Half-Hour Averaging**: Previous day's data is processed into 48 half-hour averages
3. **Historical Selection**: 21-day dataset is selected using specific criteria:
   - 6 days: Same calendar day from last 3 years (Gregorian)
   - 7 days: Last 7 days
   - 8 days: Weekday patterns + seasonal patterns + random normal days
4. **AI Processing**: Historical data is sent to AI model for analysis
5. **Prediction Storage**: AI-generated predictions are stored in database

### API Access (Real-time)

1. ESP devices call `/predictions/:deviceId`
2. System returns cached predictions from database
3. Predictions include 48 half-hour time slots with jam probabilities

## Historical Data Selection Criteria

The system uses a sophisticated 21-day selection algorithm:

### Group 1: Same Day Previous Years (6 days)
- Same calendar date from last 3 years
- Captures annual patterns and seasonal variations

### Group 2: Recent Patterns (7 days)
- Last 7 days of data
- Captures recent trends and current conditions

### Group 3: Pattern Analysis (8 days)
- Same weekday from last 4 weeks (4 days)
- Mid-month data from last 2 months (2 days)  
- 2 random normal days from last year (2 days)
- Captures weekly patterns and seasonal variations

## API Endpoints

### GET `/predictions/:deviceId`

Returns traffic predictions for a specific ESP device.

**Response Format:**
```json
{
  "success": true,
  "data": {
    "deviceId": "esp001",
    "deviceName": "Main Street Sensor",
    "location": "Main St & 5th Ave",
    "predictionDate": "2026-01-13",
    "predictions": [
      {
        "halfHourIndex": 0,
        "timeSlot": "00:00",
        "jamProbabilityPercent": 15
      },
      // ... 47 more entries
    ],
    "summary": {
      "totalHalfHours": 48,
      "averageJamProbability": 25,
      "peakJamPeriods": [
        {
          "halfHourIndex": 16,
          "timeSlot": "08:00",
          "jamProbabilityPercent": 85
        }
      ]
    }
  }
}
```

### GET `/predictions`

Returns prediction overview for all devices.

**Response Format:**
```json
{
  "success": true,
  "data": {
    "devices": [
      {
        "deviceId": "esp001",
        "deviceName": "Main Street Sensor",
        "location": "Main St & 5th Ave",
        "hasPredictions": true,
        "averageJamProbability": 25,
        "maxJamProbability": 85,
        "lastSeen": "2026-01-12T14:30:00Z"
      }
    ],
    "totalDevices": 5,
    "devicesWithPredictions": 4,
    "predictionCoverage": 80
  }
}
```

### POST `/predictions/:deviceId/regenerate`

Forces regeneration of predictions for a specific device (admin endpoint).

## Database Schema

### half_hour_averages

| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER | Primary key |
| esp_id | TEXT | ESP device ID (foreign key) |
| timestamp | INTEGER | Unix timestamp for the half-hour period |
| average_value | INTEGER | Average sensor distance for this period |
| half_hour_index | INTEGER | Index 0-47 representing half-hour slots |
| created_at | INTEGER | Record creation timestamp |

### predictions

| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER | Primary key |
| esp_id | TEXT | ESP device ID (foreign key) |
| prediction_date | INTEGER | Date for predictions (Unix timestamp) |
| predicted_values | TEXT | JSON array of 48 percentages |
| generated_at | INTEGER | Prediction generation timestamp |

## AI Integration

### Model Configuration
- Uses OpenRouter API via `ai.hackclub.com`
- Model: `qwen/qwen3-32b`
- Processes historical patterns to generate traffic predictions

### Prediction Format
- Returns 48 numbers (0-100) representing jam probability percentages
- Index 0 = 00:00-00:30, Index 47 = 23:30-24:00
- Higher percentage = higher jam probability

## Scheduled Processing

### Cron Configuration
```json
{
  "triggers": {
    "crons": ["0 2 * * *"]
  }
}
```

The system runs daily at 2:00 AM to:
1. Process previous day's sensor data into half-hour averages
2. Generate AI predictions for all devices
3. Store predictions for next day access

## Error Handling

- Graceful degradation when AI API is unavailable
- Device-level error isolation (one device failure doesn't affect others)
- Validation of AI responses with fallback defaults
- Comprehensive logging for debugging

## Performance Considerations

- Database indexes on frequently queried columns
- Cached predictions in database (no real-time AI calls)
- Batch processing of multiple devices
- Efficient historical data selection queries

## Deployment

1. **Database Migration**: Apply migration script for new tables
2. **Environment Variables**: Ensure AI_API_URL and AI_API_KEY are configured
3. **Cron Schedule**: Verify scheduled handler is properly deployed
4. **API Testing**: Test prediction endpoints with existing ESP devices

## Monitoring

- Monitor scheduled job execution logs
- Track prediction generation success rates  
- Monitor AI API response times and error rates
- Alert on prediction data staleness

## Future Enhancements

- Integration with Hijri calendar for more accurate pattern matching
- Weather data integration for improved predictions
- Machine learning model training on historical accuracy
- Real-time prediction updates based on current conditions
- Multi-location traffic flow correlation