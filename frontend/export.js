require("dotenv").config();
const { MongoClient } = require("mongodb");
const fs = require("fs");

const uri = process.env.MONGO_URI;
const dbName = process.env.DB_NAME || "drugs";
const collectionName = process.env.COLLECTION_NAME || "monographs";

if (!uri) {
  console.error("Missing MONGO_URI. Copy .env.example to .env and fill it in.");
  process.exit(1);
}

async function main() {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const docs = await client
      .db(dbName)
      .collection(collectionName)
      .find({})
      .toArray();

    fs.writeFileSync("monographs.json", JSON.stringify(docs, null, 2));
    console.log(`Exported ${docs.length} documents to monographs.json`);
  } finally {
    await client.close();
  }
}

main().catch((err) => {
  console.error("Export failed:", err.message);
  process.exit(1);
});