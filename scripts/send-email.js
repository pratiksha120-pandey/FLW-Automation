const { execSync } = require("child_process");
try { require.resolve("nodemailer"); }
catch { execSync("npm install --no-save nodemailer", { stdio: "inherit" }); }

const nodemailer = require("nodemailer");

const {
  SMTP_HOST = "smtp.gmail.com", SMTP_PORT = "587",
  SMTP_USER, SMTP_PASS, NOTIFY_EMAIL,
  TESTS_TOTAL = "0", TESTS_PASSED = "0", TESTS_FAILED = "0",
  FAILURE_DETAILS = "None", EXECUTION_TIME = "N/A",
  COLLECTION_NAME = "API Collection", ENV_NAME = "Environment",
  TOTAL_REQUESTS = "0", NEWMAN_EXIT_CODE = "0",
  GITHUB_RUN_URL = "#", GITHUB_RUN_NUMBER = "0",
  TRIGGERED_BY = "unknown", BRANCH = "main",
} = process.env;

const missing = ["SMTP_USER", "SMTP_PASS", "NOTIFY_EMAIL"].filter(k => !process.env[k]);
if (missing.length) { console.error("Missing secrets:", missing.join(", ")); process.exit(1); }

const failed   = parseInt(TESTS_FAILED, 10);
const total    = parseInt(TESTS_TOTAL, 10);
const passed   = parseInt(TESTS_PASSED, 10);
const passRate = total > 0 ? Math.round((passed / total) * 100) : 0;
const isPass = parseInt(TESTS_FAILED || "0", 10) === 0;

const statusColor  = isPass ? "#16a34a" : "#dc2626";
const statusLabel  = isPass ? "✅ PASSED" : "❌ FAILED";
const statusBg     = isPass ? "#dcfce7"  : "#fee2e2";

let failureRows = "";
if (failed > 0 && FAILURE_DETAILS !== "None") {
  failureRows = FAILURE_DETAILS.split(" | ").filter(Boolean)
    .map((item, i) =>
      `<tr style="background:${i % 2 === 0 ? "#fff" : "#fef2f2"}">
        <td style="padding:8px 12px;border-bottom:1px solid #fecaca;color:#991b1b;font-size:13px">${item}</td>
      </tr>`
    ).join("");
}

