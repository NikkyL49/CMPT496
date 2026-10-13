const { MongoClient } = require("mongodb");
const fs = require("fs");

async function main() {
  const client = new MongoClient("mongodb+srv://USERNAME:PASSWORD@monobyte.mwzb913.mongodb.net/");
  await client.connect();
  const docs = await client.db("drugs").collection("monographs").find({}).toArray();
  fs.writeFileSync("monographs.json", JSON.stringify(docs, null, 2));
  await client.close();
}

main();
