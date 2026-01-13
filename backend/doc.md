# ESP32 IoT Traffic Jam Detection API - Routes Documentation

## API Endpoints

### Base URL

```
https://rtats.a8k.dev
```

All endpoints return JSON responses with consistent error handling.

---

## Devices

### Register Device

Register a new ESP32 device in the system.

**POST** `/devices`

**Request Body:**

```json
{
  "deviceId": "string", // Unique identifier for the ESP32 device
  "name": "string", // Human-readable device name
  "location": "string", // Physical location description
  "road1Name": "string", // Name of the first road being monitored
  "road2Name": "string" // Name of the second road being monitored
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "id": 1,
    "deviceId": "ESP32_001",
    "name": "Main Street Sensor",
    "location": "Main St & 1st Ave",
    "road1Name": "Main Street Northbound",
    "road2Name": "Main Street Southbound",
    "apiKey": "key_abc123def456...", // Plain API key for device authentication
    "lastSeenAt": "2025-12-29T10:00:00.000Z",
    "createdAt": "2025-12-29T10:00:00.000Z"
  }
}
```

**Notes:**

- The API key is returned only once during registration
- Store the API key securely on the ESP32 device
- Device IDs must be unique across the system
- Road names help identify which roads the device monitors for traffic jam detection

### List Devices

Get all registered ESP32 devices.

**GET** `/devices`

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "deviceId": "ESP32_001",
      "name": "Main Street Sensor",
      "location": "Main St & 1st Ave",
      "road1Name": "Main Street Northbound",
      "road2Name": "Main Street Southbound",
      "apiKey": "key_hashed_value...", // Hashed API key (not the plain key)
      "lastSeenAt": "2025-12-29T10:05:00.000Z",
      "createdAt": "2025-12-29T09:00:00.000Z"
    }
  ]
}
```

### Get Device

Get detailed information about a specific ESP32 device.

**GET** `/devices/{deviceId}`

**Response:**

```json
{
  "success": true,
  "data": {
    "id": 1,
    "deviceId": "ESP32_001",
    "name": "Main Street Sensor",
    "location": "Main St & 1st Ave",
    "road1Name": "Main Street Northbound",
    "road2Name": "Main Street Southbound",
    "apiKey": "key_hashed_value...",
    "lastSeenAt": "2025-12-29T10:05:00.000Z",
    "createdAt": "2025-12-29T09:00:00.000Z"
  }
}
```

### Delete Device

Delete an ESP32 device from the system.

**DELETE** `/devices/{deviceId}`

**Response:**

```json
{
  "success": true,
  "data": {
    "message": "Device 'ESP32_001' deleted successfully",
    "deviceId": "ESP32_001"
  }
}
```

**Notes:**

- Permanently removes the device and all associated data
- This action cannot be undone
- Device must exist to be deleted

---

## Traffic Jam Readings

### Store Jam Percentage Readings

Store traffic jam percentage readings from ESP32 devices for both monitored roads.

**POST** `/readings`

**Request Body:**

```json
{
  "deviceId": "string",        // ESP32 device identifier
  "timestamp": "ISO8601 string or Unix timestamp", // Optional
  "road1JamPercent": number,   // Jam percentage for road 1 (0-100)
  "road2JamPercent": number    // Jam percentage for road 2 (0-100)
}
```

**Example Request:**

```json
{
  "deviceId": "ESP32_001",
  "road1JamPercent": 45,
  "road2JamPercent": 78
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "stored": 1,
    "batchId": "batch_abc123def456..."
  }
}
```

**Notes:**

- Each reading represents traffic jam percentages for both monitored roads
- Jam percentages must be between 0-100 (0% = no traffic, 100% = complete jam)
- The device must be registered before sending readings
- Timestamp is optional; current time is used if not provided
- Road names are defined during device registration

### Get Latest Readings

Get the most recent traffic jam readings for a device.

**GET** `/readings/{deviceId}`

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": 123,
      "deviceId": "ESP32_001",
      "road1JamPercent": 45,
      "road2JamPercent": 78,
      "batchId": "batch_abc123def456...",
      "timestamp": "2025-12-29T10:05:30.000Z"
    },
    {
      "id": 124,
      "deviceId": "ESP32_001",
      "road1JamPercent": 12,
      "road2JamPercent": 34,
      "batchId": "batch_def456ghi789...",
      "timestamp": "2025-12-29T10:10:30.000Z"
    }
  ]
}
```

**Notes:**

- Returns up to 100 most recent readings
- Ordered by timestamp (newest first)
- Useful for monitoring current traffic conditions on both roads

### Delete Readings by Batch

Delete all traffic jam readings that were sent in the same request (same batch).

**DELETE** `/readings/batch/{batchId}`

**Response:**

```json
{
  "success": true,
  "data": {
    "message": "Readings batch 'batch_abc123def456...' deleted successfully",
    "batchId": "batch_abc123def456..."
  }
}
```
    "batchId": "batch_abc123def456..."
  }
}
```

**Notes:**

- Deletes all readings with the specified batch ID
- Useful for correcting erroneous data submissions
- Batch ID is returned when storing readings

---

## Commands

### Create Command

Send a command to an ESP32 device.

**POST** `/commands`

**Request Body:**

```json
{
  "deviceId": "string",
  "commandType": "open_corridor" // Currently only "open_corridor" is supported
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "id": 1,
    "deviceId": "ESP32_001",
    "commandType": "open_corridor",
    "status": "pending",
    "createdAt": "2025-12-29T10:00:00.000Z",
    "executedAt": null
  }
}
```

**Notes:**

- Currently only supports "open_corridor" command for traffic light control
- Commands are queued and must be polled by devices

### Poll Commands

Get pending commands for an ESP32 device (polling endpoint).

**GET** `/commands/poll?deviceId={deviceId}`

**Query Parameters:**
- `deviceId`: The ESP32 device identifier

**Example Request:**
```
GET /commands/poll?deviceId=ESP32_001
```

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "deviceId": "ESP32_001",
      "commandType": "open_corridor",
      "status": "pending",
      "createdAt": "2025-12-29T10:00:00.000Z",
      "executedAt": null
    }
  ]
}
```

