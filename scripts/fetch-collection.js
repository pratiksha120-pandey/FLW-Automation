/**
 * fetch-collection.js
 * Reads collection.json and environment_raw.json
 * Writes parsed values into GITHUB_ENV
 */

const fs = require("fs");

const args    = process.argv[2]; // "collection" or "environment"
const envFile = process.env.GITHUB_ENV;

if (!envFile) {
  console.error("GITHUB_ENV not set");
  process.exit(1);
}

if (args === "collection") {
  const raw = fs.readFileSync("./collection.json", "utf8");
  const c   = JSON.parse(raw);

  let count = 0;
  function countRequests(items) {
    if (!items) return;
    items.forEach(item => {
      if (item.request) count++;
      if (item.item) countRequests(item.item);
    });
  }
  countRequests(c.collection.item);

  const name = c.collection.info.name || "Unknown Collection";

  fs.appendFileSync(envFile, `TOTAL_REQUESTS=${count}\n`);
  fs.appendFileSync(envFile, `COLLECTION_NAME=${name}\n`);

  console.log("Collection name  :", name);
  console.log("Total requests   :", count);
}

if (args === "environment") {
  const raw  = fs.readFileSync("./environment_raw.json", "utf8");
  const data = JSON.parse(raw);
  const env  = data.environment;

  const newmanEnv = {
    id: env.id,
    name: env.name,
    values: env.values.map(v => ({
      key:     v.key,
      value:   v.value,
      enabled: v.enabled !== false,
      type:    v.type || "default"
    }))
  };

  fs.writeFileSync("environment.json", JSON.stringify(newmanEnv, null, 2));
  fs.appendFileSync(envFile, `ENV_NAME=${env.name}\n`);

  console.log("Environment name :", env.name);
  console.log("Variables count  :", env.values.length);
}
