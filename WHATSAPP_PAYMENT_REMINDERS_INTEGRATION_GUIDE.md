# WhatsApp Payment & Overdue Reminders — API Integration Guide
## Production Integration Manual for Developers & AI Agents (PHP, Node.js, Python & cURL)

---

## 1. Overview & Architecture

Yeh API external applications (**PHP/Laravel web apps, Core PHP billing systems, ERPs, CRM portals, Python microservices, ya Node.js systems**) ko White Force WhatsApp Gateway ke through **Payment Reminder** aur **Overdue Payment Reminder** templates automated bhejney ki suvidha deti hai.

### Features
* **Meta Cloud API (v24.0) Verified Delivery**: Don't worry about Meta Graph API complex payloads, tokens, ya rate limits — gateway handle karega.
* **Automatic Phone Sanitization**: 10-digit Indian numbers (`9876543210`) ya standard formats automatically `919876543210` me clean ho jaate hain.
* **Dynamic PDF Attachment**: Har invoice ka PDF WhatsApp document format me attach hota hai jiska filename automatically derive hota hai.
* **Built-in Duplicate Protection (Idempotency)**: Same invoice reference ID aur customer number par 15 minute ke andar repeat call aane par duplicate WhatsApp message spam hone se block ho jata hai.
* **Audit Logging & Delivery Tracking**: Har outgoing reminder `whatsapp_message_logs` me audit hota hai aur Meta delivery webhooks se automatically track hota hai.

---

## 2. API Endpoints & Authentication

### Base URLs
* **Production**: `https://wfadmanager.astro-buddy.in/api/whatsapp`
* **Local / Development**: `http://localhost:8000/api/whatsapp`

### Required HTTP Headers
| Header Name | Type | Value / Description | Required? |
| :--- | :--- | :--- | :--- |
| `Content-Type` | String | `application/json` | **Yes** |
| `x-internal-api-key` | String | `whiteforceadmanager2026garg18` *(from `.env`)* | **Yes** |

---

## 3. Endpoint 1: Send Payment Reminder

Send gentle payment reminder with invoice PDF attachment.

* **HTTP Method**: `POST`
* **Route**: `/api/whatsapp/send-payment-reminder`
* **Full URL**: `https://wfadmanager.astro-buddy.in/api/whatsapp/send-payment-reminder`

### WhatsApp Message Preview
```text
[ 📄 Document: Invoice_WF-2-24-26.pdf ]

Hello Suresh Kumar,

This is a gentle reminder regarding the payment for your payroll services.

📅 Payroll Month: July
🧾 Invoice Date: 02-04-2026
🔢 Invoice Number: WF-2-24-26
💰 Invoice Amount: ₹12345
⏳ Pending Amount: ₹1234

We kindly request you to arrange the pending payment as per the agreed payment schedule.

Thank you for your prompt attention.

Regards,
White Force Billing Team

Powered By White-Force
```

### Request Payload Fields
| Field Name | Type | Required? | Description & Example |
| :--- | :--- | :--- | :--- |
| `source_app` | String | **Yes** | Calling app name (e.g. `"billing_app"`, `"payroll_system"`, `"crm"`) |
| `recipient_phone` | String | **Yes** | Customer phone number (e.g. `"919300855707"` ya `"9300855707"`) |
| `pdf_url` | String | **Yes** | Publicly accessible HTTPS URL of Invoice PDF |
| `customer_name` | String | **Yes** | Recipient / Customer Name (`{{1}}`, e.g. `"Suresh Kumar"`) |
| `payroll_month` | String | **Yes** | Billing / Payroll Month (`{{2}}`, e.g. `"July"`) |
| `invoice_date` | String | **Yes** | Invoice Issue Date (`{{3}}`, e.g. `"02-04-2026"`) |
| `invoice_number` | String | **Yes** | Invoice ID (`{{4}}`, e.g. `"WF-2-24-26"`) |
| `invoice_amount` | String/Number | **Yes** | Total invoice amount (`{{5}}`, e.g. `"12345"`) |
| `pending_amount` | String/Number | **Yes** | Remaining balance (`{{6}}`, e.g. `"1234"`) |
| `pdf_filename` | String | *Optional* | Custom PDF display name (e.g. `"Invoice_July_2026.pdf"`) |
| `source_reference_id` | String | *Optional* | Unique invoice/transaction reference for duplicate prevention |
| `source_user_name` | String | *Optional* | Name of billing agent/system operator triggering the reminder |

