import "dotenv/config";
import { createApp } from "./app";
import { pool } from "./db/pool";
import { logger } from "./utils/logger";
import { config } from "./config";

async function main() {
try {
    const client = await pool.connect();
    await client.query("SELECT 1");
    client.release();
    logger.info("Database connected successfully");
  } catch (err) {

    logger.error("FATAL: Could not establish a database connection.");
    logger.error(err instanceof Error ? err.message : String(err));
    
    process.exit(1); 
  }

  const app = createApp();
  const server = app.listen(config.port, () => {
    logger.info(`Server running on port ${config.port}`);
  });

  const shutdown = async (signal: string) => {
    logger.info(`${signal} received — shutting down`);
    server.close(async () => {
      await pool.end();
      logger.info("Pool closed. Bye!");
      process.exit(0);
    });
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("unhandledRejection", (reason) => {
    logger.error("Unhandled rejection:", reason);
  });
}

main().catch((err) => {
  logger.error("Failed to start server:", err);
  process.exit(1);
});
