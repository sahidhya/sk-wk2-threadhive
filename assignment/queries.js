import mongoose from 'mongoose';
import dotenv from 'dotenv';

import User from "./models/User.js"
import Subreddit from './models/Subreddit.js';
import Thread from './models/Thread.js';

//Find user by email diana@example.com
async function query1() {
    // Write code for Query 1 here
    const user = await User.findOne({"email": "diana@example.com"});
    console.log(user);
}
//Get threads in a subreddit programming
async function query2() {
    // Write code for Query 2 here
    const subreddit = await Subreddit.findOne({"name": "programming"});
    const threads = await Thread.find({"subreddit": subreddit._id});
    console.log(threads);
}

//Users who posted threads
async function query3() {
    // Write code for Query 3 here
   const userIds = await Thread.distinct("author");
   const users = await User.find({"_id": {$in: userIds}});
   console.log(users);
}
//Threads created on or after January 1, 2024
async function query4() {
    // Write code for Query 4 here
    const threads = await Thread.find({"createdAt": {$gte: new Date("2024-01-01")}});
    console.log(threads);
}
//Add a new thread (Create) Subreddit devops author Ethan
async function query5() {
    const subreddit = await Subreddit.findOne({"name": "devops"});
    const author = await User.findOne({"name": "Ethan"});
    const newThread = new Thread({
        title: "Mongoose and DevOps",
        content: "Discussion about Mongoose and DevOps practices.",
        author: author._id,
        subreddit: subreddit._id,
        createdAt: new Date()
    });
    await newThread.save();
    console.log(newThread);
}

//Update title of the thread "Mongoose and DevOps?"
async function query6() {
    const thread = await Thread.findOne({"title": "Mongoose and DevOps"});
    if (thread) {
        thread.title = "Facebook or snapchat";
        await thread.save();
        console.log(thread);
    } else {
        console.log("Thread not found");
    }
}
//Delete all subreddits and their associated threads
async function query7() {
    const subreddits = await Subreddit.find();
    for (const subreddit of subreddits) {
        const deletedThreads = await Thread.deleteMany({"subreddit": subreddit._id});
        console.log(`Deleted ${deletedThreads.deletedCount} threads`);
    }
    await Subreddit.deleteMany();
    console.log("Deleted all subreddits and their associated threads");
}
// more queries

//Find the author ID and thread count for the user who posted the most threads
//async function query8() {
//    const result = await Thread.aggregate([
//        { $group: { _id: "$author", threadCount: { $sum: 1 } } },
//        { $sort: { threadCount: -1 } },
//        { $limit: 1 }
//    ]);
//    console.log(result);
//}

async function runQueries() {
    // Uncomment the query you want to run
    //await query1();
    //await query2();
    //await query3();
    //await query4();
    // more
    //await query5();
    //await query6();
    //await query7();
    //await query8();
}

async function main() {
  try {
    dotenv.config();
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to DB");
    await runQueries();
  } catch (err) {
    console.error("DB connection failed:", err);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from DB");
  }
}

main();