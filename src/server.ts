import { app } from "./app";
import { env } from "./config/env";
import { connectToDatabase } from "./config/mongodb";

async function startServer(): Promise<void> {
  await connectToDatabase();
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
