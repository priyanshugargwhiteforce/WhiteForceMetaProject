# External WhatsApp API & Conversation Logs Integration Guide
## Official Production Integration Specification & Test Script for Third-Party Applications (CRM, ATS, HRMS, Billing Apps, Job Portals & Custom Apps)

---

## 1. Production API Credentials & Endpoints Overview

* **Production Base URL:** `https://wfadmanager.astro-buddy.in/api/whatsapp`
* **Internal API Key:** `whiteforceadmanager2026garg18` (Header: `x-internal-api-key`)

### Quick Reference of Available External Endpoints

| Method | Endpoint Route | Description | Auth Header Required |
| :--- | :--- | :--- | :--- |
| `POST` | `/track-external-message` | Track & log an outgoing WhatsApp template message sent by your software. | `x-internal-api-key` |
| `GET` | `/external/messages` | Query tracked message logs with status filters & pagination. | `x-internal-api-key` |
| `GET` | `/external/conversation/:phone` | Fetch complete 2-way conversation history & rich media for a candidate number. | `x-internal-api-key` |
| `GET` | `/media/:mediaId/stream` | Stream binary media attachments (photos, videos, voice notes, documents, stickers). | `x-internal-api-key` or `token` |

---

## 2. Authentication & Security

All external API endpoints require authentication via internal API key header validation and source application scoping.

### Required HTTP Headers

| Header Key | Type | Description | Example Value |
| :--- | :--- | :--- | :--- |
| `x-internal-api-key` | String | **Required.** Production secret API key. | `whiteforceadmanager2026garg18` |
| `Content-Type` | String | **Required for POST.** Data format. | `application/json` |

---

## 3. Detailed Endpoint Specifications

---

### Endpoint 1: Track Outgoing External WhatsApp Message

Call this endpoint whenever your software (ATS/CRM/Job Portal) sends a WhatsApp template or message to a candidate/customer. It logs the event and automatically updates candidate contacts in CRM.

> **CRITICAL FIELD DISTINCTION:**
> - `recipient_name`: Candidate / Customer's actual full name (e.g. `"Deepshikha Das"`). Saved as Contact Name in CRM.
> - `source_user_name`: Recruiter / System User's name sending the message (e.g. `"Production Tester 1"`). Saved in message logs.

* **HTTP Method:** `POST`
* **Route:** `https://wfadmanager.astro-buddy.in/api/whatsapp/track-external-message`

#### JSON Request Body Payload

```json
{
  "source_app": "ats",
  "phone_number_id": "1195443523643877",
  "recipient_number": "917047490032",
  "recipient_name": "Deepshikha Das",
  "message_id": "wamid.HBgMOTE3MDQ3NDkwMDMyFQIAERgSQzg0QTg0MTczNjM4ODAzRjEzAA==",
  "template_name": "job_offer_invitation",
  "source_user_id": "prod_user_1",
  "source_user_name": "Production Tester 1",
  "source_reference_id": "prod_ref_101",
  "template_language": "en_US",
  "template_params": {
    "1": "Deepshikha Das",
    "2": "Software Engineer"
  }
}
```

| Field Name | Type | Required? | Description |
| :--- | :--- | :--- | :--- |
| `source_app` | String | **Yes** | App identifier (e.g. `ats`, `crm`, `website`, `job_portal`, `wira_ai`, `custom_app`). |
| `phone_number_id` | String | **Yes** | Meta WABA Phone Number ID (e.g. `1195443523643877`). |
| `recipient_number` | String | **Yes** | Candidate phone number with country code (digits only, e.g. `917047490032`). |
| `recipient_name` | String | Optional | Candidate / Customer's real full name (e.g. `Deepshikha Das`). |
| `message_id` | String | **Yes** | Unique Meta WhatsApp `wamid` returned from Meta API. |
| `template_name` | String | **Yes** | Approved Meta WhatsApp Template Name. |
| `source_user_id` | String | Optional | User ID of recruiter/agent in your system sending the message. |
| `source_user_name` | String | Optional | Full name of recruiter/agent in your system sending the message. |
| `source_reference_id` | String | Optional | Primary reference ID of candidate/order in your software. |
| `template_language` | String | Optional | Language code (default: `en_US`). |
| `template_params` | Object | Optional | Parameter mappings for `{{1}}`, `{{2}}` template variables. |