### Sample JSON Request
```json
{
  "source_app": "billing_portal",
  "recipient_phone": "919300855707",
  "pdf_url": "https://wfadmanager.astro-buddy.in/uploads/sample_invoice.pdf",
  "customer_name": "Suresh Kumar",
  "payroll_month": "July",
  "invoice_date": "02-04-2026",
  "invoice_number": "WF-2-24-26",
  "invoice_amount": "12345",
  "pending_amount": "1234",
  "source_reference_id": "WF-2-24-26"
}
```

### Sample Response (`200 OK`)
```json
{
  "success": true,
  "status": "accepted",
  "message": "Payment reminder accepted by Meta Cloud API.",
  "data": {
    "message_id": "wamid.HBgMOTE5MzAwODU1NzA3FQIAERgSRUIyRDhBODMyQzdEMTQwMkJBAA==",
    "recipient": "919300855707",
    "template_name": "payment_reminder",
    "source_reference_id": "WF-2-24-26"
  }
}
```

---

## 4. Endpoint 2: Send Overdue Payment Reminder

Send overdue payment alert when an invoice has passed its due date.

* **HTTP Method**: `POST`
* **Route**: `/api/whatsapp/send-overdue-payment-reminder`
* **Full URL**: `https://wfadmanager.astro-buddy.in/api/whatsapp/send-overdue-payment-reminder`

### WhatsApp Message Preview
```text
[ 📄 Document: Overdue_Invoice_24554645.pdf ]

Hello Suresh,

This is a reminder that the payment for your payroll services is currently overdue.

📅 Payroll Month: July
🧾 Invoice Date: 02-02-2026
🔢 Invoice Number: 24554645
💰 Invoice Amount: ₹4534534
⏳ Pending Amount: ₹5345
📆 Payment Due Date: 01-02-2026
⚠️ Overdue By: 1 day(s)

We kindly request you to clear the pending amount at the earliest to avoid any further delay in payment.

If the payment has already been processed, please ignore this reminder.

Thank you for your cooperation.

Regards,
White Force Billing Team
```

### Request Payload Fields
| Field Name | Type | Required? | Description & Example |
| :--- | :--- | :--- | :--- |
| `source_app` | String | **Yes** | Calling app name (e.g. `"billing_app"`, `"payroll_system"`) |
| `recipient_phone` | String | **Yes** | Customer phone number (e.g. `"919300855707"`) |
| `pdf_url` | String | **Yes** | Publicly accessible HTTPS URL of Overdue Invoice PDF |
| `customer_name` | String | **Yes** | Customer Name (`{{1}}`, e.g. `"Suresh"`) |
| `payroll_month` | String | **Yes** | Payroll Month (`{{2}}`, e.g. `"July"`) |
| `invoice_date` | String | **Yes** | Invoice Issue Date (`{{3}}`, e.g. `"02-02-2026"`) |
| `invoice_number` | String | **Yes** | Invoice ID (`{{4}}`, e.g. `"24554645"`) |
| `invoice_amount` | String/Number | **Yes** | Total invoice amount (`{{5}}`, e.g. `"4534534"`) |
| `pending_amount` | String/Number | **Yes** | Remaining overdue amount (`{{6}}`, e.g. `"5345"`) |
| `payment_due_date` | String | **Yes** | Original Due Date (`{{7}}`, e.g. `"01-02-2026"`) |
| `overdue_by_days` | String/Number | **Yes** | Days overdue (`{{8}}`, e.g. `"1"` ya `1`) |
| `pdf_filename` | String | *Optional* | Custom PDF display name |
| `source_reference_id` | String | *Optional* | Unique reference for duplicate prevention |
| `source_user_name` | String | *Optional* | User name who triggered this alert |