**Notes:**

- ESP32 devices should poll this endpoint regularly to check for new commands
- Returns up to 10 pending commands for the specified device
- Commands remain in "pending" status until updated by device
- Returns empty array if no pending commands

### Update Command Status

Update the execution status of a command (called by ESP32 device).

**POST** `/commands/{commandId}`

**Request Body:**

```json
{
  "status": "executed" | "failed"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "id": 1,
    "deviceId": "ESP32_001",
    "commandType": "open_corridor",
    "status": "executed",
    "createdAt": "2025-12-29T10:00:00.000Z",
    "executedAt": "2025-12-29T10:01:15.000Z"
  }
}
```

**Notes:**

- ESP32 devices call this after executing or failing to execute a command
- Status can only be updated to "executed" or "failed"
- executedAt timestamp is automatically set when status is updated

---

## Preferences

### Update Device Preferences

Update server-side preferences for an ESP32 device (administrative endpoint).

**POST** `/preferences/{deviceId}`

**Request Body:**

```json
{
  "disabledPins": [12, 13],
  "samplingRateMs": 2000,
  "jamThresholdCm": 75
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "id": 1,
    "deviceId": "ESP32_001",
    "disabledPins": [12, 13],
    "samplingRateMs": 2000,
    "jamThresholdCm": 75,
    "updatedAt": "2025-12-29T10:05:00.000Z"
  }
}
```

**Notes:**

- Used by administrators to update the desired configuration for ESP32 devices
- All fields are optional - only provided fields will be updated
- `samplingRateMs`: Must be between 100-10000ms
- `jamThresholdCm`: Must be between 10-500cm
- ESP32 devices will receive these preferences when they sync

### Sync Device Preferences

Send current preferences data to ESP32 device for local configuration update.

**POST** `/preferences/sync`

**Request Body:**

```json
{
  "deviceId": "ESP32_001"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "id": 1,
    "deviceId": "ESP32_001",
    "disabledPins": [12, 13],
    "samplingRateMs": 1500,
    "jamThresholdCm": 75,
    "updatedAt": "2025-12-29T10:05:00.000Z"
  }
}
```

**Notes:**

- ESP32 device sends only its `deviceId` to request current configuration
- Server returns the stored preferences for the device
- ESP32 device compares received preferences with its current local settings
- ESP32 device updates its local configuration if different from server preferences
- Creates default preferences if none exist for the device
- No server-side updates occur - all preference changes happen on the ESP32 device

---

All endpoints return consistent error responses:

```json
{
  "success": false,
  "error": "Error message",
  "details": [...] // Validation errors (development only)
}
```

### Common Error Codes

- `Invalid request data`: Request body validation failed
- `Device not found`: Specified deviceId doesn't exist
- `Command not found`: Specified command ID doesn't exist
- `Invalid device ID`: Device ID parameter validation failed

### HTTP Status Codes

- `200`: Success
- `201`: Created
- `400`: Bad Request (validation error)
- `404`: Not Found
- `409`: Conflict (device already exists)
- `500`: Internal Server Error

---

## Testing Examples

### Register an ESP32 device:

```bash
curl -X POST https://rtats.a8k.dev/devices \
  -H "Content-Type: application/json" \
  -d '{
    "deviceId": "ESP32_TEST_001",
    "name": "Test Intersection Sensor",
    "location": "Test Street & Test Avenue"
  }'
```

### Delete a device:

```bash
curl -X DELETE https://rtats.a8k.dev/devices/ESP32_TEST_001
```

### Store sensor readings:

```bash
curl -X POST https://rtats.a8k.dev/readings \
  -H "Content-Type: application/json" \
  -d '{
    "deviceId": "ESP32_TEST_001",
    "readings": [
      {"pin": 12, "distanceCm": 45},
      {"pin": 13, "distanceCm": 120}
    ]
  }'
```

### Create a command:

```bash
curl -X POST https://rtats.a8k.dev/commands \
  -H "Content-Type: application/json" \
  -d '{
    "deviceId": "ESP32_TEST_001",
    "commandType": "open_corridor"
  }'
```

### Poll for commands:

```bash
curl -X POST https://rtats.a8k.dev/commands/poll \
  -H "Content-Type: application/json" \
  -d '{
    "deviceId": "ESP32_TEST_001"
  }'
```

### Update command status:

```bash
curl -X POST https://rtats.a8k.dev/commands/1 \
  -H "Content-Type: application/json" \
  -d '{"status": "executed"}'
```

### Update device preferences:

```bash
curl -X POST https://rtats.a8k.dev/preferences/ESP32_TEST_001 \
  -H "Content-Type: application/json" \
  -d '{
    "disabledPins": [12, 13],
    "samplingRateMs": 2000,
    "jamThresholdCm": 75
  }'
```

### Sync device preferences:

```bash
curl -X POST https://rtats.a8k.dev/preferences/sync \
  -H "Content-Type: application/json" \
  -d '{
    "deviceId": "ESP32_TEST_001"
  }'
```

### Delete readings by batch:

```bash
curl -X DELETE https://rtats.a8k.dev/readings/batch/batch_abc123def456
```