#### Success Response (`201 Created`)

```json
{
  "success": true,
  "message": "External WhatsApp message tracked successfully.",
  "message_id": "wamid.HBgMOTE3MDQ3NDkwMDMyFQIAERgSQzg0QTg0MTczNjM4ODAzRjEzAA=="
}
```

---

### Endpoint 2: Fetch Tracked External Message Logs

* **HTTP Method:** `GET`
* **Route:** `https://wfadmanager.astro-buddy.in/api/whatsapp/external/messages`

#### Query Parameters

```
https://wfadmanager.astro-buddy.in/api/whatsapp/external/messages?source_app=ats&recipient_number=917047490032&status=sent&page=1&limit=20
```

| Query Param | Type | Description |
| :--- | :--- | :--- |
| `source_app` | String | **Required.** Your application name (e.g., `ats`, `crm`). |
| `source_user_id` | String | Optional. Filter by recruiter user ID. |
| `recipient_number` | String | Optional. Filter by candidate phone number. |
| `status` | String | Optional. Filter status (`sent`, `delivered`, `read`, `failed`, `replied`). |
| `page` | Integer | Optional. Default `1`. |
| `limit` | Integer | Optional. Default `20`. |

#### Success Response (`200 OK`)

```json
{
  "success": true,
  "total": 5,
  "page": 1,
  "limit": 20,
  "totalPages": 1,
  "messages": [
    {
      "id": 16,
      "phone_number_id": "1195443523643877",
      "recipient_number": "917047490032",
      "template_name": "job_offer_invitation",
      "status": "sent",
      "message_id": "prod_test_msg_id_172290000_1",
      "source_app": "ats",
      "source_user_id": "prod_user_1",
      "source_user_name": "Production Tester 1",
      "source_reference_id": "prod_ref_101",
      "message_type": "template",
      "direction": "outgoing",
      "template_params_json": { "1": "ValueA_1", "2": "ValueB_1" },
      "sent_at": "2026-08-06T12:00:00.000Z"
    }
  ]
}
```

---

### Endpoint 3: Fetch 2-Way Chat Timeline & Rich Media Logs

Fetch full 2-way conversation logs for any candidate phone number, including outgoing templates and incoming customer rich messages (photos, videos, voice notes, stickers, locations, shared contacts, interactives, reactions, and catalog orders).

* **HTTP Method:** `GET`
* **Route:** `https://wfadmanager.astro-buddy.in/api/whatsapp/external/conversation/:phone`

#### Query Parameters
* `source_app`: `ats` (or your application name)

#### Example Request URL
```
GET https://wfadmanager.astro-buddy.in/api/whatsapp/external/conversation/917047490032?source_app=ats
```

#### Success Response (`200 OK`)

```json
{
  "success": true,
  "phone": "917047490032",
  "source_app": "ats",
  "conversation": [
    {
      "id": 101,
      "message_id": "prod_test_msg_id_101",
      "recipient_number": "917047490032",
      "direction": "outgoing",
      "message_type": "template",
      "template_name": "job_offer_invitation",
      "template_params_json": { "1": "Deepshikha Das", "2": "Software Engineer" },
      "status": "read",
      "sent_at": "2026-08-06T12:00:00.000Z"
    },
    {
      "id": 105,
      "message_id": "wamid.HBgMOTE3MDQ3NDkwMDMyFQIAERgSQzg...",
      "recipient_number": "917047490032",
      "direction": "incoming",
      "message_type": "reply",
      "type": "audio",
      "received_message_text": "🎙️ Voice Note",
      "media_id": "98127391823712",
      "audio_url": "/api/whatsapp/media/98127391823712/stream",
      "mime_type": "audio/ogg",
      "status": "replied",
      "sent_at": "2026-08-06T12:05:30.000Z"
    }
  ]
}
```