### Sample JSON Request
```json
{
  "source_app": "billing_portal",
  "recipient_phone": "919300855707",
  "pdf_url": "https://wfadmanager.astro-buddy.in/uploads/overdue_invoice.pdf",
  "customer_name": "Suresh",
  "payroll_month": "July",
  "invoice_date": "02-02-2026",
  "invoice_number": "24554645",
  "invoice_amount": "4534534",
  "pending_amount": "5345",
  "payment_due_date": "01-02-2026",
  "overdue_by_days": "1",
  "source_reference_id": "24554645"
}
```

### Sample Response (`200 OK`)
```json
{
  "success": true,
  "status": "accepted",
  "message": "Overdue payment reminder accepted by Meta Cloud API.",
  "data": {
    "message_id": "wamid.HBgMOTE5MzAwODU1NzA3FQIAERgSRUIyRDhBODMyQzdEMTQwMkJBAA==",
    "recipient": "919300855707",
    "template_name": "overdue_payment_reminder",
    "source_reference_id": "24554645"
  }
}
```

---

## 5. Ready-to-Use Code Implementations

### A. PHP (Core PHP / cURL) — Recommended for PHP Developers

Copy-paste this reusable helper function into your PHP project:

```php
<?php
/**
 * Send WhatsApp Payment Reminder via White Force WhatsApp Gateway
 *
 * @param array $data Array of reminder fields
 * @param bool $isOverdue Set true for overdue reminder, false for standard
 * @return array Response data containing success and message_id
 * @throws Exception On API or network failure
 */
function sendWhatsAppPaymentReminder(array $data, bool $isOverdue = false): array
{
    $baseUrl = 'https://wfadmanager.astro-buddy.in/api/whatsapp'; // or http://localhost:8000/api/whatsapp
    $apiKey = 'whiteforceadmanager2026garg18'; // Replace with your internal API key from .env

    $endpoint = $isOverdue 
        ? $baseUrl . '/send-overdue-payment-reminder'
        : $baseUrl . '/send-payment-reminder';

    $payload = json_encode($data);

    $ch = curl_init($endpoint);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => $payload,
        CURLOPT_HTTPHEADER => [
            'Content-Type: application/json',
            'x-internal-api-key: ' . $apiKey
        ],
        CURLOPT_TIMEOUT => 15,
        CURLOPT_SSL_VERIFYPEER => true
    ]);

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlError = curl_error($ch);
    curl_close($ch);

    if ($curlError) {
        throw new Exception("cURL Error: " . $curlError);
    }

    $result = json_decode($response, true);

    if ($httpCode !== 200 || empty($result['success'])) {
        $errorMsg = $result['message'] ?? 'Unknown Gateway Error';
        throw new Exception("WhatsApp API Error (HTTP $httpCode): " . $errorMsg);
    }

    return $result;
}

// ==========================================
// EXAMPLE USAGE 1: Standard Payment Reminder
// ==========================================
try {
    $reminderData = [
        'source_app'          => 'php_billing_crm',
        'recipient_phone'     => '9300855707', // 10 digits or 91... both work
        'pdf_url'             => 'https://example.com/invoices/WF-2-24-26.pdf',
        'customer_name'       => 'Suresh Kumar',
        'payroll_month'       => 'July',
        'invoice_date'        => '02-04-2026',
        'invoice_number'      => 'WF-2-24-26',
        'invoice_amount'      => '12345',
        'pending_amount'      => '1234',
        'source_reference_id' => 'INV-WF-2-24-26'
    ];

    $res = sendWhatsAppPaymentReminder($reminderData, false);
    echo "✓ Success! WhatsApp Message ID: " . $res['data']['message_id'] . "\n";

} catch (Exception $e) {
    echo "✗ Failed to send reminder: " . $e->getMessage() . "\n";
}

// ==========================================
// EXAMPLE USAGE 2: Overdue Payment Reminder
// ==========================================
try {
    $overdueData = [
        'source_app'          => 'php_billing_crm',
        'recipient_phone'     => '9300855707',
        'pdf_url'             => 'https://example.com/invoices/24554645.pdf',
        'customer_name'       => 'Suresh',
        'payroll_month'       => 'July',
        'invoice_date'        => '02-02-2026',
        'invoice_number'      => '24554645',
        'invoice_amount'      => '4534534',
        'pending_amount'      => '5345',
        'payment_due_date'    => '01-02-2026',
        'overdue_by_days'     => '1',
        'source_reference_id' => 'INV-24554645'
    ];

    $res = sendWhatsAppPaymentReminder($overdueData, true);
    echo "✓ Overdue Alert Sent! WhatsApp Message ID: " . $res['data']['message_id'] . "\n";

} catch (Exception $e) {
    echo "✗ Failed to send overdue alert: " . $e->getMessage() . "\n";
}
?>
```

