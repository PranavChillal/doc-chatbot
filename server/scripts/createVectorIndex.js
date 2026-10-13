require("dotenv").config();
const mongoose = require("mongoose");
const { EMBEDDING_DIMENSIONS, VECTOR_INDEX_NAME } = require("../config");

async function main() {
  await mongoose.connect(process.env.MONGO_URI);
  const collection = mongoose.connection.collection("chunks");

  const existing = await collection.listSearchIndexes().toArray();
  if (!existing.some((i) => i.name === VECTOR_INDEX_NAME)) {
    await collection.createSearchIndex({
      name: VECTOR_INDEX_NAME,
      type: "vectorSearch",
      definition: {
        fields: [
          {
            type: "vector",
            path: "embedding",
            numDimensions: EMBEDDING_DIMENSIONS,
            similarity: "cosine",
          },
          { type: "filter", path: "documentId" },
        ],
      },
    });
    console.log("Index creation started.");
  } else {
    console.log("Index already exists.");
  }

  const indexes = await collection.listSearchIndexes().toArray();
  for (const i of indexes) {
    console.log(`${i.name}: status=${i.status}, queryable=${i.queryable}`);
  }
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error("Failed:", err.message);
  process.exit(1);
});