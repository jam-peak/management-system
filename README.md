# Real-Time Adaptive Traffic System (RTATS)

A comprehensive IoT-based traffic jam detection and management system using ESP32 devices, AI-powered predictions, and real-time monitoring.

## Overview

The Real-Time Adaptive Traffic System monitors traffic conditions on multiple roads using ESP32 devices that report jam percentages. The system provides real-time traffic data, AI-powered predictions, and automated traffic light control for optimized traffic flow.

## Features

- **Real-time Traffic Monitoring**: ESP32 devices report jam percentages (0-100%) for dual roads
- **AI-Powered Predictions**: Machine learning models predict traffic patterns using historical data
- **Device Management**: Register and manage multiple ESP32 traffic monitoring devices
- **Traffic Light Control**: Send commands to control traffic lights based on conditions
- **Historical Analytics**: Track traffic patterns with half-hour averages and trends
- **RESTful API**: Comprehensive API for all operations
- **Production Ready**: Deployed on Cloudflare Workers with Turso database

## Architecture

```
ESP32 Devices → API (Cloudflare Workers) → Database (Turso LibSQL) → AI Predictions
     ↓                     ↓                        ↓                      ↓
Traffic Sensors → Data Collection → Storage & Analytics → Smart Control
```

### Components

- **Backend API**: Hono.js framework on Cloudflare Workers
- **Database**: Turso (LibSQL) for scalable data storage
- **AI Engine**: Integration with Gemini AI for traffic predictions
- **ESP32 Devices**: IoT sensors for real-time traffic monitoring

## Quick Start

### Prerequisites

- Node.js (v18+)
- pnpm
- Cloudflare account (for deployment)
- Turso account (for database)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/real-time-adaptive/traffic-system.git
   cd traffic-system/backend
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Set up environment variables**
   ```bash
   cp .dev.vars.example .dev.vars
   # Edit .dev.vars with your configuration
   ```

4. **Initialize database**
   ```bash
   pnpm db:generate
   pnpm db:push
   ```

5. **Start development server**
   ```bash
   pnpm dev
   ```

The API will be available at `http://localhost:8787`

## Configuration

### Environment Variables

```env
TURSO_DB_URL=your_turso_database_url
TURSO_DB_AUTH_TOKEN=your_turso_auth_token
CORS_ORIGIN=http://localhost:3001
AI_API_KEY=your_ai_api_key
AI_API_URL=https://ai.hackclub.com/proxy/v1
GEMINI_API_KEY=your_gemini_api_key
```

## API Usage

### Register ESP32 Device

```bash
curl -X POST https://rtats.a8k.dev/devices \
  -H "Content-Type: application/json" \
  -d '{
    "deviceId": "esp-location-001",
    "name": "Main Street Monitor",
    "location": "Main St & Broadway",
    "road1Name": "Main Street Northbound",
    "road2Name": "Main Street Southbound"
  }'
```

### Send Traffic Data

```bash
curl -X POST https://rtats.a8k.dev/readings \
  -H "Content-Type: application/json" \
  -d '{
    "deviceId": "esp-location-001",
    "road1JamPercent": 45,
    "road2JamPercent": 78
  }'
```

### Poll for Commands (ESP32)

```bash
curl "https://rtats.a8k.dev/commands/poll?deviceId=esp-location-001"
```

## Development

### Database Operations

```bash
# Generate schema changes
pnpm db:generate

# Push schema to database
pnpm db:push

# View database studio
pnpm db:studio
```

### Testing

```bash
# Run prediction tests
pnpm test:predictions

# Generate test data
node scripts/generate-21day-data.ts
```

### Deployment

```bash
# Deploy to Cloudflare Workers
pnpm deploy
```

## Data Models

### ESP Device
- Device ID, Name, Location
- Road 1 & Road 2 names
- API key for authentication
- Last seen timestamp

### Traffic Readings
- Device ID reference
- Road 1 & Road 2 jam percentages (0-100%)
- Batch ID for grouping
- Timestamp

### Predictions
- Device-specific predictions
- 48 half-hour periods per day
- AI-generated traffic forecasts

## AI Integration

The system uses AI models to:
- Analyze historical traffic patterns
- Predict future jam percentages
- Optimize traffic light timing
- Identify traffic anomalies

## Production Deployment

**Live API**: `https://rtats.a8k.dev`

The system is deployed on:
- **Cloudflare Workers** for serverless API hosting
- **Turso** for distributed SQLite database
- **Global CDN** for low-latency worldwide access

## Documentation

- [API Documentation](backend/doc.md) - Complete API reference
- [Prediction System](backend/PREDICTION_SYSTEM.md) - AI prediction details
- [Database Schema](backend/src/db/schema/) - Data models

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

For issues and questions:
- Create an [Issue](https://github.com/real-time-adaptive/traffic-system/issues)
- Check the [API Documentation](backend/doc.md)
- Review existing [Discussions](https://github.com/real-time-adaptive/traffic-system/discussions)

---

**Real-Time Adaptive Traffic System** - Making cities smarter, one intersection at a time