const html = `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f8fafc;font-family:Arial,sans-serif">
<table width="100%" style="padding:24px 0"><tr><td align="center">
<table width="600" style="background:#fff;border-radius:12px;border:1px solid #e2e8f0">

  <tr><td style="background:#0f172a;padding:24px 32px;border-radius:12px 12px 0 0">
    <table width="100%"><tr>
      <td><div style="color:#94a3b8;font-size:11px">Postman · Newman · GitHub Actions</div>
          <div style="color:#fff;font-size:20px;font-weight:700">API Automation Report</div></td>
      <td align="right"><span style="background:${statusBg};color:${statusColor};border-radius:999px;padding:4px 14px;font-size:13px;font-weight:700">${statusLabel}</span></td>
    </tr></table>
  </td></tr>

  <tr><td style="padding:24px 32px">
    <table width="100%"><tr>
      <td style="padding:0 8px 0 0;width:25%"><div style="background:#eff6ff;border-radius:8px;padding:14px;text-align:center">
        <div style="font-size:26px;font-weight:700;color:#3b82f6">${TOTAL_REQUESTS}</div>
        <div style="font-size:11px;color:#64748b">APIs Executed</div></div></td>
      <td style="padding:0 8px;width:25%"><div style="background:#f5f3ff;border-radius:8px;padding:14px;text-align:center">
        <div style="font-size:26px;font-weight:700;color:#8b5cf6">${TESTS_TOTAL}</div>
        <div style="font-size:11px;color:#64748b">Tests Run</div></div></td>
      <td style="padding:0 8px;width:25%"><div style="background:#f0fdf4;border-radius:8px;padding:14px;text-align:center">
        <div style="font-size:26px;font-weight:700;color:#16a34a">${TESTS_PASSED}</div>
        <div style="font-size:11px;color:#64748b">Passed</div></div></td>
      <td style="padding:0 0 0 8px;width:25%"><div style="background:${failed > 0 ? "#fff1f2" : "#f8fafc"};border-radius:8px;padding:14px;text-align:center">
        <div style="font-size:26px;font-weight:700;color:${failed > 0 ? "#dc2626" : "#64748b"}">${TESTS_FAILED}</div>
        <div style="font-size:11px;color:#64748b">Failed</div></div></td>
    </tr></table>

    <div style="margin-top:16px">
      <div style="display:flex;justify-content:space-between;margin-bottom:4px">
        <span style="font-size:12px;color:#64748b">Pass rate</span>
        <span style="font-size:12px;font-weight:600;color:${statusColor}">${passRate}%</span>
      </div>
      <div style="background:#e2e8f0;border-radius:999px;height:8px">
        <div style="width:${passRate}%;background:${statusColor};height:8px;border-radius:999px"></div>
      </div>
    </div>
  </td></tr>

  <tr><td style="padding:0 32px 24px">
    <table width="100%" style="background:#f1f5f9;border-radius:8px"><tr>
      <td style="padding:12px 16px"><span style="font-size:11px;color:#64748b">Collection</span><br>
        <span style="font-size:14px;font-weight:600">${COLLECTION_NAME}</span></td>
      <td style="padding:12px 16px"><span style="font-size:11px;color:#64748b">Environment</span><br>
        <span style="font-size:14px;font-weight:600">${ENV_NAME}</span></td>
      <td style="padding:12px 16px"><span style="font-size:11px;color:#64748b">Duration</span><br>
        <span style="font-size:14px;font-weight:600">${EXECUTION_TIME}</span></td>
      <td style="padding:12px 16px"><span style="font-size:11px;color:#64748b">Trigger</span><br>
        <span style="font-size:14px;font-weight:600">${TRIGGERED_BY} · ${BRANCH}</span></td>
      <td style="padding:12px 16px" align="right">
        <a href="${GITHUB_RUN_URL}" style="background:#0f172a;color:#fff;text-decoration:none;padding:8px 16px;border-radius:6px;font-size:13px;font-weight:600">View Logs →</a>
      </td>
    </tr></table>
  </td></tr>

  ${failureRows ? `
  <tr><td style="padding:0 32px 24px">
    <div style="font-size:13px;font-weight:700;color:#991b1b;margin-bottom:10px">⚠️ Failure Details</div>
    <table width="100%" style="border:1px solid #fecaca;border-radius:8px;overflow:hidden">${failureRows}</table>
  </td></tr>` : ""}

  <tr><td style="padding:16px 32px;background:#f8fafc;border-top:1px solid #e2e8f0;border-radius:0 0 12px 12px">
    <p style="margin:0;font-size:11px;color:#94a3b8;text-align:center">
      Auto-generated by Postman + Newman CI/CD · Run #${GITHUB_RUN_NUMBER} · Collection fetched live from Postman API
    </p>
  </td></tr>

</table></td></tr></table>
</body></html>`;

(async () => {
  const transporter = nodemailer.createTransport({
    host: SMTP_HOST, port: parseInt(SMTP_PORT, 10),
    secure: parseInt(SMTP_PORT, 10) === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
    tls: { rejectUnauthorized: false },
  });

  const subject = `[${isPass ? "PASSED" : "FAILED"}] ${COLLECTION_NAME} — ${TESTS_PASSED}/${TESTS_TOTAL} passed (Run #${GITHUB_RUN_NUMBER})`;

  const info = await transporter.sendMail({
    from: `"API Automation" <${SMTP_USER}>`,
    to: NOTIFY_EMAIL, subject, html,
  });

  console.log(`Email sent: ${info.messageId} → ${NOTIFY_EMAIL}`);
})().catch(err => { console.error("Email failed:", err.message); process.exit(1); });
