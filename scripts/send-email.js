const { execSync } = require("child_process");
try { require.resolve("nodemailer"); }
catch { execSync("npm install --no-save nodemailer", { stdio: "inherit" }); }

const nodemailer = require("nodemailer");
const fs         = require("fs");

const {
  SMTP_HOST = "smtp.gmail.com", SMTP_PORT = "587",
  SMTP_USER, SMTP_PASS, NOTIFY_EMAIL,
  TESTS_TOTAL     = "0",
  TESTS_PASSED    = "0",
  TESTS_FAILED    = "0",
  FAILURE_DETAILS = "None",
  EXECUTION_TIME  = "N/A",
  COLLECTION_NAME = "FLW API",
  ENV_NAME        = "FLW API",
  TOTAL_REQUESTS  = "0",
  NEWMAN_EXIT_CODE = "0",
  GITHUB_RUN_URL    = "#",
  GITHUB_RUN_NUMBER = "0",
  TRIGGERED_BY      = "unknown",
  BRANCH            = "main",
} = process.env;

const missing = ["SMTP_USER","SMTP_PASS","NOTIFY_EMAIL"]
  .filter(k => !process.env[k]);
if (missing.length) {
  console.error("Missing secrets:", missing.join(", "));
  process.exit(1);
}

const failed   = parseInt(TESTS_FAILED,  10);
const total    = parseInt(TESTS_TOTAL,   10);
const passed   = parseInt(TESTS_PASSED,  10);
const passRate = total > 0 ? Math.round((passed / total) * 100) : 0;
const isPass   = failed === 0;

const statusColor  = isPass ? "#16a34a" : "#dc2626";
const statusLabel  = isPass ? "✅ PASSED" : "❌ FAILED";
const statusBg     = isPass ? "#dcfce7"  : "#fee2e2";
const statusBorder = isPass ? "#86efac"  : "#fca5a5";

// ── Build failure rows ─────────────────────────────────────────
let failureRowsHtml = "";
if (failed > 0 && FAILURE_DETAILS !== "None" && FAILURE_DETAILS !== "N/A") {
  const items = FAILURE_DETAILS.split(" | ").filter(Boolean);
  failureRowsHtml = items.map((item, i) => {
    const bg = i % 2 === 0 ? "#ffffff" : "#fef2f2";
    return `
      <tr style="background:${bg}">
        <td style="padding:10px 14px;border-bottom:1px solid #fecaca;
                   color:#991b1b;font-size:13px;line-height:1.5">
          ${escHtml(item)}
        </td>
      </tr>`;
  }).join("");
}

// ── Artifacts download link ────────────────────────────────────
const artifactsUrl = GITHUB_RUN_URL + "#artifacts";

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>API Automation Report</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;
             font-family:'Segoe UI',Arial,sans-serif;color:#1e293b">

<table width="100%" cellpadding="0" cellspacing="0"
       style="background:#f1f5f9;padding:32px 0">
