import mongoose from "mongoose";
import { env } from "./env";

export async function connectToDatabase(): Promise<void> {
  if (!env.mongoUri) {
    throw new Error("MONGO_URI is required");
  }

  await mongoose.connect(env.mongoUri);
}
