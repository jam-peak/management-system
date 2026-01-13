// Type definitions for the traffic prediction system

export interface HalfHourAverage {
  id: number;
  espId: string;
  timestamp: Date;
  averageValue: number;
  halfHourIndex: number;
  createdAt: Date;
}

export interface Prediction {
  id: number;
  espId: string;
  predictionDate: Date;
  predictedValues: string; // JSON string of number[]
  generatedAt: Date;
}

export interface PredictionData {
  halfHourIndex: number;
  timeSlot: string;
  jamProbabilityPercent: number;
}

export interface DevicePredictionResponse {
  success: boolean;
  data?: {
    deviceId: string;
    deviceName: string;
    location: string;
    predictionDate: string;
    generatedAt: string;
    predictions: PredictionData[];
    summary: {
      totalHalfHours: number;
      averageJamProbability: number;
      peakJamPeriods: PredictionData[];
    };
  };
  error?: string;
  details?: any;
}

export interface DeviceOverview {
  deviceId: string;
  deviceName: string;
  location: string;
  hasPredictions: boolean;
  averageJamProbability: number;
  maxJamProbability: number;
  lastSeen: string | null;
  error?: string;
}

export interface AllPredictionsResponse {
  success: boolean;
  data?: {
    devices: DeviceOverview[];
    totalDevices: number;
    devicesWithPredictions: number;
    predictionCoverage: number;
  };
  error?: string;
  details?: any;
}

export interface HistoricalDataset {
  sameDayLastYears: HalfHourAverage[];
  lastSevenDays: HalfHourAverage[];
  weekdayPatterns: HalfHourAverage[];
}

export interface AIResponse {
  choices?: { message?: { content?: string } }[];
  error?: { message?: string };
}

// Cloudflare Workers types
export interface Env {
  TURSO_DB_URL: string;
  TURSO_DB_AUTH_TOKEN: string;
  AI_API_URL: string;
  AI_API_KEY: string;
  CORS_ORIGIN: string;
}

export interface ScheduledController {
  scheduledTime: number;
  cron: string;
}

export interface ExecutionContext {
  waitUntil(promise: Promise<any>): void;
  passThroughOnException(): void;
}