---

### B. PHP (Laravel — HTTP Client / Guzzle)

```php
<?php
namespace App\Services;

use Illuminate\Support\Facades\Http;
use Exception;

class WhatsAppReminderService
{
    protected string $baseUrl;
    protected string $apiKey;

    public function __construct()
    {
        $this->baseUrl = config('services.whatsapp_gateway.url', 'https://wfadmanager.astro-buddy.in/api/whatsapp');
        $this->apiKey = config('services.whatsapp_gateway.key', 'whiteforceadmanager2026garg18');
    }

    public function sendPaymentReminder(array $invoiceData): array
    {
        $response = Http::withHeaders([
            'x-internal-api-key' => $this->apiKey,
            'Content-Type' => 'application/json',
        ])->timeout(15)->post("{$this->baseUrl}/send-payment-reminder", $invoiceData);

        if (!$response->successful()) {
            throw new Exception("WhatsApp API Failed: " . $response->json('message', 'Unknown error'));
        }

        return $response->json();
    }

    public function sendOverdueReminder(array $overdueData): array
    {
        $response = Http::withHeaders([
            'x-internal-api-key' => $this->apiKey,
            'Content-Type' => 'application/json',
        ])->timeout(15)->post("{$this->baseUrl}/send-overdue-payment-reminder", $overdueData);

        if (!$response->successful()) {
            throw new Exception("WhatsApp API Failed: " . $response->json('message', 'Unknown error'));
        }

        return $response->json();
    }
}
```

---

### C. Node.js (Axios)

```javascript
const axios = require('axios');

const BASE_URL = 'https://wfadmanager.astro-buddy.in/api/whatsapp';
const API_KEY = 'whiteforceadmanager2026garg18';

async function sendPaymentReminder(data) {
  try {
    const res = await axios.post(`${BASE_URL}/send-payment-reminder`, data, {
      headers: {
        'Content-Type': 'application/json',
        'x-internal-api-key': API_KEY
      },
      timeout: 15000
    });
    console.log('✓ Success:', res.data);
    return res.data;
  } catch (err) {
    console.error('✗ API Error:', err.response?.data || err.message);
    throw err;
  }
}

// Example call
sendPaymentReminder({
  source_app: 'node_billing',
  recipient_phone: '9300855707',
  pdf_url: 'https://example.com/inv.pdf',
  customer_name: 'Suresh Kumar',
  payroll_month: 'July',
  invoice_date: '02-04-2026',
  invoice_number: 'WF-2-24-26',
  invoice_amount: '12345',
  pending_amount: '1234'
});
```

---

### D. Python (Requests)