---

## 4. Rich Media Types & Payload Schemas Breakdown

When customer replies are retrieved from `/external/conversation/:phone`, each message object contains a `type` field and rich media properties:

| Message Type (`type`) | Payload Key Fields | Description & Rendering Rule |
| :--- | :--- | :--- |
| `text` | `received_message_text` | Plain text reply from customer. |
| `image` | `media_id`, `caption`, `mime_type` | Photo sent by user. Render: `<img src="https://wfadmanager.astro-buddy.in/api/whatsapp/media/{media_id}/stream" />` |
| `video` | `media_id`, `caption`, `mime_type` | Video clip sent by user. Render: `<video controls src="https://wfadmanager.astro-buddy.in/api/whatsapp/media/{media_id}/stream"></video>` |
| `voice` / `audio` | `media_id`, `audio_url`, `mime_type` | Voice Note / Audio track. Render: `<audio controls src="https://wfadmanager.astro-buddy.in/api/whatsapp/media/{media_id}/stream"></audio>` |
| `document` | `media_id`, `filename`, `caption` | PDF / Word Resume attachment. Link to stream URL for download. |
| `sticker` | `media_id`, `mime_type` | WhatsApp Sticker. Render image with stream URL. |
| `location` | `location: { latitude, longitude, name, address, url }` | Shared Location. Display location card & map URL button. |
| `contacts` | `contacts: { name, phone }` | Shared Contact Card. Display contact avatar & phone number. |
| `interactive` / `button` | `interactive: { type, title, id }` | Interactive Button / List Reply selection. |
| `reaction` | `emoji` | Emoji reaction (e.g. `❤️`, `👍`). |
| `order` | `order: { catalog_id, items }` | Product Catalog Order details. |
| `unsupported` | `received_message_text` | Meta API version format notice badge. |

---

## 5. Official Production Integration Test Script (`runProductionTests.js`)

Share this exact runnable Node.js test script with your integration development team. They can execute `node runProductionTests.js` to instantly verify API authorization, track 5 messages across applications, query logs, and load the 2-way conversation timeline.

