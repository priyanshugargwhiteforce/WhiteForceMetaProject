require("dotenv").config({
  path: require("path").join(__dirname, "..", ".env"),
});
const assert = require("assert");
const axios = require("axios");
const { pool } = require("../src/config/db");

const {
  sendPaymentReminder,
} = require("../src/services/whatsapp-template-send/paymentReminder.service");

const {
  sendOverduePaymentReminder,
} = require("../src/services/whatsapp-template-send/overduePaymentReminder.service");

const paymentController = require("../src/controllers/whatsapp/whatsapp-payment-reminder.controller");

// Existing report services (Regression check)
const dailyTaskReminder = require("../src/services/dailyTaskReminder.service");
const weeklyBusinessReport = require("../src/services/weeklyBusinessReport.service");

async function runTests() {
  console.log(
    "╔══════════════════════════════════════════════════════════════════════════════╗",
  );
  console.log(
    "║        COMPREHENSIVE TEST SUITE: WHATSAPP PAYMENT REMINDERS                 ║",
  );
  console.log(
    "╚══════════════════════════════════════════════════════════════════════════════╝\n",
  );

  let passed = 0;
  let failed = 0;

  async function test(name, fn) {
    try {
      await fn();
      console.log(`  ✓ PASS: ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ✗ FAIL: ${name}`);
      console.error(`    Error: ${err.message}`);
      failed++;
    }
  }

  // Backup original axios.post
  const originalAxiosPost = axios.post;

  // =========================================================================
  // SECTION 1: REGRESSION CHECKS ON EXISTING REPORT SERVICES
  // =========================================================================
  console.log("--- 1. Existing Reports Integrity (Regression) ---");

  await test("dailyTaskReminder exports cleanPhoneNumber and initDailyTaskCron", () => {
    assert.strictEqual(typeof dailyTaskReminder.cleanPhoneNumber, "function");
    assert.strictEqual(
      typeof dailyTaskReminder.checkAndSendMissingTaskReminders,
      "function",
    );
    assert.strictEqual(typeof dailyTaskReminder.initDailyTaskCron, "function");
    assert.strictEqual(
      dailyTaskReminder.cleanPhoneNumber("7047490032"),
      "917047490032",
    );
  });

  await test("weeklyBusinessReport exports all core functions without alteration", () => {
    assert.strictEqual(
      typeof weeklyBusinessReport.getWeeklyReportMetrics,
      "function",
    );
    assert.strictEqual(
      typeof weeklyBusinessReport.sendWeeklyBusinessReport,
      "function",
    );
    assert.strictEqual(
      typeof weeklyBusinessReport.initWeeklyBusinessReportCron,
      "function",
    );
  });

  // =========================================================================
  // SECTION 2: PAYMENT_REMINDER PAYLOAD STRUCTURE & MOCK META API
  // =========================================================================
  console.log("\n--- 2. Template 1: payment_reminder Payload Structure ---");

  let capturedPaymentPayload = null;
  let capturedPaymentUrl = null;
  let capturedPaymentHeaders = null;

  axios.post = async (url, payload, options) => {
    if (url.includes("/messages")) {
      capturedPaymentUrl = url;
      capturedPaymentPayload = payload;
      capturedPaymentHeaders = options?.headers;
      return {
        status: 200,
        data: {
          messaging_product: "whatsapp",
          contacts: [{ input: payload.to, wa_id: payload.to }],
          messages: [{ id: "wamid.TEST_MOCK_PAYMENT_REMINDER_001" }],
        },
      };
    }
    return originalAxiosPost(url, payload, options);
  };

  await test("payment_reminder builds exact document header and 6 positional body variables", async () => {
    const dummyRef = `TEST_PAY_${Date.now()}`;
    const result = await sendPaymentReminder({
      recipient_phone: "7047490032",
      pdf_url: "https://example.com/invoices/WF-2-24-26.pdf",
      customer_name: "Priyanshu Garg",
      payroll_month: "July",
      invoice_date: "02-04-2026",
      invoice_number: "WF-2-24-26",
      invoice_amount: "12345",
      pending_amount: "1234",
      source_app: "unit_test",
      source_reference_id: dummyRef,
    });

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.status, "accepted");
    assert.strictEqual(
      result.data.message_id,
      "wamid.TEST_MOCK_PAYMENT_REMINDER_001",
    );

    // Check Meta URL version
    assert.ok(
      capturedPaymentUrl.includes("/v24.0/"),
      "Meta Graph API URL must use v24.0",
    );
    assert.strictEqual(capturedPaymentPayload.messaging_product, "whatsapp");
    assert.strictEqual(capturedPaymentPayload.to, "917047490032");
    assert.strictEqual(
      capturedPaymentPayload.template.name,
      "payment_reminder",
    );
    assert.strictEqual(capturedPaymentPayload.template.language.code, "en");

    const comps = capturedPaymentPayload.template.components;
    assert.strictEqual(comps.length, 2, "Must have header and body components");

    // Header Document verification
    const headerComp = comps.find((c) => c.type === "header");
    assert.ok(headerComp, "Header component must exist");
    assert.strictEqual(headerComp.parameters[0].type, "document");
    assert.strictEqual(
      headerComp.parameters[0].document.link,
      "https://example.com/invoices/WF-2-24-26.pdf",
    );
    assert.strictEqual(
      headerComp.parameters[0].document.filename,
      "Invoice_WF-2-24-26.pdf",
    );

    // Body Parameters verification (Exact 6 positional values)
    const bodyComp = comps.find((c) => c.type === "body");
    assert.ok(bodyComp, "Body component must exist");
    assert.strictEqual(
      bodyComp.parameters.length,
      6,
      "Must have exactly 6 body parameters",
    );
    assert.strictEqual(
      bodyComp.parameters[0].text,
      "Priyanshu Garg",
      "{{1}} must be customer_name",
    );
    assert.strictEqual(
      bodyComp.parameters[1].text,
      "July",
      "{{2}} must be payroll_month",
    );
    assert.strictEqual(
      bodyComp.parameters[2].text,
      "02-04-2026",
      "{{3}} must be invoice_date",
    );
    assert.strictEqual(
      bodyComp.parameters[3].text,
      "WF-2-24-26",
      "{{4}} must be invoice_number",
    );
    assert.strictEqual(
      bodyComp.parameters[4].text,
      "12345",
      "{{5}} must be invoice_amount",
    );
    assert.strictEqual(
      bodyComp.parameters[5].text,
      "1234",
      "{{6}} must be pending_amount",
    );

    // Confirm NO parameter_name key is leaked in positional parameters
    bodyComp.parameters.forEach((param, idx) => {
      assert.strictEqual(
        param.parameter_name,
        undefined,
        `Parameter ${idx + 1} must NOT have parameter_name key`,
      );
    });
  });

  // =========================================================================
  // SECTION 3: OVERDUE_PAYMENT_REMINDER PAYLOAD STRUCTURE & MOCK META API
  // =========================================================================
  console.log(
    "\n--- 3. Template 2: overdue_payment_reminder Payload Structure ---",
  );

  let capturedOverduePayload = null;
  let capturedOverdueUrl = null;

  axios.post = async (url, payload, options) => {
    if (url.includes("/messages")) {
      capturedOverdueUrl = url;
      capturedOverduePayload = payload;
      return {
        status: 200,
        data: {
          messaging_product: "whatsapp",
          contacts: [{ input: payload.to, wa_id: payload.to }],
          messages: [{ id: "wamid.TEST_MOCK_OVERDUE_002" }],
        },
      };
    }
    return originalAxiosPost(url, payload, options);
  };

  await test("overdue_payment_reminder builds exact document header and 8 positional body variables", async () => {
    const dummyRef = `TEST_OVERDUE_${Date.now()}`;
    const result = await sendOverduePaymentReminder({
      recipient_phone: "917047490032",
      pdf_url: "https://example.com/invoices/24554645.pdf",
      customer_name: "Priyanshu Garg",
      payroll_month: "July",
      invoice_date: "02-02-2026",
      invoice_number: "24554645",
      invoice_amount: "4534534",
      pending_amount: "5345",
      payment_due_date: "01-02-2026",
      overdue_by_days: "1",
      source_app: "unit_test",
      source_reference_id: dummyRef,
    });

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.status, "accepted");
    assert.strictEqual(result.data.message_id, "wamid.TEST_MOCK_OVERDUE_002");

    assert.strictEqual(
      capturedOverduePayload.template.name,
      "overdue_payment_reminder",
    );
    assert.strictEqual(capturedOverduePayload.template.language.code, "en");

    const comps = capturedOverduePayload.template.components;
    const headerComp = comps.find((c) => c.type === "header");
    assert.strictEqual(
      headerComp.parameters[0].document.link,
      "https://example.com/invoices/24554645.pdf",
    );
    assert.strictEqual(
      headerComp.parameters[0].document.filename,
      "Overdue_Invoice_24554645.pdf",
    );

    const bodyComp = comps.find((c) => c.type === "body");
    assert.strictEqual(
      bodyComp.parameters.length,
      8,
      "Must have exactly 8 body parameters",
    );
    assert.strictEqual(
      bodyComp.parameters[0].text,
      "Priyanshu Garg",
      "{{1}} must be customer_name",
    );
    assert.strictEqual(
      bodyComp.parameters[1].text,
      "July",
      "{{2}} must be payroll_month",
    );
    assert.strictEqual(
      bodyComp.parameters[2].text,
      "02-02-2026",
      "{{3}} must be invoice_date",
    );
    assert.strictEqual(
      bodyComp.parameters[3].text,
      "24554645",
      "{{4}} must be invoice_number",
    );
    assert.strictEqual(
      bodyComp.parameters[4].text,
      "4534534",
      "{{5}} must be invoice_amount",
    );
    assert.strictEqual(
      bodyComp.parameters[5].text,
      "5345",
      "{{6}} must be pending_amount",
    );
    assert.strictEqual(
      bodyComp.parameters[6].text,
      "01-02-2026",
      "{{7}} must be payment_due_date",
    );
    assert.strictEqual(
      bodyComp.parameters[7].text,
      "1",
      "{{8}} must be overdue_by_days",
    );
  });

  // =========================================================================
  // SECTION 4: INPUT VALIDATION FAILURES
  // =========================================================================
  console.log("\n--- 4. Input Validation & Edge Case Protections ---");

  await test("Fails when recipient_phone is invalid or empty", async () => {
    let threw = false;
    try {
      await sendPaymentReminder({
        recipient_phone: "123",
        pdf_url: "https://example.com/test.pdf",
        customer_name: "Test",
        payroll_month: "Jan",
        invoice_date: "01-01-2026",
        invoice_number: "123",
        invoice_amount: "100",
        pending_amount: "50",
      });
    } catch (e) {
      threw = true;
      assert.ok(e.message.includes("Invalid recipient phone number"));
    }
    assert.strictEqual(threw, true);
  });

  await test("Fails when pdf_url is not a valid HTTP/HTTPS URL", async () => {
    let threw = false;
    try {
      await sendPaymentReminder({
        recipient_phone: "9876543210",
        pdf_url: "ftp://invalid-url.pdf",
        customer_name: "Test",
        payroll_month: "Jan",
        invoice_date: "01-01-2026",
        invoice_number: "123",
        invoice_amount: "100",
        pending_amount: "50",
      });
    } catch (e) {
      threw = true;
      assert.ok(e.message.includes("Valid HTTP/HTTPS pdf_url is required"));
    }
    assert.strictEqual(threw, true);
  });

  await test("Fails when required parameter invoice_amount is missing", async () => {
    let threw = false;
    try {
      await sendPaymentReminder({
        recipient_phone: "7047490032",
        pdf_url: "https://example.com/test.pdf",
        customer_name: "Priyanshu Garg",
        payroll_month: "Jan",
        invoice_date: "01-01-2026",
        invoice_number: "123",
        invoice_amount: "",
        pending_amount: "50",
      });
    } catch (e) {
      threw = true;
      assert.ok(e.message.includes("invoice_amount is required"));
    }
    assert.strictEqual(threw, true);
  });

  await test("Controller returns 400 Bad Request with missing fields list", async () => {
    const req = {
      body: { recipient_phone: "9876543210" },
      query: {},
      headers: {},
    };
    let statusCode = null;
    let responseData = null;
    const res = {
      status: (code) => {
        statusCode = code;
        return res;
      },
      json: (data) => {
        responseData = data;
        return res;
      },
    };

    await paymentController.sendPaymentReminder(req, res);
    assert.strictEqual(statusCode, 400);
    assert.strictEqual(responseData.success, false);
    assert.ok(responseData.message.includes("Validation failed"));
    assert.ok(Array.isArray(responseData.errors));
  });

  // =========================================================================
  // SECTION 5: META API REJECTION & TIMEOUT HANDLING
  // =========================================================================
  console.log("\n--- 5. Meta API Rejection & Error Handling ---");

  axios.post = async (url, payload, options) => {
    if (url.includes("/messages")) {
      const err = new Error("Request failed with status code 400");
      err.response = {
        status: 400,
        data: {
          error: {
            message: "(#130429) Rate limit hit for this phone number",
            type: "OAuthException",
            code: 130429,
          },
        },
      };
      throw err;
    }
    return originalAxiosPost(url, payload, options);
  };

  await test("Handles Meta API 400 rejection gracefully and logs error", async () => {
    let caughtError = null;
    try {
      await sendPaymentReminder({
        recipient_phone: "7047490032",
        pdf_url: "https://example.com/invoice.pdf",
        customer_name: "Priyanshu Garg",
        payroll_month: "July",
        invoice_date: "01-01-2026",
        invoice_number: "INV-RATE-001",
        invoice_amount: "1000",
        pending_amount: "500",
        source_reference_id: `RATE_TEST_${Date.now()}`,
      });
    } catch (e) {
      caughtError = e;
    }

    assert.ok(caughtError, "Must propagate error to caller");
    assert.strictEqual(caughtError.statusCode, 400);
    assert.ok(caughtError.message.includes("Rate limit hit"));
    assert.strictEqual(caughtError.metaError.code, 130429);
  });

  // =========================================================================
  // SECTION 6: IDEMPOTENCY / DUPLICATE REQUEST CHECK
  // =========================================================================
  console.log("\n--- 6. Idempotency & Duplicate Request Protection ---");

  // Restore working mock
  axios.post = async (url, payload, options) => {
    if (url.includes("/messages")) {
      return {
        status: 200,
        data: {
          messaging_product: "whatsapp",
          messages: [{ id: "wamid.TEST_IDEMPOTENT_MSG_999" }],
        },
      };
    }
    return originalAxiosPost(url, payload, options);
  };

  await test("Skips sending and returns duplicate_skipped on repeated request for same reference", async () => {
    const uniqueRef = `IDEMP_${Date.now()}`;
    const phone = "917047490032";

    // Pre-insert simulated recent log in DB
    await pool.query(
      `INSERT INTO whatsapp_message_logs 
             (phone_number_id, recipient_number, template_name, status, message_id, source_app, source_reference_id)
             VALUES ('1074482565758550', ?, 'payment_reminder', 'sent', 'wamid.EXISTING_IDEMPOTENT_LOG_111', 'test_idemp', ?)`,
      [phone, uniqueRef],
    );

    const result = await sendPaymentReminder({
      recipient_phone: phone,
      pdf_url: "https://example.com/invoice.pdf",
      customer_name: "Idempotency User",
      payroll_month: "July",
      invoice_date: "01-01-2026",
      invoice_number: "INV-IDEMP",
      invoice_amount: "5000",
      pending_amount: "2000",
      source_reference_id: uniqueRef,
    });

    assert.strictEqual(result.status, "duplicate_skipped");
    assert.strictEqual(
      result.data.message_id,
      "wamid.EXISTING_IDEMPOTENT_LOG_111",
    );
  });

  // Cleanup mock
  axios.post = originalAxiosPost;

  // =========================================================================
  // FINAL SUMMARY
  // =========================================================================
  console.log(
    "\n══════════════════════════════════════════════════════════════════════════════",
  );
  console.log(`TEST SUMMARY: ${passed} Passed, ${failed} Failed`);
  console.log(
    "══════════════════════════════════════════════════════════════════════════════\n",
  );

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests().catch((err) => {
  console.error("Fatal Test Runner Error:", err);
  process.exit(1);
});