```python
import requests

BASE_URL = "https://wfadmanager.astro-buddy.in/api/whatsapp"
API_KEY = "whiteforceadmanager2026garg18"

headers = {
    "Content-Type": "application/json",
    "x-internal-api-key": API_KEY
}

def send_payment_reminder(data: dict):
    url = f"{BASE_URL}/send-payment-reminder"
    response = requests.post(url, json=data, headers=headers, timeout=15)
    response.raise_for_status()
    return response.json()

# Example usage
payload = {
    "source_app": "python_erp",
    "recipient_phone": "9300855707",
    "pdf_url": "https://example.com/invoice.pdf",
    "customer_name": "Suresh Kumar",
    "payroll_month": "July",
    "invoice_date": "02-04-2026",
    "invoice_number": "WF-2-24-26",
    "invoice_amount": "12345",
    "pending_amount": "1234"
}

res = send_payment_reminder(payload)
print("WhatsApp Message ID:", res["data"]["message_id"])
```

---

### E. cURL / Postman / Terminal Command

```bash
curl -X POST https://wfadmanager.astro-buddy.in/api/whatsapp/send-payment-reminder \
  -H "Content-Type: application/json" \
  -H "x-internal-api-key: whiteforceadmanager2026garg18" \
  -d '{
    "source_app": "terminal_test",
    "recipient_phone": "919300855707",
    "pdf_url": "https://example.com/invoices/WF-2-24-26.pdf",
    "customer_name": "Suresh Kumar",
    "payroll_month": "July",
    "invoice_date": "02-04-2026",
    "invoice_number": "WF-2-24-26",
    "invoice_amount": "12345",
    "pending_amount": "1234",
    "source_reference_id": "WF-2-24-26"
  }'
```

---

## 6. Error Handling & Response Codes

| HTTP Status | Error Type | Common Cause & Resolution |
| :--- | :--- | :--- |
| **`400 Bad Request`** | Validation Error | Koi required field missing hai ya `pdf_url` valid HTTP/HTTPS URL nahi hai. Response JSON me `errors` array check karein. |
| **`401 Unauthorized`** | Auth Failed | `x-internal-api-key` header missing hai ya invalid key pass ki gayi hai. Header verify karein. |
| **`400 Bad Request`** | Missing source_app | `source_app` field body me missing hai (e.g. `"billing_crm"` pass karein). |
| **`200 OK` (duplicate_skipped)** | Idempotency | Same invoice number aur customer phone number ko pichle 15 minute me reminder already sent hai. Duplicate prevent ho gaya. |
| **`502 Bad Gateway`** | Meta API Rejection | Customer phone number WhatsApp par register nahi hai, Meta rate-limit lag gaya hai, ya PDF link Meta CDN se fetch nahi ho paya. `metaError` object check karein. |

### Sample Validation Error Response (`400 Bad Request`)
```json
{
  "success": false,
  "message": "Validation failed: invoice_amount is required, pending_amount is required",
  "errors": [
    "invoice_amount is required",
    "pending_amount is required"
  ]
}
```

### Sample Duplicate Prevented Response (`200 OK`)
```json
{
  "success": true,
  "status": "duplicate_skipped",
  "message": "Payment reminder was already accepted/sent recently for this invoice.",
  "data": {
    "message_id": "wamid.HBgMOTE5MzAwODU1NzA3FQIAERgSRUIyRDhBODMyQzdEMTQwMkJBAA==",
    "recipient": "919300855707",
    "template_name": "payment_reminder",
    "source_reference_id": "WF-2-24-26",
    "sent_at": "2026-10-09T10:15:00.000Z"
  }
}
```

---

## 7. Developer Checklist for Implementation

1. **Verify PDF Accessibility**: Invoice PDF ka URL public internet se accessible hona chahiye (HTTP status 200 return kare aur bina session login ke open ho sake) taaki Meta CDN use download karke WhatsApp message me attach kar sake.
2. **Always Pass `source_reference_id`**: Har call me apne invoice ka unique ID (e.g. `"INV-2026-001"`) pass karein taaki network retry par duplicate messages send na hon.
3. **Use Background Jobs**: Agar aapke paas bulk invoices (e.g. 50+ reminders ek sath) hain, toh PHP Laravel Queue ya background cron job ke through in APIs ko call karein taaki user interface block na ho.
