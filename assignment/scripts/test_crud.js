// Standalone CRUD test script (no test framework). Run with: node scripts/test_crud.js
import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

import User from "../models/User.js";
import Subreddit from "../models/Subreddit.js";
import Thread from "../models/Thread.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "..", ".env") });

// Unique suffix so test data never collides with seeded/existing data
const RUN_ID = Date.now();

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function test(name, fn) {
  try {
    await fn();
    passed++;
    console.log(`  PASS: ${name}`);
  } catch (error) {
    failed++;
    console.log(`  FAIL: ${name} -> ${error.message}`);
  }
}

async function main() {
  console.log("Connecting to database...");
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("Connected successfully to database\n");

  // State shared across tests
  let testUser, testUser2, testSubreddit, testThread, testThread2;

  try {
    console.log("Running CRUD tests...\n");

    // ---------- CREATE ----------
    await test("1. Create a user", async () => {
      testUser = await User.create({
        name: `CRUD Test User ${RUN_ID}`,
        email: `crud.test.${RUN_ID}@example.com`,
        password: "hashedpassword123",
        createdAt: new Date(),
      });
      assert(testUser._id, "Expected created user to have an _id");
    });

    await test("2. Reject creating a user with missing required field", async () => {
      let threw = false;
      try {
        await User.create({ name: `Incomplete User ${RUN_ID}` });
      } catch {
        threw = true;
      }
      assert(threw, "Expected a validation error for missing required fields");
    });

    await test("3. Reject creating a user with a duplicate email", async () => {
      let threw = false;
      try {
        await User.create({
          name: "Duplicate Email User",
          email: testUser.email,
          password: "somepassword",
          createdAt: new Date(),
        });
      } catch {
        threw = true;
      }
      assert(threw, "Expected a duplicate key error for a reused email");
    });

    await test("4. Create a second user", async () => {
      testUser2 = await User.create({
        name: `CRUD Test User2 ${RUN_ID}`,
        email: `crud.test2.${RUN_ID}@example.com`,
        password: "hashedpassword456",
        createdAt: new Date(),
      });
      assert(testUser2._id, "Expected second created user to have an _id");
    });

    await test("5. Create a subreddit", async () => {
      testSubreddit = await Subreddit.create({
        name: `crud-test-sub-${RUN_ID}`,
        description: "Subreddit created by CRUD test script",
        author: testUser2._id,
        createdAt: new Date(),
      });
      assert(testSubreddit._id, "Expected created subreddit to have an _id");
    });

    await test("6. Reject creating a subreddit with a duplicate name", async () => {
      let threw = false;
      try {
        await Subreddit.create({
          name: testSubreddit.name,
          author: testUser2._id,
          createdAt: new Date(),
        });
      } catch {
        threw = true;
      }
      assert(threw, "Expected a duplicate key error for a reused subreddit name");
    });

    await test("7. Create a thread", async () => {
      testThread = await Thread.create({
        title: `CRUD Test Thread ${RUN_ID}`,
        content: "Content for the first test thread",
        author: testUser._id,
        subreddit: testSubreddit._id,
        createdAt: new Date(),
      });
      assert(testThread._id, "Expected created thread to have an _id");
      assert(testThread.upvotes === 0, "Expected default upvotes to be 0");
      assert(testThread.voteCount === 0, "Expected default voteCount to be 0");
    });

    await test("8. Create a second thread in the same subreddit", async () => {
      testThread2 = await Thread.create({
        title: `CRUD Test Thread2 ${RUN_ID}`,
        content: "Content for the second test thread",
        author: testUser2._id,
        subreddit: testSubreddit._id,
        createdAt: new Date(),
      });
      assert(testThread2._id, "Expected second created thread to have an _id");
    });

    // ---------- READ ----------
    await test("9. Find a user by email", async () => {
      const found = await User.findOne({ email: testUser.email });
      assert(found, "Expected to find the user by email");
      assert(found._id.equals(testUser._id), "Found user id should match created user id");
    });

    await test("10. Find a user by ID", async () => {
      const found = await User.findById(testUser._id);
      assert(found, "Expected to find the user by id");
      assert(found.email === testUser.email, "Found user email should match");
    });

    await test("11. Find all threads in a subreddit", async () => {
      const threads = await Thread.find({ subreddit: testSubreddit._id });
      assert(threads.length === 2, `Expected 2 threads, got ${threads.length}`);
      const ids = threads.map((t) => t._id.toString());
      assert(ids.includes(testThread._id.toString()), "Expected first thread in results");
      assert(ids.includes(testThread2._id.toString()), "Expected second thread in results");
    });

    await test("12. Find threads authored by a specific user", async () => {
      const threads = await Thread.find({ author: testUser._id });
      assert(threads.length === 1, `Expected 1 thread, got ${threads.length}`);
      assert(threads[0]._id.equals(testThread._id), "Expected the thread created by testUser");
    });

    await test("13. Count users created by this test run", async () => {
      const count = await User.countDocuments({ email: { $regex: `crud\\.test.*${RUN_ID}` } });
      assert(count === 2, `Expected 2 matching users, got ${count}`);
    });

    // ---------- UPDATE ----------
    await test("14. Update a user's name", async () => {
      const updated = await User.findByIdAndUpdate(
        testUser._id,
        { name: "Updated CRUD Test User" },
        { new: true }
      );
      assert(updated.name === "Updated CRUD Test User", "Expected user name to be updated");
    });

    await test("15. Increment a thread's upvotes", async () => {
      const updated = await Thread.findByIdAndUpdate(
        testThread._id,
        { $inc: { upvotes: 5, voteCount: 5 } },
        { new: true }
      );
      assert(updated.upvotes === 5, `Expected upvotes to be 5, got ${updated.upvotes}`);
      assert(updated.voteCount === 5, `Expected voteCount to be 5, got ${updated.voteCount}`);
    });

    await test("16. Update a subreddit's description via save()", async () => {
      const subreddit = await Subreddit.findById(testSubreddit._id);
      subreddit.description = "Updated description via save()";
      await subreddit.save();
      const refetched = await Subreddit.findById(testSubreddit._id);
      assert(
        refetched.description === "Updated description via save()",
        "Expected subreddit description to persist"
      );
    });

    await test("17. Bulk update all threads in a subreddit", async () => {
      const result = await Thread.updateMany(
        { subreddit: testSubreddit._id },
        { $set: { downvotes: 1 } }
      );
      assert(result.modifiedCount === 2, `Expected 2 modified threads, got ${result.modifiedCount}`);
      const threads = await Thread.find({ subreddit: testSubreddit._id });
      assert(
        threads.every((t) => t.downvotes === 1),
        "Expected all threads to have downvotes set to 1"
      );
    });

    // ---------- DELETE ----------
    await test("18. Delete a single thread", async () => {
      const deleted = await Thread.findByIdAndDelete(testThread2._id);
      assert(deleted, "Expected a deleted document to be returned");
      const found = await Thread.findById(testThread2._id);
      assert(found === null, "Expected thread to no longer exist");
    });

    await test("19. Bulk delete remaining threads in a subreddit", async () => {
      const result = await Thread.deleteMany({ subreddit: testSubreddit._id });
      assert(result.deletedCount === 1, `Expected 1 deleted thread, got ${result.deletedCount}`);
      const remaining = await Thread.find({ subreddit: testSubreddit._id });
      assert(remaining.length === 0, "Expected no threads left in the subreddit");
    });

    await test("20. Delete users and subreddit, and verify deleting a missing document is a no-op", async () => {
      const deletedSubreddit = await Subreddit.findByIdAndDelete(testSubreddit._id);
      assert(deletedSubreddit, "Expected subreddit to be deleted");

      const deletedUsersResult = await User.deleteMany({
        _id: { $in: [testUser._id, testUser2._id] },
      });
      assert(deletedUsersResult.deletedCount === 2, "Expected both test users to be deleted");

      const missingResult = await Thread.deleteOne({ _id: testThread._id });
      assert(missingResult.deletedCount === 0, "Expected no-op delete for already-removed thread");
    });
  } finally {
    // Safety net: remove any leftover test data even if an assertion failed mid-way
    console.log("\nCleaning up any leftover test data...");
    await Thread.deleteMany({ title: { $regex: `CRUD Test Thread.*${RUN_ID}` } });
    await Subreddit.deleteMany({ name: `crud-test-sub-${RUN_ID}` });
    await User.deleteMany({ email: { $regex: `crud\\.test.*${RUN_ID}` } });

    console.log(`\nResults: ${passed} passed, ${failed} failed (out of ${passed + failed})`);

    await mongoose.disconnect();
    console.log("Database connection closed");

    if (failed > 0) process.exitCode = 1;
  }
}

main();