<tr><td align="center">
<table width="620" cellpadding="0" cellspacing="0"
       style="background:#ffffff;border-radius:16px;overflow:hidden;
              border:1px solid #e2e8f0">

  <!-- ── Header ──────────────────────────────────────────────── -->
  <tr><td style="background:#0f172a;padding:28px 32px">
    <table width="100%" cellpadding="0" cellspacing="0"><tr>
      <td>
        <div style="color:#64748b;font-size:11px;
                    text-transform:uppercase;letter-spacing:.1em;
                    margin-bottom:6px">
          Postman · Newman · GitHub Actions
        </div>
        <div style="color:#f8fafc;font-size:22px;font-weight:700">
          API Automation Report
        </div>
        <div style="color:#64748b;font-size:12px;margin-top:4px">
          Run #${escHtml(GITHUB_RUN_NUMBER)} &nbsp;·&nbsp;
          ${escHtml(TRIGGERED_BY)} · ${escHtml(BRANCH)}
        </div>
      </td>
      <td align="right" style="vertical-align:top">
        <span style="display:inline-block;
                     background:${statusBg};
                     color:${statusColor};
                     border:1.5px solid ${statusBorder};
                     border-radius:999px;
                     padding:6px 18px;
                     font-size:14px;font-weight:700">
          ${statusLabel}
        </span>
      </td>
    </tr></table>
  </td></tr>

  <!-- ── Collection Info ──────────────────────────────────────── -->
  <tr><td style="padding:20px 32px;background:#f8fafc;
                 border-bottom:1px solid #e2e8f0">
    <table width="100%" cellpadding="0" cellspacing="0"><tr>
      <td style="padding-right:16px">
        <div style="font-size:11px;color:#64748b;
                    text-transform:uppercase;letter-spacing:.08em">
          Collection
        </div>
        <div style="font-size:15px;font-weight:600;
                    color:#0f172a;margin-top:2px">
          ${escHtml(COLLECTION_NAME)}
        </div>
      </td>
      <td style="padding-right:16px">
        <div style="font-size:11px;color:#64748b;
                    text-transform:uppercase;letter-spacing:.08em">
          Environment
        </div>
        <div style="font-size:15px;font-weight:600;
                    color:#0f172a;margin-top:2px">
          ${escHtml(ENV_NAME)}
        </div>
      </td>
      <td>
        <div style="font-size:11px;color:#64748b;
                    text-transform:uppercase;letter-spacing:.08em">
          Duration
        </div>
        <div style="font-size:15px;font-weight:600;
                    color:#0f172a;margin-top:2px">
          ${escHtml(EXECUTION_TIME)}
        </div>
      </td>
    </tr></table>
  </td></tr>

  <!-- ── Stats Cards ──────────────────────────────────────────── -->
  <tr><td style="padding:28px 32px">
    <table width="100%" cellpadding="0" cellspacing="0"><tr>

      <td style="width:25%;padding-right:10px">
        <div style="background:#eff6ff;border-radius:12px;
                    padding:16px;text-align:center">
          <div style="font-size:32px;font-weight:700;color:#2563eb">
            ${escHtml(TOTAL_REQUESTS)}
          </div>
          <div style="font-size:12px;color:#3b82f6;margin-top:4px;
                      font-weight:500">
            APIs Executed
          </div>
        </div>
      </td>

      <td style="width:25%;padding-right:10px">
        <div style="background:#f5f3ff;border-radius:12px;
                    padding:16px;text-align:center">
          <div style="font-size:32px;font-weight:700;color:#7c3aed">
            ${escHtml(TESTS_TOTAL)}
          </div>
          <div style="font-size:12px;color:#8b5cf6;margin-top:4px;
                      font-weight:500">
            Tests Run
          </div>
        </div>
      </td>

      <td style="width:25%;padding-right:10px">
        <div style="background:#f0fdf4;border-radius:12px;
                    padding:16px;text-align:center">
          <div style="font-size:32px;font-weight:700;color:#16a34a">
            ${escHtml(TESTS_PASSED)}
          </div>
          <div style="font-size:12px;color:#16a34a;margin-top:4px;
                      font-weight:500">
            Passed
          </div>
        </div>
      </td>

      <td style="width:25%">
        <div style="background:${failed > 0 ? "#fff1f2" : "#f8fafc"};
                    border-radius:12px;padding:16px;text-align:center">
          <div style="font-size:32px;font-weight:700;
                      color:${failed > 0 ? "#dc2626" : "#94a3b8"}">
            ${escHtml(TESTS_FAILED)}
          </div>
          <div style="font-size:12px;
                      color:${failed > 0 ? "#dc2626" : "#94a3b8"};
                      margin-top:4px;font-weight:500">
            Failed
          </div>
        </div>
      </td>

    </tr></table>

    <!-- Pass Rate Bar -->
    <div style="margin-top:20px">
      <table width="100%" cellpadding="0" cellspacing="0"><tr>
        <td>
          <span style="font-size:12px;color:#64748b">Pass rate</span>
        </td>
        <td align="right">
          <span style="font-size:13px;font-weight:700;
                       color:${statusColor}">
            ${passRate}%
          </span>
        </td>
      </tr></table>
      <div style="background:#e2e8f0;border-radius:999px;
                  height:10px;margin-top:6px;overflow:hidden">
        <div style="width:${passRate}%;background:${statusColor};
                    height:100%;border-radius:999px"></div>
      </div>
    </div>
  </td></tr>

  <!-- ── Action Buttons ───────────────────────────────────────── -->
  <tr><td style="padding:0 32px 28px">
    <table width="100%" cellpadding="0" cellspacing="0"><tr>

      <td style="padding-right:10px">
        <a href="${escHtml(GITHUB_RUN_URL)}"
           style="display:block;background:#0f172a;color:#ffffff;
                  text-decoration:none;padding:12px 0;
                  border-radius:8px;font-size:13px;font-weight:600;
                  text-align:center">
          🔍 View Workflow Logs
        </a>
      </td>

      <td>
        <a href="${escHtml(artifactsUrl)}"
           style="display:block;background:#2563eb;color:#ffffff;
                  text-decoration:none;padding:12px 0;
                  border-radius:8px;font-size:13px;font-weight:600;
                  text-align:center">
          📥 Download HTML Report
        </a>
      </td>

    </tr></table>
    <div style="margin-top:10px;padding:10px 14px;
                background:#f1f5f9;border-radius:8px;
                font-size:12px;color:#64748b;text-align:center">
      HTML report artifacts mein available hai →
      GitHub Run → Artifacts →
      <strong>FLW-API-Report-Run-${escHtml(GITHUB_RUN_NUMBER)}</strong>
      → Download → Open report.html in browser
    </div>
  </td></tr>

  <!-- ── Failure Details ──────────────────────────────────────── -->
  ${failed > 0 && failureRowsHtml ? `
  <tr><td style="padding:0 32px 28px">
    <div style="border:1.5px solid #fecaca;border-radius:12px;
                overflow:hidden">
      <div style="background:#fee2e2;padding:12px 16px">
        <span style="font-size:13px;font-weight:700;color:#991b1b">
          ❌ Failed Tests (${failed})
        </span>
        <span style="font-size:11px;color:#b91c1c;margin-left:8px">
          — Click Download HTML Report above for full details
        </span>
      </div>
      <table width="100%" cellpadding="0" cellspacing="0">
        ${failureRowsHtml}
      </table>
    </div>
  </td></tr>
  ` : ""}

  <!-- ── How to view full report ──────────────────────────────── -->
  <tr><td style="padding:0 32px 28px">
    <div style="background:#f0f9ff;border:1px solid #bae6fd;
                border-radius:10px;padding:16px">
      <div style="font-size:13px;font-weight:600;
                  color:#0369a1;margin-bottom:10px">
        📊 Full Clickable Report kaise dekhen
      </div>
      <div style="font-size:12px;color:#0c4a6e;line-height:1.8">
        <b>Step 1:</b> Upar "📥 Download HTML Report" button click karo<br>
        <b>Step 2:</b> GitHub pe Artifacts section mein
                       <code>FLW-API-Report-Run-${escHtml(GITHUB_RUN_NUMBER)}</code>
                       download karo<br>
        <b>Step 3:</b> ZIP extract karo<br>
        <b>Step 4:</b> <code>report.html</code> browser mein open karo<br>
        <b>Step 5:</b> Har request pe click karo —
                       request body, response, test results sab dikhega
      </div>
    </div>
  </td></tr>

  <!-- ── Footer ───────────────────────────────────────────────── -->
  <tr><td style="padding:16px 32px;background:#f8fafc;
                 border-top:1px solid #e2e8f0;
                 border-radius:0 0 16px 16px">
    <p style="margin:0;font-size:11px;color:#94a3b8;text-align:center">
      Auto-generated by Postman + Newman CI/CD Pipeline<br>
      Run #${escHtml(GITHUB_RUN_NUMBER)} ·
      Collection fetched live from Postman API ·
      No manual export needed
    </p>
  </td></tr>

