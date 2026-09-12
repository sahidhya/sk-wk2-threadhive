import mongoose from "mongoose";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

import User from "../models/User.js";
import Subreddit from "../models/Subreddit.js";
import Thread from "../models/Thread.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, "..", "data");

dotenv.config({ path: path.join(__dirname, "..", ".env") });

async function connectToDatabase() {
  console.log("Connecting to database...");
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("Connected successfully to database");
}

async function clearExistingData() {
  console.log("Clearing existing data...");
  // Delete in reverse dependency order so no orphaned references remain mid-operation
  await Thread.deleteMany({});
  await Subreddit.deleteMany({});
  await User.deleteMany({});
  console.log("Existing data cleared successfully");
}

async function readJson(fileName) {
  const filePath = path.join(dataDir, fileName);
  const raw = await fs.promises.readFile(filePath, "utf-8");
  return JSON.parse(raw);
}

async function seedUsers() {
  const users = await readJson("users.json");
  await User.insertMany(users);
  console.log(`Inserted ${users.length} users`);
}

async function seedSubreddits() {
  const subreddits = await readJson("subreddits.json");
  await Subreddit.insertMany(subreddits);
  console.log(`Inserted ${subreddits.length} subreddits`);
}

async function seedThreads() {
  const threads = await readJson("threads.json");
  await Thread.insertMany(threads);
  console.log(`Inserted ${threads.length} threads`);
}

async function main() {
  try {
    await connectToDatabase();
    await clearExistingData();

    // Insert in dependency order: users -> subreddits (ref users) -> threads (ref users + subreddits)
    await seedUsers();
    await seedSubreddits();
    await seedThreads();

    console.log("Database seeded successfully!");
  } catch (error) {
    console.error("Database seeding failed:", error);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
    console.log("Database connection closed");
  }
}

main();
