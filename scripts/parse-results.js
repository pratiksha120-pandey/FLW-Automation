const fs = require("fs");

const xmlFile = process.argv[2];
const envFile = process.argv[3];

if (!xmlFile || !envFile) {
  console.error("Usage: node parse-results.js <junit.xml> <GITHUB_ENV>");
  process.exit(1);
}

// ── XML file exist nahi hai ────────────────────────────────────
if (!fs.existsSync(xmlFile)) {
  console.warn("JUnit XML not found at:", xmlFile);
  writeEnv(envFile, {
    TESTS_TOTAL:     "0",
    TESTS_PASSED:    "0",
    TESTS_FAILED:    "0",
    FAILURE_DETAILS: "XML not found"
  });
  process.exit(0);
}

const xml = fs.readFileSync(xmlFile, "utf8");
console.log("XML file size:", xml.length, "bytes");

// ── Method 1: testsuites root element se parse karo ───────────
let testsTotal  = 0;
let testsFailed = 0;

const suitesMatch = xml.match(/<testsuites[^>]*/);
if (suitesMatch) {
  const attr = suitesMatch[0];
  const t = attr.match(/\btests="(\d+)"/);
  const f = attr.match(/\bfailures="(\d+)"/);
  const e = attr.match(/\berrors="(\d+)"/);
  if (t) testsTotal  = parseInt(t[1], 10);
  if (f) testsFailed += parseInt(f[1], 10);
  if (e) testsFailed += parseInt(e[1], 10);
  console.log("From testsuites attr → tests:", testsTotal, "failures:", testsFailed);
}

// ── Method 2: Agar testsuites se 0 aaya — testcase count karo ─
if (testsTotal === 0) {
  const testcaseMatches = xml.match(/<testcase[\s>]/g);
  testsTotal = testcaseMatches ? testcaseMatches.length : 0;
  console.log("From testcase count → total:", testsTotal);

  const failureMatches = xml.match(/<failure[\s>]/g);
  const errorMatches   = xml.match(/<error[\s>]/g);
  testsFailed = (failureMatches ? failureMatches.length : 0)
              + (errorMatches   ? errorMatches.length   : 0);
  console.log("From failure count → failed:", testsFailed);
}

// ── Method 3: testsuite level se sum karo ─────────────────────
if (testsTotal === 0) {
  let sumTotal   = 0;
  let sumFailed  = 0;
  const suiteRegex = /<testsuite[^>]*/g;
  let suiteMatch;
  while ((suiteMatch = suiteRegex.exec(xml)) !== null) {
    const a = suiteMatch[0];
    const t = a.match(/\btests="(\d+)"/);
    const f = a.match(/\bfailures="(\d+)"/);
    const e = a.match(/\berrors="(\d+)"/);
    if (t) sumTotal  += parseInt(t[1], 10);
    if (f) sumFailed += parseInt(f[1], 10);
    if (e) sumFailed += parseInt(e[1], 10);
  }
  if (sumTotal > 0) {
    testsTotal  = sumTotal;
    testsFailed = sumFailed;
    console.log("From testsuite sum → total:", testsTotal, "failed:", testsFailed);
  }
}

const testsPassed = testsTotal - testsFailed;

// ── Failure details collect karo ──────────────────────────────
const failures      = [];
const testcaseRegex = /<testcase\s([^>]+)>([\s\S]*?)<\/testcase>/g;
let match;

while ((match = testcaseRegex.exec(xml)) !== null) {
  const attrs = match[1];
  const body  = match[2];

  if (!body.includes("<failure") && !body.includes("<error")) continue;

  const name      = (attrs.match(/name="([^"]*)"/)     || [])[1] || "Unknown test";
  const classname = (attrs.match(/classname="([^"]*)"/) || [])[1] || "";

  const msgAttr = body.match(/<(?:failure|error)[^>]*message="([^"]*)"/);
  const msgBody = body.match(/<(?:failure|error)[^>]*>([\s\S]*?)<\/(?:failure|error)>/);

  let failMsg = "No details";
  if (msgAttr && msgAttr[1]) {
    failMsg = msgAttr[1].trim().slice(0, 200);
  } else if (msgBody && msgBody[1]) {
    failMsg = msgBody[1].trim().slice(0, 200);
  }

  const decode = s => s
    .replace(/&amp;/g, "&").replace(/&lt;/g,  "<")
    .replace(/&gt;/g,  ">").replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");

  const shortClass = classname.split(".").pop() || classname;
  failures.push(`❌ ${decode(shortClass)} → ${decode(name)} → ${decode(failMsg)}`);
}

const failureDetailsStr = failures.length > 0
  ? failures.slice(0, 20).join(" | ")
  : "None";

// ── GITHUB_ENV mein likho ─────────────────────────────────────
writeEnv(envFile, {
  TESTS_TOTAL:     String(testsTotal),
  TESTS_PASSED:    String(testsPassed),
  TESTS_FAILED:    String(testsFailed),
  FAILURE_DETAILS: failureDetailsStr,
});

console.log("==========================================");
console.log("Total  :", testsTotal);
console.log("Passed :", testsPassed);
console.log("Failed :", testsFailed);
console.log("==========================================");

if (failures.length > 0) {
  console.log("FAILED TESTS:");
  failures.forEach(f => console.log(" ", f));
}

// ── Helper function ───────────────────────────────────────────
function writeEnv(envPath, vars) {
  let content = "";
  for (const [key, val] of Object.entries(vars)) {
    const safeVal = String(val)
      .replace(/\r/g, "")
      .replace(/\n/g, " ");
    content += `${key}=${safeVal}\n`;
  }
  fs.appendFileSync(envPath, content);
  console.log("Written to GITHUB_ENV:", Object.keys(vars).join(", "));
}