```javascript
const axios = require('axios');

const BASE_URL = 'https://wfadmanager.astro-buddy.in/api/whatsapp';

// Internal API Keys for Production Environment
const API_KEYS = [
    'whiteforceadmanager2026garg18'
];

const TEST_PHONE = '917047490032';

async function runProductionTests() {
    console.log('========================================================');
    console.log('         TESTING WHATSAPP LIVE PRODUCTION API           ');
    console.log('========================================================\n');
    console.log(`Target Host: ${BASE_URL}\n`);

    let activeApiKey = null;

    // Step 1: Detect working API key by making a test GET request
    console.log('🔍 Checking API key authorization...');
    for (const key of API_KEYS) {
        try {
            await axios.get(`${BASE_URL}/external/messages`, {
                headers: { 'x-internal-api-key': key },
                params: { source_app: 'ats', limit: 1 }
            });
            activeApiKey = key;
            console.log(`✅ Authorization successful with API key: ${key}`);
            break;
        } catch (err) {
            console.log(`❌ Auth check failed with API key: ${key}`);
            if (err.response) {
                console.log(`   Status: ${err.response.status}`);
                console.log(`   Body:`, err.response.data);
            } else {
                console.log(`   Error: ${err.message}`);
            }
        }
    }

    if (!activeApiKey) {
        console.error('❌ Could not authenticate with any key. Please make sure the server is deployed and env variables are set.');
        return;
    }

    // Step 2: Send 5 unique test messages across external app modules
    const apps = ['website', 'crm', 'job_portal', 'wira_ai', 'ats'];
    const messageIds = [];

    console.log('\n🚀 Sending 5 test messages to production tracker...');
    for (let i = 1; i <= 5; i++) {
        const app = apps[(i - 1) % apps.length];
        const msgId = `prod_test_msg_id_${Date.now()}_${i}`;
        messageIds.push(msgId);

        const payload = {
            source_app: app,
            phone_number_id: '1195443523643877',
            recipient_number: TEST_PHONE,
            recipient_name: `Candidate Name ${i}`, // Candidate real name
            message_id: msgId,
            template_name: `prod_test_template_${app}`,
            source_user_id: `prod_user_${i}`,
            source_user_name: `Production Tester ${i}`, // Recruiter sender name
            source_reference_id: `prod_ref_${100 + i}`,
            template_language: 'en_US',
            template_params: {
                "1": `ValueA_${i}`,
                "2": `ValueB_${i}`
            }
        };

        try {
            const response = await axios.post(`${BASE_URL}/track-external-message`, payload, {
                headers: { 'x-internal-api-key': activeApiKey }
            });
            console.log(`👉 Message ${i} [App: ${app}] tracked: Status ${response.status}, message_id: ${response.data.message_id}`);
        } catch (err) {
            console.error(`❌ Failed to track message ${i}:`, err.response ? err.response.data : err.message);
        }
    }

    // Step 3: Verify records by fetching logs for each app
    console.log('\n🔍 Verifying messages from production endpoint...');
    for (const app of apps) {
        try {
            const logsResponse = await axios.get(`${BASE_URL}/external/messages`, {
                headers: { 'x-internal-api-key': activeApiKey },
                params: {
                    source_app: app,
                    recipient_number: TEST_PHONE
                }
            });

            console.log(`\n📂 [App: ${app}] Records Found: ${logsResponse.data.total}`);
            if (logsResponse.data.messages && logsResponse.data.messages.length > 0) {
                const sample = logsResponse.data.messages[0];
                console.log(`   Sample Log:`);
                console.log(`   - Message ID: ${sample.message_id}`);
                console.log(`   - Status: ${sample.status}`);
                console.log(`   - Sender Username: ${sample.source_user_name}`);
                console.log(`   - Template: ${sample.template_name}`);
                console.log(`   - Parameters:`, sample.template_params_json);
            }
        } catch (err) {
            console.error(`❌ Failed to fetch logs for app ${app}:`, err.response ? err.response.data : err.message);
        }
    }

    // Step 4: Verify conversation timeline & rich media payload for phone
    console.log(`\n🔍 Verifying timeline for phone ${TEST_PHONE}...`);
    try {
        const timelineResponse = await axios.get(`${BASE_URL}/external/conversation/${TEST_PHONE}`, {
            headers: { 'x-internal-api-key': activeApiKey },
            params: { source_app: 'ats' }
        });
        console.log(`✅ Timeline loaded successfully. Total messages found: ${timelineResponse.data.conversation.length}`);
        console.log(`Showing first 2 timeline entries:`);
        console.log(JSON.stringify(timelineResponse.data.conversation.slice(0, 2), null, 2));
    } catch (err) {
        console.error(`❌ Failed to fetch timeline:`, err.response ? err.response.data : err.message);
    }
}

runProductionTests();
```

---

## 6. Frontend UI Rendering Component (React Reference Implementation)

Share this React component with your web development team to render rich WhatsApp messages directly in their software:

