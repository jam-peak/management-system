import { processAllDevicePredictions } from "./lib/predications";

/**
 * Cloudflare Workers Scheduled Handler
 * This function runs daily to process traffic predictions for all ESP devices
 */
export default {
  async scheduled(
    controller: any,
    env: any,
    ctx: any
  ): Promise<void> {
    console.log(`Starting daily prediction processing job at ${new Date(controller.scheduledTime).toISOString()}...`);
    console.log(`Cron expression: ${controller.cron}`);
    
    try {
      // Process predictions for all devices
      await processAllDevicePredictions();
      
      console.log("Daily prediction processing job completed successfully");
    } catch (error) {
      console.error("Error in daily prediction processing job:", error);
      
      // You could add additional error handling here, such as:
      // - Sending alerts to administrators
      // - Logging to external monitoring systems
      // - Retrying failed operations
      
      throw error; // Re-throw to mark the job as failed
    }
  },
};