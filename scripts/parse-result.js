const fs = require("fs");

const xmlFile = process.argv[2];
const envFile = process.argv[3];

if (!xmlFile || !envFile) {
  console.error("Usage: node parse-results.js <junit.xml> <GITHUB_ENV>");
  process.exit(1);
}

if (!fs.existsSync(xmlFile)) {
  console.warn("JUnit XML not found. Writing zero counts.");
  appendEnv(envFile, { TESTS_TOTAL: 0, TESTS_PASSED: 0, TESTS_FAILED: 0, FAILURE_DETAILS: "N/A" });
  process.exit(0);
}

const xml = fs.readFileSync(xmlFile, "utf8");

const suitesMatch = xml.match(/<testsuites[^>]*>/);
let testsTotal  = 0;
let testsFailed = 0;
let testsPassed = 0;

if (suitesMatch) {
  const attr = suitesMatch[0];
  testsTotal  = parseInt(attr.match(/tests="(\d+)"/)?.[1]    ?? "0", 10);
  testsFailed = parseInt(attr.match(/failures="(\d+)"/)?.[1] ?? "0", 10)
              + parseInt(attr.match(/errors="(\d+)"/)?.[1]   ?? "0", 10);
  testsPassed = testsTotal - testsFailed;
}

const failureDetails = [];
const testCaseRegex  = /<testcase\s([^>]+)>([\s\S]*?)<\/testcase>/g;
let match;

while ((match = testCaseRegex.exec(xml)) !== null) {
  const attrs = match[1];
  const body  = match[2];
  if (!body.includes("<failure") && !body.includes("<error")) continue;

  const name      = attrs.match(/name="([^"]+)"/)?.[1]      ?? "Unknown test";
  const classname = attrs.match(/classname="([^"]+)"/)?.[1] ?? "";
  const failMsg   = body.match(/<(?:failure|error)[^>]*message="([^"]+)"/)?.[1]
                  ?? "No details";

  const decode = s => s
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">").replace(/&quot;/g, '"');

  failureDetails.push(`• [${decode(classname)}] ${decode(name)}: ${decode(failMsg)}`);
}

const failureDetailsStr = failureDetails.length > 0
  ? failureDetails.slice(0, 20).join(" | ")
  : "None";

appendEnv(envFile, {
  TESTS_TOTAL:     testsTotal,
  TESTS_PASSED:    testsPassed,
  TESTS_FAILED:    testsFailed,
  FAILURE_DETAILS: failureDetailsStr,
});

console.log(`Results → Total: ${testsTotal} | Passed: ${testsPassed} | Failed: ${testsFailed}`);

function appendEnv(envPath, vars) {
  const lines = Object.entries(vars)
    .map(([k, v]) => `${k}=${String(v).replace(/\r/g, "")}`)
    .join("\n");
  fs.appendFileSync(envPath, lines + "\n");
}
