
import { MongoClient, MongoClientOptions } from "mongodb";
import { attachDatabasePool } from "@vercel/functions";

const uri = process.env.MONGODB_URI;

if (!uri) {
  throw new Error("Please define MONGODB_URI in your .env.local file");
}

const options: MongoClientOptions = {
  appName: "devrel.vercel.integration",
  maxIdleTimeMS: 5000,
};

const client = new MongoClient(uri, options);

// Attach the client for proper cleanup during function suspension.
attachDatabasePool(client);

// Export the MongoClient for reuse across function invocations.
export default client;
