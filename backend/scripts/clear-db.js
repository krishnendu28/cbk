import dotenv from "dotenv";
import mongoose from "mongoose";

dotenv.config();

const MONGO_URI = process.env.MONGO_URI;
const CONFIRM = process.env.CLEAR_DB_CONFIRM;

async function main() {
  if (!MONGO_URI) {
    throw new Error("MONGO_URI is required to clear database.");
  }

  if (CONFIRM !== "YES") {
    throw new Error("Refusing to clear database. Set CLEAR_DB_CONFIRM=YES to proceed.");
  }

  await mongoose.connect(MONGO_URI);
  const db = mongoose.connection.db;
  const collections = await db.collections();

  for (const collection of collections) {
    await collection.deleteMany({});
    console.log(`Cleared collection: ${collection.collectionName}`);
  }

  console.log("Database cleared successfully.");
  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error("DB clear failed:", error.message);
  try {
    await mongoose.disconnect();
  } catch {
    // no-op
  }
  process.exit(1);
});
