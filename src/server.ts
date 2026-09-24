import { createApp } from "./app";
import { env } from "./config/env";
import { connectToDatabase } from "./config/mongodb";
import mongoose from "mongoose";
import MongoStore from "connect-mongo";
import dns from "dns";

dns.setServers(["8.8.8.8", "1.1.1.1"]);

async function startServer(): Promise<void> {
  if (env.nodeEnv === "production" && !process.env.SESSION_SECRET) {
    throw new Error("SESSION_SECRET is required in production");
  }
  await connectToDatabase();
  const sessionStore = MongoStore.create({
    client: mongoose.connection.getClient(),
    collectionName: "sessions",
    ttl: Math.floor(env.sessionMaxAgeMs / 1000),
  });
  const app = createApp(sessionStore);
  app.listen(env.port, () => {
    console.log(`GitHub analyzer API listening on port ${env.port}`);
  });
}

startServer().catch((error: unknown) => {
  console.error(
    error instanceof Error ? error.message : "Unable to start the server",
  );
  process.exitCode = 1;
});