</table>
</td></tr>
</table>
</body></html>`;

// ── Plain text fallback ────────────────────────────────────────
const text = `
API AUTOMATION REPORT — ${isPass ? "PASSED" : "FAILED"}
================================================
Collection  : ${COLLECTION_NAME}
Environment : ${ENV_NAME}
Triggered   : ${TRIGGERED_BY} on ${BRANCH}

RESULTS
-------
APIs Executed : ${TOTAL_REQUESTS}
Tests Run     : ${TESTS_TOTAL}
Passed        : ${TESTS_PASSED}
Failed        : ${TESTS_FAILED}
Pass Rate     : ${passRate}%
Duration      : ${EXECUTION_TIME}
Run #         : ${GITHUB_RUN_NUMBER}

${failed > 0 ? `FAILED TESTS\n${FAILURE_DETAILS.split(" | ").join("\n")}\n` : ""}
View Logs     : ${GITHUB_RUN_URL}
Download HTML : ${artifactsUrl}

HOW TO VIEW FULL REPORT:
1. Go to: ${artifactsUrl}
2. Download: FLW-API-Report-Run-${GITHUB_RUN_NUMBER}
3. Extract ZIP
4. Open report.html in browser
5. Click any request for full details
`.trim();

// ── Send ───────────────────────────────────────────────────────
(async () => {
  const transporter = nodemailer.createTransport({
    host:   SMTP_HOST,
    port:   parseInt(SMTP_PORT, 10),
    secure: parseInt(SMTP_PORT, 10) === 465,
    auth:   { user: SMTP_USER, pass: SMTP_PASS },
    tls:    { rejectUnauthorized: false },
  });

  const subject = failed > 0
    ? `❌ [FAILED] ${COLLECTION_NAME} — ${passed}/${total} passed, ${failed} failed (Run #${GITHUB_RUN_NUMBER})`
    : `✅ [PASSED] ${COLLECTION_NAME} — ${passed}/${total} passed (Run #${GITHUB_RUN_NUMBER})`;

  const attachments = [];
  const reportPath  = `newman-reports/report.html`;

  if (require("fs").existsSync(reportPath)) {
    attachments.push({
      filename: `FLW-API-Report-Run-${GITHUB_RUN_NUMBER}.html`,
      path:     reportPath,
      contentType: "text/html"
    });
    console.log("HTML report attached to email");
  }

  const info = await transporter.sendMail({
    from:        `"API Automation" <${SMTP_USER}>`,
    to:          NOTIFY_EMAIL,
    subject,
    text,
    html,
    attachments,
  });

  console.log(`Email sent: ${info.messageId} → ${NOTIFY_EMAIL}`);
})().catch(err => {
  console.error("Email failed:", err.message);
  process.exit(1);
});

// ─────────────────────────────────────────────────────────────
function escHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