```jsx
import React from 'react';
import { MapPin, Mic, Image, Video, FileText, Smile, UserCheck, MousePointerClick, ShoppingBag, ExternalLink, AlertCircle } from 'lucide-react';

export const RenderWhatsAppMessage = ({ msg, apiKey }) => {
  const BASE_URL = 'https://wfadmanager.astro-buddy.in/api/whatsapp';
  const streamUrl = msg.media_id 
    ? `${BASE_URL}/media/${msg.media_id}/stream?token=${apiKey}` 
    : null;

  // 1. Shared Location
  if (msg.type === 'location' || msg.location) {
    const loc = msg.location || {};
    return (
      <div className="p-2.5 bg-slate-100 dark:bg-slate-800 rounded-xl space-y-1">
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-rose-500" />
          <span className="font-bold text-xs">{loc.name || 'Shared Location'}</span>
        </div>
        {loc.address && <p className="text-[11px] text-slate-600">{loc.address}</p>}
        {loc.url && (
          <a href={loc.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-emerald-600 font-bold mt-1">
            <ExternalLink className="w-3 h-3" /> Open in Google Maps
          </a>
        )}
      </div>
    );
  }

  // 2. Voice Note / Audio
  if (msg.type === 'voice' || msg.type === 'audio' || msg.audio_url) {
    const src = msg.audio_url || streamUrl;
    return (
      <div className="p-2 bg-purple-50 dark:bg-purple-950/30 rounded-xl space-y-1">
        <div className="flex items-center gap-2">
          <Mic className="w-4 h-4 text-purple-500" />
          <span className="text-xs font-bold">{msg.type === 'voice' ? '🎙️ Voice Note' : '🎵 Audio Message'}</span>
        </div>
        {src && <audio controls className="w-full max-w-[240px] h-8" src={src} />}
      </div>
    );
  }

  // 3. Image / Photo
  if (msg.type === 'image') {
    return (
      <div className="space-y-1">
        {streamUrl && (
          <a href={streamUrl} target="_blank" rel="noreferrer">
            <img src={streamUrl} alt="Photo" className="max-w-xs max-h-60 rounded-xl object-cover" />
          </a>
        )}
        {msg.caption && <p className="text-xs">{msg.caption}</p>}
      </div>
    );
  }

  // 4. Video
  if (msg.type === 'video') {
    return (
      <div className="space-y-1">
        {streamUrl && <video controls className="max-w-xs max-h-60 rounded-xl" src={streamUrl} />}
        {msg.caption && <p className="text-xs">{msg.caption}</p>}
      </div>
    );
  }

  // 5. Document / PDF Attachment
  if (msg.type === 'document') {
    return (
      <div className="flex items-center justify-between p-2.5 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-semibold">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-amber-500" />
          <span>{msg.filename || 'Document'}</span>
        </div>
        {streamUrl && (
          <a href={streamUrl} target="_blank" download={msg.filename || 'document'} className="text-emerald-600">
            <ExternalLink className="w-4 h-4" />
          </a>
        )}
      </div>
    );
  }

  // 6. Sticker
  if (msg.type === 'sticker') {
    return streamUrl ? (
      <img src={streamUrl} alt="Sticker" className="w-24 h-24 object-contain" />
    ) : (
      <span className="text-xs">🎨 Sticker</span>
    );
  }

  // 7. Shared Contact Card
  if (msg.type === 'contacts' || msg.contacts) {
    const c = msg.contacts || {};
    return (
      <div className="flex items-center gap-2 p-2 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl text-xs">
        <UserCheck className="w-4 h-4 text-emerald-500" />
        <div>
          <p className="font-bold">{c.name || 'Shared Contact'}</p>
          {c.phone && <p className="font-mono text-[11px]">{c.phone}</p>}
        </div>
      </div>
    );
  }

  // 8. Interactive Button / List Option
  if (msg.type === 'interactive' || msg.type === 'button') {
    return (
      <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full text-xs font-bold">
        <MousePointerClick className="w-3.5 h-3.5" />
        <span>{msg.interactive?.title || msg.received_message_text}</span>
      </div>
    );
  }

  // Default Text
  return <p className="whitespace-pre-line text-xs">{msg.received_message_text || msg.body}</p>;
};
```
