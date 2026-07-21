================================================================================
WIRA DATABASE SCHEMA — COMPLETE DOCUMENTATION
================================================================================

All new tables are prefixed with wira_. The old conversation_* tables remain
untouched as backup for the existing system. intro_audio_template is the only
shared table used by both architectures — documented in the Reference section.

Prerequisites — run once before anything else:
    CREATE EXTENSION IF NOT EXISTS vector;
    CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Helper trigger function to automatically update updatedAt columns
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW."updatedAt" = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

pg_notify payload limit is 8000 bytes. All trigger functions that join child
tables deliberately exclude large JSONB blobs (transcript, cleanTranscript,
screeningQA, screeningQuestions, whatsappRawPayload, embedding) to stay safe.
Consumers that need those blobs should query the table directly using the id
from the notification payload.

Notification channels in this system:
    wira_candidate_changes
    wira_call_changes
    wira_outbound_screening_changes
    wira_app_changes
    wira_app_message_changes
    wira_whatsapp_changes
    wira_whatsapp_message_changes
    wira_queue_changes
    wira_queue_due               (fired by pg_cron every minute)
    wira_cache_costs_changes

================================================================================
TABLE 1 — wira_candidate
================================================================================

The central identity record for every candidate that interacts with the Wira
system across any channel. A candidate is identified uniquely by their phone
number. All other tables — calls, app sessions, whatsapp sessions — hang off
this table. The hasCall / hasWhatsapp / hasApp flags give a quick channel
presence check without needing to join child tables. The insights column holds
AI-generated candidate intelligence accumulated over time.

+------------------+-------------+--------------------------------------------+
| Column           | Type        | Constraints                                |
+------------------+-------------+--------------------------------------------+
| id               | BIGSERIAL   | Primary Key                                |
| phone            | VARCHAR(20) | NOT NULL, UNIQUE                           |
| candidateId      | BIGINT      | UNIQUE, nullable                           |
| candidateData    | JSONB       | nullable                                   |
| name             | VARCHAR(255)| nullable                                   |
| email            | VARCHAR(255)| UNIQUE, nullable                           |
| hasCall          | BOOLEAN     | NOT NULL, DEFAULT false                    |
| hasWhatsapp      | BOOLEAN     | NOT NULL, DEFAULT false                    |
| hasApp           | BOOLEAN     | NOT NULL, DEFAULT false                    |
| insights         | TEXT        | nullable                                   |
| createdAt        | TIMESTAMPTZ | NOT NULL, DEFAULT NOW()                    |
| updatedAt        | TIMESTAMPTZ | NOT NULL, DEFAULT NOW()                    |
+------------------+-------------+--------------------------------------------+

--- SQL ---

CREATE TABLE wira_candidate
(
    "id"            BIGSERIAL    PRIMARY KEY,
    "phone"         VARCHAR(20)  NOT NULL,
    "candidateId"   BIGINT,
    "candidateData" JSONB,
    "name"          VARCHAR(255),
    "email"         VARCHAR(255),
    "hasCall"       BOOLEAN      NOT NULL DEFAULT FALSE,
    "hasWhatsapp"   BOOLEAN      NOT NULL DEFAULT FALSE,
    "hasApp"        BOOLEAN      NOT NULL DEFAULT FALSE,
    "insights"      TEXT,
    "createdAt"     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    "updatedAt"     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    CONSTRAINT "uq_wiraCandidate_phone"       UNIQUE ("phone"),
    CONSTRAINT "uq_wiraCandidate_email"       UNIQUE ("email"),
    CONSTRAINT "uq_wiraCandidate_candidateId" UNIQUE ("candidateId")
);

-- lookup by phone is the most common query in the entire system
CREATE INDEX "idx_wiraCandidate_phone"       ON wira_candidate("phone");
CREATE INDEX "idx_wiraCandidate_email"       ON wira_candidate("email")       WHERE "email"       IS NOT NULL;
CREATE INDEX "idx_wiraCandidate_candidateId" ON wira_candidate("candidateId") WHERE "candidateId" IS NOT NULL;
CREATE INDEX "idx_wiraCandidate_name"        ON wira_candidate("name")        WHERE "name"        IS NOT NULL;
-- channel presence filters
CREATE INDEX "idx_wiraCandidate_hasCall"     ON wira_candidate("hasCall")     WHERE "hasCall"     = TRUE;
CREATE INDEX "idx_wiraCandidate_hasWhatsapp" ON wira_candidate("hasWhatsapp") WHERE "hasWhatsapp" = TRUE;
CREATE INDEX "idx_wiraCandidate_hasApp"      ON wira_candidate("hasApp")      WHERE "hasApp"      = TRUE;
CREATE INDEX "idx_wiraCandidate_createdAt"   ON wira_candidate("createdAt"    DESC);
CREATE INDEX "idx_wiraCandidate_updatedAt"   ON wira_candidate("updatedAt"    DESC);

CREATE OR REPLACE FUNCTION notify_wira_candidate_changes()
RETURNS TRIGGER AS $$
DECLARE
    payload JSONB;
    row_data JSONB;
BEGIN
    IF TG_OP = 'DELETE' THEN
        row_data := row_to_json(OLD)::JSONB;
    ELSE
        row_data := row_to_json(NEW)::JSONB;
    END IF;

    payload := jsonb_build_object(
        'operation', TG_OP,
        'table',     TG_TABLE_NAME,
        'data',      row_data - 'candidateData'  -- exclude large blob
    );

    PERFORM pg_notify('wira_candidate_changes', payload::TEXT);
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_wira_candidate_changes
AFTER INSERT OR UPDATE OR DELETE ON wira_candidate
FOR EACH ROW EXECUTE FUNCTION notify_wira_candidate_changes();

CREATE OR REPLACE TRIGGER trg_wira_candidate_updated_at
BEFORE UPDATE ON wira_candidate
FOR EACH ROW EXECUTE FUNCTION set_updated_at();


================================================================================
TABLE 2 — wira_call
================================================================================

Represents every phone call made or received through the Wira system regardless
of call type. This is the top-level call record and holds all data universal to
any call — transcript, cost breakdown, AI-generated summary, hangup details,
and a 1024-dimension semantic embedding of the summary. The embedding allows
chatbots and search systems to reference this call without reading the full
transcript. Call-type-specific data (e.g. screening results) lives in child
tables. hangupReason is what Plivo reported; hangupCause is what the AI
decided independently (e.g. user_busy, abusive, network_drop).

+-------------------+-------------+-------------------------------------------+
| Column            | Type        | Constraints                               |
+-------------------+-------------+-------------------------------------------+
| id                | BIGSERIAL   | Primary Key                               |
| wiraCandidateId   | BIGINT      | NOT NULL, FK → wira_candidate             |
| callId            | VARCHAR(255)| nullable — Plivo call ID                  |
| fromPhone         | VARCHAR(20) | NOT NULL                                  |
| bound             | VARCHAR(10) | NOT NULL, CHECK IN (inbound, outbound)    |
| type              | VARCHAR(100)| NOT NULL                                  |
| status            | VARCHAR(20) | NOT NULL, DEFAULT initiated               |
|                   |             | CHECK IN (initiated, in_progress,         |
|                   |             | finalizing, completed, failed, no_answer) |
| webName           | VARCHAR(255)| NOT NULL, DEFAULT White Force             |
| intro             | TEXT        | nullable                                  |
| language          | VARCHAR(20) | DEFAULT hi                                |
| transcript        | JSONB       | nullable                                  |
| cleanTranscript   | JSONB       | nullable — English translation            |
| duration          | INTEGER     | nullable — total seconds                  |
| recordingUrl      | VARCHAR(500)| nullable                                  |
| hangupBy          | VARCHAR(50) | nullable                                  |
| hangupReason      | VARCHAR(255)| nullable — what Plivo reported            |
| hangupCause       | VARCHAR(50) | nullable — what AI decided                |
| interest          | VARCHAR(20) | nullable — CHECK IN ('interested',         |
|                   |             | 'not_interested', 'unknown')              |
| startedAt         | TIMESTAMPTZ | nullable                                  |
| endedAt           | TIMESTAMPTZ | nullable                                  |
| preCost           | NUMERIC     | NOT NULL, DEFAULT 0                       |
| sarvamTotalCost   | NUMERIC     | NOT NULL, DEFAULT 0                       |
| plivoTotalCost    | NUMERIC     | NOT NULL, DEFAULT 0                       |
| geminiTotalCost   | NUMERIC     | NOT NULL, DEFAULT 0                       |
| geminiPostCost    | NUMERIC     | NOT NULL, DEFAULT 0                       |
| totalCost         | NUMERIC     | NOT NULL, DEFAULT 0                       |
| summary           | TEXT        | nullable — AI generated summary           |
| embedding         | vector(1024)| nullable — semantic embedding of summary  |
| createdAt         | TIMESTAMPTZ | NOT NULL, DEFAULT NOW()                   |
| updatedAt         | TIMESTAMPTZ | NOT NULL, DEFAULT NOW()                   |
+-------------------+-------------+-------------------------------------------+

--- SQL ---

CREATE TABLE wira_call
(
    "id"                BIGSERIAL    PRIMARY KEY,
    "wiraCandidateId"   BIGINT       NOT NULL REFERENCES wira_candidate("id") ON DELETE CASCADE,
    "callId"            VARCHAR(255),
    "fromPhone"         VARCHAR(20)  NOT NULL,
    "bound"             VARCHAR(10)  NOT NULL CHECK ("bound" IN ('inbound', 'outbound')),
    "type"              VARCHAR(100) NOT NULL,
    "status"            VARCHAR(20)  NOT NULL DEFAULT 'initiated'
                            CONSTRAINT "wira_call_status_check"
                            CHECK ("status" IN ('initiated', 'in_progress', 'finalizing', 'completed', 'failed', 'no_answer')),
    "webName"           VARCHAR(255) NOT NULL DEFAULT 'White Force',
    "intro"             TEXT,
    "language"          VARCHAR(20)  DEFAULT 'hi',
    "transcript"        JSONB,
    "cleanTranscript"   JSONB,
    "duration"          INTEGER,
    "recordingUrl"      VARCHAR(500),
    "hangupBy"          VARCHAR(50),
    "hangupReason"      VARCHAR(255),
    "hangupCause"       VARCHAR(50),
    "interest"          VARCHAR(20) CHECK ("interest" IN ('interested', 'not_interested', 'unknown')),
    "startedAt"         TIMESTAMPTZ,
    "endedAt"           TIMESTAMPTZ,
    "preCost"           NUMERIC(12,6) NOT NULL DEFAULT 0,
    "sarvamTotalCost"   NUMERIC(12,6) NOT NULL DEFAULT 0,
    "plivoTotalCost"    NUMERIC(12,6) NOT NULL DEFAULT 0,
    "geminiTotalCost"   NUMERIC(12,6) NOT NULL DEFAULT 0,
    "geminiPostCost"    NUMERIC(12,6) NOT NULL DEFAULT 0,
    "totalCost"         NUMERIC(12,6) NOT NULL DEFAULT 0,
    "summary"           TEXT,
    "embedding"         vector(1024),
    "createdAt"         TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    "updatedAt"         TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    CONSTRAINT "chk_wiraCall_duration" CHECK ("duration" IS NULL OR "duration" >= 0),
    CONSTRAINT "chk_wiraCall_endedAt" CHECK ("endedAt" IS NULL OR "startedAt" IS NULL OR "endedAt" >= "startedAt")
);

-- core lookups
CREATE INDEX "idx_wiraCall_wiraCandidateId" ON wira_call("wiraCandidateId");
CREATE UNIQUE INDEX "uq_wiraCall_callId"     ON wira_call("callId")     WHERE "callId"     IS NOT NULL;
CREATE INDEX "idx_wiraCall_fromPhone"       ON wira_call("fromPhone");
CREATE INDEX "idx_wiraCall_bound"           ON wira_call("bound");
CREATE INDEX "idx_wiraCall_type"            ON wira_call("type");
CREATE INDEX "idx_wiraCall_status"          ON wira_call("status");
CREATE INDEX "idx_wiraCall_webName"         ON wira_call("webName");
CREATE INDEX "idx_wiraCall_language"        ON wira_call("language");
-- status + candidate combo — common dashboard query
CREATE INDEX "idx_wiraCall_candidateId_status" ON wira_call("wiraCandidateId", "status");
-- terminal call filtering
CREATE INDEX "idx_wiraCall_hangupCause"     ON wira_call("hangupCause")  WHERE "hangupCause"  IS NOT NULL;
CREATE INDEX "idx_wiraCall_interest"        ON wira_call("interest")     WHERE "interest"     IS NOT NULL;
-- cost analytics
CREATE INDEX "idx_wiraCall_totalCost"       ON wira_call("totalCost");
-- time range queries
CREATE INDEX "idx_wiraCall_startedAt"       ON wira_call("startedAt"    DESC) WHERE "startedAt" IS NOT NULL;
CREATE INDEX "idx_wiraCall_endedAt"         ON wira_call("endedAt"      DESC) WHERE "endedAt"   IS NOT NULL;
CREATE INDEX "idx_wiraCall_createdAt"       ON wira_call("createdAt"    DESC);
CREATE INDEX "idx_wiraCall_updatedAt"       ON wira_call("updatedAt"    DESC);
-- vector similarity search on summary embeddings
CREATE INDEX "idx_wiraCall_embedding"       ON wira_call USING ivfflat ("embedding" vector_cosine_ops) WITH (lists = 100);

-- Trigger: fires on every status change and on terminal completion joins
-- the outbound screening child to include score + scoreReason in the payload.
-- Large blobs (transcript, cleanTranscript, embedding) are excluded.
CREATE OR REPLACE FUNCTION notify_wira_call_changes()
RETURNS TRIGGER AS $$
DECLARE
    payload     JSONB;
    call_row    JSONB;
    screening   JSONB;
BEGIN
    IF TG_OP = 'DELETE' THEN
        call_row := row_to_json(OLD)::JSONB;
    ELSE
        call_row := row_to_json(NEW)::JSONB;
    END IF;

    -- strip large blobs before building payload
    call_row := call_row
        - 'transcript'
        - 'cleanTranscript'
        - 'embedding';

    -- on terminal status only, join screening summary (no blobs)
    IF TG_OP != 'DELETE' AND NEW.status IN ('completed', 'failed', 'no_answer') THEN
        SELECT jsonb_build_object(
            'id',           os.id,
            'jobId',        os."jobId",
            'jobTitle',     os."jobTitle",
            'companyName',  os."companyName",
            'score',        os.score,
            'scoreReason',  os."scoreReason"
        )
        INTO screening
        FROM wira_outbound_screening os
        WHERE os."wiraCallId" = NEW.id
        LIMIT 1;
    END IF;

    payload := jsonb_build_object(
        'operation',         TG_OP,
        'table',             TG_TABLE_NAME,
        'data',              call_row,
        'outboundScreening', COALESCE(screening, 'null'::JSONB)
    );

    PERFORM pg_notify('wira_call_changes', payload::TEXT);
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_wira_call_changes
AFTER INSERT OR UPDATE OR DELETE ON wira_call
FOR EACH ROW EXECUTE FUNCTION notify_wira_call_changes();

CREATE OR REPLACE TRIGGER trg_wira_call_updated_at
BEFORE UPDATE ON wira_call
FOR EACH ROW EXECUTE FUNCTION set_updated_at();


================================================================================
TABLE 3 — wira_outbound_screening
================================================================================

Holds data specific to outbound screening calls only. A child of wira_call.
Contains the job being screened for, the questions asked, answers given, and
the AI-generated score with mandatory reasoning. scoreReason forces the AI to
justify its decision — preventing arbitrary or hallucinated scores. All
universal call data (transcript, costs, duration, hangup) lives in wira_call.

+--------------------+-------------+-----------------------------------------+
| Column             | Type        | Constraints                             |
+--------------------+-------------+-----------------------------------------+
| id                 | BIGSERIAL   | Primary Key                             |
| wiraCallId         | BIGINT      | NOT NULL, FK → wira_call                |
| jobId              | BIGINT      | nullable                                |
| jobTitle           | VARCHAR(255)| nullable                                |
| jobDescription     | TEXT        | nullable                                |
| companyName        | VARCHAR(255)| nullable                                |
| screeningQuestions | JSONB       | nullable                                |
| screeningQA        | JSONB       | nullable                                |
| score              | SMALLINT    | NOT NULL, DEFAULT 0                     |
| scoreReason        | TEXT        | nullable — AI explanation for score     |
| createdAt          | TIMESTAMPTZ | NOT NULL, DEFAULT NOW()                 |
| updatedAt          | TIMESTAMPTZ | NOT NULL, DEFAULT NOW()                 |
+--------------------+-------------+-----------------------------------------+

CHECK: jobId IS NOT NULL OR jobDescription IS NOT NULL

--- SQL ---

CREATE TABLE wira_outbound_screening
(
    "id"                    BIGSERIAL    PRIMARY KEY,
    "wiraCallId"            BIGINT       NOT NULL REFERENCES wira_call("id") ON DELETE CASCADE,
    "jobId"                 BIGINT,
    "jobTitle"              VARCHAR(255),
    "jobDescription"        TEXT,
    "companyName"           VARCHAR(255),
    "screeningQuestions"    JSONB,
    "screeningQA"           JSONB,
    "score"                 SMALLINT     NOT NULL DEFAULT 0,
    "scoreReason"           TEXT,
    "createdAt"             TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    "updatedAt"             TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    CONSTRAINT "chk_wiraOutboundScreening_jobReference"
        CHECK ("jobId" IS NOT NULL OR "jobDescription" IS NOT NULL)
);

CREATE INDEX "idx_wiraOutboundScreening_wiraCallId"   ON wira_outbound_screening("wiraCallId");
CREATE INDEX "idx_wiraOutboundScreening_jobId"        ON wira_outbound_screening("jobId")      WHERE "jobId"      IS NOT NULL;
CREATE INDEX "idx_wiraOutboundScreening_companyName"  ON wira_outbound_screening("companyName") WHERE "companyName" IS NOT NULL;
-- score range queries — recruiters filter by score thresholds constantly
CREATE INDEX "idx_wiraOutboundScreening_score"        ON wira_outbound_screening("score");
-- job + score combo — most common recruiter dashboard filter
CREATE INDEX "idx_wiraOutboundScreening_jobId_score"  ON wira_outbound_screening("jobId", "score") WHERE "jobId" IS NOT NULL;
CREATE INDEX "idx_wiraOutboundScreening_createdAt"    ON wira_outbound_screening("createdAt" DESC);
CREATE INDEX "idx_wiraOutboundScreening_updatedAt"    ON wira_outbound_screening("updatedAt" DESC);

-- Trigger: fires on score updates and completion. Excludes screeningQA and
-- screeningQuestions blobs. Consumers needing full QA should query by id.
CREATE OR REPLACE FUNCTION notify_wira_outbound_screening_changes()
RETURNS TRIGGER AS $$
DECLARE
    payload  JSONB;
    row_data JSONB;
BEGIN
    IF TG_OP = 'DELETE' THEN
        row_data := row_to_json(OLD)::JSONB;
    ELSE
        row_data := row_to_json(NEW)::JSONB;
    END IF;

    -- strip blobs
    row_data := row_data
        - 'screeningQuestions'
        - 'screeningQA'
        - 'jobDescription';

    payload := jsonb_build_object(
        'operation', TG_OP,
        'table',     TG_TABLE_NAME,
        'data',      row_data
    );

    PERFORM pg_notify('wira_outbound_screening_changes', payload::TEXT);
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_wira_outbound_screening_changes
AFTER INSERT OR UPDATE OR DELETE ON wira_outbound_screening
FOR EACH ROW EXECUTE FUNCTION notify_wira_outbound_screening_changes();

CREATE OR REPLACE TRIGGER trg_wira_outbound_screening_updated_at
BEFORE UPDATE ON wira_outbound_screening
FOR EACH ROW EXECUTE FUNCTION set_updated_at();


================================================================================
TABLE 4 — wira_call_costs
================================================================================

Stores granular per-bucket cost breakdown for outbound screening calls. Each
bucket is a time window within the call. This allows precise cost attribution
across TTS (Sarvam), STT (Sarvam), Plivo telephony, and Gemini AI at bucket
level rather than just a call-level total. Cascades on delete from
wira_outbound_screening so cost records are cleaned up automatically when a
screening record is removed.

+------------------------+-------------+--------------------------------------+
| Column                 | Type        | Constraints                          |
+------------------------+-------------+--------------------------------------+
| id                     | BIGSERIAL   | Primary Key                          |
| wiraOutboundScreeningId| BIGINT      | NOT NULL, FK → wira_outbound_screening|
|                        |             | ON DELETE CASCADE                    |
| bucketIndex            | SMALLINT    | NOT NULL                             |
| startTime              | TIMESTAMPTZ | NOT NULL                             |
| endTime                | TIMESTAMPTZ | NOT NULL                             |
| ttsChars               | INTEGER     | NOT NULL, DEFAULT 0                  |
| ttsCost                | NUMERIC     | NOT NULL, DEFAULT 0                  |
| sttSeconds             | NUMERIC     | NOT NULL, DEFAULT 0                  |
| sttCost                | NUMERIC     | NOT NULL, DEFAULT 0                  |
| plivoSeconds           | NUMERIC     | NOT NULL, DEFAULT 0                  |
| plivoCost              | NUMERIC     | NOT NULL, DEFAULT 0                  |
| geminiInputTokens      | INTEGER     | NOT NULL, DEFAULT 0                  |
| geminiCachedTokens     | INTEGER     | NOT NULL, DEFAULT 0                  |
| geminiOutputTokens     | INTEGER     | NOT NULL, DEFAULT 0                  |
| geminiCost             | NUMERIC     | NOT NULL, DEFAULT 0                  |
| bucketTotal            | NUMERIC     | NOT NULL, DEFAULT 0                  |
| createdAt              | TIMESTAMPTZ | NOT NULL, DEFAULT NOW()              |
+------------------------+-------------+--------------------------------------+

--- SQL ---

CREATE TABLE wira_call_costs
(
    "id"                        BIGSERIAL     PRIMARY KEY,
    "wiraOutboundScreeningId"   BIGINT        NOT NULL REFERENCES wira_outbound_screening("id") ON DELETE CASCADE,
    "bucketIndex"               SMALLINT      NOT NULL,
    "startTime"                 TIMESTAMPTZ   NOT NULL,
    "endTime"                   TIMESTAMPTZ   NOT NULL,
    "ttsChars"                  INTEGER       NOT NULL DEFAULT 0,
    "ttsCost"                   NUMERIC(12,6) NOT NULL DEFAULT 0,
    "sttSeconds"                NUMERIC(10,4) NOT NULL DEFAULT 0,
    "sttCost"                   NUMERIC(12,6) NOT NULL DEFAULT 0,
    "plivoSeconds"              NUMERIC(10,4) NOT NULL DEFAULT 0,
    "plivoCost"                 NUMERIC(12,6) NOT NULL DEFAULT 0,
    "geminiInputTokens"         INTEGER       NOT NULL DEFAULT 0,
    "geminiCachedTokens"        INTEGER       NOT NULL DEFAULT 0,
    "geminiOutputTokens"        INTEGER       NOT NULL DEFAULT 0,
    "geminiCost"                NUMERIC(12,6) NOT NULL DEFAULT 0,
    "bucketTotal"               NUMERIC(12,6) NOT NULL DEFAULT 0,
    "createdAt"                 TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX "idx_wiraCallCosts_screeningId"  ON wira_call_costs("wiraOutboundScreeningId");
-- bucket sequence within a screening session
CREATE UNIQUE INDEX "uq_wiraCallCosts_screening_bucket" ON wira_call_costs("wiraOutboundScreeningId", "bucketIndex");
-- time window queries for analytics
CREATE INDEX "idx_wiraCallCosts_startTime"    ON wira_call_costs("startTime" DESC);
CREATE INDEX "idx_wiraCallCosts_endTime"      ON wira_call_costs("endTime"   DESC);
-- cost analytics — finding expensive calls
CREATE INDEX "idx_wiraCallCosts_bucketTotal"  ON wira_call_costs("bucketTotal");
CREATE INDEX "idx_wiraCallCosts_geminiCost"   ON wira_call_costs("geminiCost");
CREATE INDEX "idx_wiraCallCosts_plivoCost"    ON wira_call_costs("plivoCost");
CREATE INDEX "idx_wiraCallCosts_createdAt"    ON wira_call_costs("createdAt" DESC);

-- No notify trigger on this table intentionally — cost buckets are written
-- frequently mid-call and consumers should read aggregates from wira_call
-- totals rather than reacting to every bucket insert.


================================================================================
TABLE 5 — wira_app
================================================================================

Represents a candidate's app or web chat session with Wira. One session per
candidate per webName — the unique constraint ensures no duplicate sessions for
the same company portal. Tracks cumulative Gemini cost across all messages in
the session so dashboards can show per-session spend without summing messages.

+------------------+-------------+--------------------------------------------+
| Column           | Type        | Constraints                                |
+------------------+-------------+--------------------------------------------+
| id               | BIGSERIAL   | Primary Key                                |
| wiraCandidateId  | BIGINT      | NOT NULL, FK → wira_candidate              |
| webName          | VARCHAR(255)| NOT NULL, DEFAULT White Force              |
| overallGeminiCost| NUMERIC     | NOT NULL, DEFAULT 0                        |
| createdAt        | TIMESTAMPTZ | NOT NULL, DEFAULT NOW()                    |
| updatedAt        | TIMESTAMPTZ | NOT NULL, DEFAULT NOW()                    |
+------------------+-------------+--------------------------------------------+

UNIQUE: (wiraCandidateId, webName)

--- SQL ---

CREATE TABLE wira_app
(
    "id"                BIGSERIAL     PRIMARY KEY,
    "wiraCandidateId"   BIGINT        NOT NULL REFERENCES wira_candidate("id") ON DELETE CASCADE,
    "webName"           VARCHAR(255)  NOT NULL DEFAULT 'White Force',
    "overallGeminiCost" NUMERIC(12,6) NOT NULL DEFAULT 0,
    "createdAt"         TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    "updatedAt"         TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

    CONSTRAINT "uq_wiraApp_candidateId_webName" UNIQUE ("wiraCandidateId", "webName")
);

CREATE INDEX "idx_wiraApp_wiraCandidateId"          ON wira_app("wiraCandidateId");
CREATE INDEX "idx_wiraApp_webName"                  ON wira_app("webName");
-- cost analytics across sessions
CREATE INDEX "idx_wiraApp_overallGeminiCost"        ON wira_app("overallGeminiCost");
CREATE INDEX "idx_wiraApp_createdAt"                ON wira_app("createdAt" DESC);
CREATE INDEX "idx_wiraApp_updatedAt"                ON wira_app("updatedAt" DESC);

CREATE OR REPLACE FUNCTION notify_wira_app_changes()
RETURNS TRIGGER AS $$
DECLARE
    payload JSONB;
BEGIN
    IF TG_OP = 'DELETE' THEN
        payload := jsonb_build_object(
            'operation', TG_OP,
            'table',     TG_TABLE_NAME,
            'data',      row_to_json(OLD)
        );
    ELSE
        payload := jsonb_build_object(
            'operation', TG_OP,
            'table',     TG_TABLE_NAME,
            'data',      row_to_json(NEW)
        );
    END IF;
    PERFORM pg_notify('wira_app_changes', payload::TEXT);
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_wira_app_changes
AFTER INSERT OR UPDATE OR DELETE ON wira_app
FOR EACH ROW EXECUTE FUNCTION notify_wira_app_changes();

CREATE OR REPLACE TRIGGER trg_wira_app_updated_at
BEFORE UPDATE ON wira_app
FOR EACH ROW EXECUTE FUNCTION set_updated_at();


================================================================================
TABLE 6 — wira_app_message
================================================================================

Stores every message exchanged in a wira_app session. Covers messages from the
user, AI assistant, and central server. platform tracks whether this came from
the mobile App or Web interface. isServer flags messages injected by the server
rather than typed by a user or generated by AI. instructionData manages the
full instruction lifecycle internally. promptCosts holds per-prompt AI cost
breakdown including cache awareness. cleanContent is an AI-rewritten plain
English version of the message for recruiter dashboards. embedding enables
semantic search across message history.

+------------------+--------------+------------------------------------------+
| Column           | Type         | Constraints                              |
+------------------+--------------+------------------------------------------+
| id               | BIGSERIAL    | Primary Key                              |
| wiraAppId        | BIGINT       | NOT NULL, FK → wira_app                  |
| role             | VARCHAR(20)  | NOT NULL, CHECK IN (assistant, user)     |
| content          | TEXT         | NOT NULL                                 |
| urls             | JSONB        | NOT NULL, DEFAULT []                     |
| jobIds           | JSONB        | NOT NULL, DEFAULT []                     |
| files            | JSONB        | nullable — array of file objects         |
| instructionData  | JSONB        | nullable                                 |
| platform         | VARCHAR(10)  | CHECK IN (App, Web)                      |
| isServer         | BOOLEAN      | NOT NULL, DEFAULT false                  |
| metadata         | JSONB        | nullable — context given to AI           |
| promptCosts      | JSONB        | nullable — per-prompt cost array         |
| cancelled        | BOOLEAN      | NOT NULL, DEFAULT false                  |
| cleanContent     | TEXT         | nullable — plain English for recruiter   |
| embedding        | vector(1024) | nullable                                 |
| createdAt        | TIMESTAMPTZ  | NOT NULL, DEFAULT NOW()                  |
+------------------+--------------+------------------------------------------+

promptCosts shape:
[
  {
    "promptTitle":  "string",
    "isCache":      true/false,
    "cacheId":      "string or null",
    "inputTokens":  0,
    "outputTokens": 0,
    "cachedTokens": 0,
    "inputCost":    0.000000,
    "outputCost":   0.000000,
    "totalCost":    0.000000
  }
]

--- SQL ---

CREATE TABLE wira_app_message
(
    "id"                BIGSERIAL     PRIMARY KEY,
    "wiraAppId"         BIGINT        NOT NULL REFERENCES wira_app("id") ON DELETE CASCADE,
    "role"              VARCHAR(20)   NOT NULL CHECK ("role" IN ('assistant', 'user')),
    "content"           TEXT          NOT NULL,
    "urls"              JSONB         NOT NULL DEFAULT '[]'::jsonb,
    "jobIds"            JSONB         NOT NULL DEFAULT '[]'::jsonb,
    "files"             JSONB,
    "instructionData"   JSONB,
    "platform"          VARCHAR(10)   CHECK ("platform" IN ('App', 'Web')),
    "isServer"          BOOLEAN       NOT NULL DEFAULT FALSE,
    "metadata"          JSONB,
    "promptCosts"       JSONB,
    "cancelled"         BOOLEAN       NOT NULL DEFAULT FALSE,
    "cleanContent"      TEXT,
    "embedding"         vector(1024),
    "createdAt"         TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- core session message fetch
CREATE INDEX "idx_wiraAppMessage_wiraAppId"              ON wira_app_message("wiraAppId");
-- chronological message loading per session
CREATE INDEX "idx_wiraAppMessage_wiraAppId_createdAt"    ON wira_app_message("wiraAppId", "createdAt" DESC);
CREATE INDEX "idx_wiraAppMessage_createdAt"              ON wira_app_message("createdAt" DESC);
CREATE INDEX "idx_wiraAppMessage_role"                   ON wira_app_message("role");
CREATE INDEX "idx_wiraAppMessage_platform"               ON wira_app_message("platform")  WHERE "platform"  IS NOT NULL;
CREATE INDEX "idx_wiraAppMessage_isServer"               ON wira_app_message("isServer")  WHERE "isServer"  = TRUE;
CREATE INDEX "idx_wiraAppMessage_cancelled"              ON wira_app_message("cancelled") WHERE "cancelled" = TRUE;
-- instruction processing — find messages with pending instructions
CREATE INDEX "idx_wiraAppMessage_instructionData"        ON wira_app_message USING gin("instructionData" jsonb_path_ops) WHERE "instructionData" IS NOT NULL;
-- jobIds lookups — find messages referencing a specific job
CREATE INDEX "idx_wiraAppMessage_jobIds"                 ON wira_app_message USING gin("jobIds");
-- vector similarity search
CREATE INDEX "idx_wiraAppMessage_embedding"              ON wira_app_message USING ivfflat ("embedding" vector_cosine_ops) WITH (lists = 100);

-- Trigger: fires on new messages and updates. Strips embedding and large
-- metadata from payload. Consumer reads full row by id if needed.
CREATE OR REPLACE FUNCTION notify_wira_app_message_changes()
RETURNS TRIGGER AS $$
DECLARE
    payload  JSONB;
    row_data JSONB;
BEGIN
    IF TG_OP = 'DELETE' THEN
        row_data := row_to_json(OLD)::JSONB;
    ELSE
        row_data := row_to_json(NEW)::JSONB;
    END IF;

    row_data := row_data
        - 'embedding'
        - 'metadata'
        - 'promptCosts';

    payload := jsonb_build_object(
        'operation', TG_OP,
        'table',     TG_TABLE_NAME,
        'data',      row_data
    );

    PERFORM pg_notify('wira_app_message_changes', payload::TEXT);
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_wira_app_message_changes
AFTER INSERT OR UPDATE OR DELETE ON wira_app_message
FOR EACH ROW EXECUTE FUNCTION notify_wira_app_message_changes();


================================================================================
TABLE 7 — wira_whatsapp
================================================================================

Represents a candidate's WhatsApp conversation session with Wira. Structurally
mirrors wira_app but tracks WhatsApp API delivery cost separately from Gemini
AI cost via overallWhatsappCost. One session per candidate per webName.

+---------------------+-------------+-----------------------------------------+
| Column              | Type        | Constraints                             |
+---------------------+-------------+-----------------------------------------+
| id                  | BIGSERIAL   | Primary Key                             |
| wiraCandidateId     | BIGINT      | NOT NULL, FK → wira_candidate           |
| webName             | VARCHAR(255)| NOT NULL, DEFAULT White Force           |
| overallGeminiCost   | NUMERIC     | NOT NULL, DEFAULT 0                     |
| overallWhatsappCost | NUMERIC     | NOT NULL, DEFAULT 0                     |
| createdAt           | TIMESTAMPTZ | NOT NULL, DEFAULT NOW()                 |
| updatedAt           | TIMESTAMPTZ | NOT NULL, DEFAULT NOW()                 |
+---------------------+-------------+-----------------------------------------+

UNIQUE: (wiraCandidateId, webName)

--- SQL ---

CREATE TABLE wira_whatsapp
(
    "id"                    BIGSERIAL     PRIMARY KEY,
    "wiraCandidateId"       BIGINT        NOT NULL REFERENCES wira_candidate("id") ON DELETE CASCADE,
    "webName"               VARCHAR(255)  NOT NULL DEFAULT 'White Force',
    "overallGeminiCost"     NUMERIC(12,6) NOT NULL DEFAULT 0,
    "overallWhatsappCost"   NUMERIC(12,6) NOT NULL DEFAULT 0,
    "createdAt"             TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    "updatedAt"             TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

    CONSTRAINT "uq_wiraWhatsapp_candidateId_webName" UNIQUE ("wiraCandidateId", "webName")
);

CREATE INDEX "idx_wiraWhatsapp_wiraCandidateId"    ON wira_whatsapp("wiraCandidateId");
CREATE INDEX "idx_wiraWhatsapp_webName"            ON wira_whatsapp("webName");
CREATE INDEX "idx_wiraWhatsapp_overallGeminiCost"  ON wira_whatsapp("overallGeminiCost");
CREATE INDEX "idx_wiraWhatsapp_overallWhatsappCost"ON wira_whatsapp("overallWhatsappCost");
CREATE INDEX "idx_wiraWhatsapp_createdAt"          ON wira_whatsapp("createdAt" DESC);
CREATE INDEX "idx_wiraWhatsapp_updatedAt"          ON wira_whatsapp("updatedAt" DESC);

CREATE OR REPLACE FUNCTION notify_wira_whatsapp_changes()
RETURNS TRIGGER AS $$
DECLARE
    payload JSONB;
BEGIN
    IF TG_OP = 'DELETE' THEN
        payload := jsonb_build_object(
            'operation', TG_OP,
            'table',     TG_TABLE_NAME,
            'data',      row_to_json(OLD)
        );
    ELSE
        payload := jsonb_build_object(
            'operation', TG_OP,
            'table',     TG_TABLE_NAME,
            'data',      row_to_json(NEW)
        );
    END IF;
    PERFORM pg_notify('wira_whatsapp_changes', payload::TEXT);
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_wira_whatsapp_changes
AFTER INSERT OR UPDATE OR DELETE ON wira_whatsapp
FOR EACH ROW EXECUTE FUNCTION notify_wira_whatsapp_changes();

CREATE OR REPLACE TRIGGER trg_wira_whatsapp_updated_at
BEFORE UPDATE ON wira_whatsapp
FOR EACH ROW EXECUTE FUNCTION set_updated_at();


================================================================================
TABLE 8 — wira_whatsapp_message
================================================================================

Stores every message in a wira_whatsapp session. No platform column — all
messages here are WhatsApp by definition. whatsappMessageId is the ID returned
by the Meta WhatsApp API. whatsappRawPayload is the full raw webhook payload
from Meta — kept for complete traceability and replay. Has updatedAt unlike
wira_app_message because WhatsApp message delivery status updates after send.
cleanContent is a plain English AI rewrite for recruiter dashboards.

+--------------------+--------------+----------------------------------------+
| Column             | Type         | Constraints                            |
+--------------------+--------------+----------------------------------------+
| id                 | BIGSERIAL    | Primary Key                            |
| wiraWhatsappId     | BIGINT       | NOT NULL, FK → wira_whatsapp           |
| role               | VARCHAR(20)  | NOT NULL, CHECK IN (assistant, user)   |
| content            | TEXT         | NOT NULL                               |
| urls               | JSONB        | NOT NULL, DEFAULT []                   |
| jobIds             | JSONB        | NOT NULL, DEFAULT []                   |
| files              | JSONB        | nullable — array of file objects       |
| instructionData    | JSONB        | nullable                               |
| isServer           | BOOLEAN      | NOT NULL, DEFAULT false                |
| metadata           | JSONB        | nullable — context given to AI         |
| promptCosts        | JSONB        | nullable — per-prompt cost array       |
| cancelled          | BOOLEAN      | NOT NULL, DEFAULT false                |
| whatsappMessageId  | VARCHAR(255) | nullable                               |
| whatsappRawPayload | JSONB        | nullable                               |
| cleanContent       | TEXT         | nullable — plain English for recruiter |
| embedding          | vector(1024) | nullable                               |
| createdAt          | TIMESTAMPTZ  | NOT NULL, DEFAULT NOW()                |
| updatedAt          | TIMESTAMPTZ  | NOT NULL, DEFAULT NOW()                |
+--------------------+--------------+----------------------------------------+

promptCosts shape: same as wira_app_message

--- SQL ---

CREATE TABLE wira_whatsapp_message
(
    "id"                    BIGSERIAL     PRIMARY KEY,
    "wiraWhatsappId"        BIGINT        NOT NULL REFERENCES wira_whatsapp("id") ON DELETE CASCADE,
    "role"                  VARCHAR(20)   NOT NULL CHECK ("role" IN ('assistant', 'user')),
    "content"               TEXT          NOT NULL,
    "urls"                  JSONB         NOT NULL DEFAULT '[]'::jsonb,
    "jobIds"                JSONB         NOT NULL DEFAULT '[]'::jsonb,
    "files"                 JSONB,
    "instructionData"       JSONB,
    "isServer"              BOOLEAN       NOT NULL DEFAULT FALSE,
    "metadata"              JSONB,
    "promptCosts"           JSONB,
    "cancelled"             BOOLEAN       NOT NULL DEFAULT FALSE,
    "whatsappMessageId"     VARCHAR(255),
    "whatsappRawPayload"    JSONB,
    "cleanContent"          TEXT,
    "embedding"             vector(1024),
    "createdAt"             TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    "updatedAt"             TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- core session fetch
CREATE INDEX "idx_wiraWhatsappMsg_wiraWhatsappId"           ON wira_whatsapp_message("wiraWhatsappId");
-- chronological loading per session
CREATE INDEX "idx_wiraWhatsappMsg_whatsappId_createdAt"     ON wira_whatsapp_message("wiraWhatsappId", "createdAt" DESC);
CREATE INDEX "idx_wiraWhatsappMsg_createdAt"                ON wira_whatsapp_message("createdAt" DESC);
CREATE INDEX "idx_wiraWhatsappMsg_updatedAt"                ON wira_whatsapp_message("updatedAt" DESC);
-- Meta message ID lookups — webhook deduplication
CREATE UNIQUE INDEX "uq_wiraWhatsappMsg_whatsappMessageId"  ON wira_whatsapp_message("whatsappMessageId") WHERE "whatsappMessageId" IS NOT NULL;
CREATE INDEX "idx_wiraWhatsappMsg_role"                     ON wira_whatsapp_message("role");
CREATE INDEX "idx_wiraWhatsappMsg_isServer"                 ON wira_whatsapp_message("isServer")  WHERE "isServer"  = TRUE;
CREATE INDEX "idx_wiraWhatsappMsg_cancelled"                ON wira_whatsapp_message("cancelled") WHERE "cancelled" = TRUE;
-- instruction and job GIN indexes
CREATE INDEX "idx_wiraWhatsappMsg_instructionData"          ON wira_whatsapp_message USING gin("instructionData" jsonb_path_ops) WHERE "instructionData" IS NOT NULL;
CREATE INDEX "idx_wiraWhatsappMsg_jobIds"                   ON wira_whatsapp_message USING gin("jobIds");
-- vector similarity search
CREATE INDEX "idx_wiraWhatsappMsg_embedding"                ON wira_whatsapp_message USING ivfflat ("embedding" vector_cosine_ops) WITH (lists = 100);

-- Trigger: strips large blobs. Especially important here since
-- whatsappRawPayload from Meta can be very large.
CREATE OR REPLACE FUNCTION notify_wira_whatsapp_message_changes()
RETURNS TRIGGER AS $$
DECLARE
    payload  JSONB;
    row_data JSONB;
BEGIN
    IF TG_OP = 'DELETE' THEN
        row_data := row_to_json(OLD)::JSONB;
    ELSE
        row_data := row_to_json(NEW)::JSONB;
    END IF;

    row_data := row_data
        - 'embedding'
        - 'metadata'
        - 'promptCosts'
        - 'whatsappRawPayload';

    payload := jsonb_build_object(
        'operation', TG_OP,
        'table',     TG_TABLE_NAME,
        'data',      row_data
    );

    PERFORM pg_notify('wira_whatsapp_message_changes', payload::TEXT);
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_wira_whatsapp_message_changes
AFTER INSERT OR UPDATE OR DELETE ON wira_whatsapp_message
FOR EACH ROW EXECUTE FUNCTION notify_wira_whatsapp_message_changes();

CREATE OR REPLACE TRIGGER trg_wira_whatsapp_message_updated_at
BEFORE UPDATE ON wira_whatsapp_message
FOR EACH ROW EXECUTE FUNCTION set_updated_at();


================================================================================
TABLE 9 — wira_cache_costs
================================================================================

Tracks the lifetime cost of every Gemini prompt cache created by the system.
A record is inserted when a cache is created. A single UPDATE is made when the
cache is deleted — writing the final cost, total tokens cached, and deletedAt.
This gives a permanent audit trail of what each cache cost across its lifetime.
modelName records exactly which model the cache was created for, since pricing
differs per model.

+---------------+--------------+----------------------------------------------+
| Column        | Type         | Constraints                                  |
+---------------+--------------+----------------------------------------------+
| id            | BIGSERIAL    | Primary Key                                  |
| cacheId       | VARCHAR(255) | NOT NULL — Gemini cache identifier           |
| promptName    | VARCHAR(255) | NOT NULL — internal name of cached prompt    |
| modelName     | VARCHAR(255) | NOT NULL — e.g. gemini-2.0-flash-lite        |
| cachedTokens  | INTEGER      | NOT NULL — total tokens held in cache        |
| cost          | NUMERIC      | NOT NULL, DEFAULT 0 — written on deletion    |
| createdAt     | TIMESTAMPTZ  | NOT NULL — when cache was created on Gemini  |
| deletedAt     | TIMESTAMPTZ  | NOT NULL — when cache was deleted on Gemini  |
+---------------+--------------+----------------------------------------------+

cost is written exactly once on cache deletion — the final lifetime total.

--- SQL ---

CREATE TABLE wira_cache_costs
(
    "id"            BIGSERIAL     PRIMARY KEY,
    "cacheId"       VARCHAR(255)  NOT NULL,
    "promptName"    VARCHAR(255)  NOT NULL,
    "modelName"     VARCHAR(255)  NOT NULL,
    "cachedTokens"  INTEGER       NOT NULL,
    "cost"          NUMERIC(12,6) NOT NULL DEFAULT 0,
    "createdAt"     TIMESTAMPTZ   NOT NULL,
    "deletedAt"     TIMESTAMPTZ   NOT NULL
);

-- primary lookup by Gemini cache ID
CREATE UNIQUE INDEX "uq_wiraCacheCosts_cacheId"   ON wira_cache_costs("cacheId");
CREATE INDEX "idx_wiraCacheCosts_promptName"      ON wira_cache_costs("promptName");
CREATE INDEX "idx_wiraCacheCosts_modelName"       ON wira_cache_costs("modelName");
-- cost analytics per prompt and model
CREATE INDEX "idx_wiraCacheCosts_promptName_cost" ON wira_cache_costs("promptName", "cost");
CREATE INDEX "idx_wiraCacheCosts_modelName_cost"  ON wira_cache_costs("modelName",  "cost");
-- time range analytics
CREATE INDEX "idx_wiraCacheCosts_createdAt"       ON wira_cache_costs("createdAt" DESC);
CREATE INDEX "idx_wiraCacheCosts_deletedAt"       ON wira_cache_costs("deletedAt" DESC);
-- cache lifetime duration analytics (deletedAt - createdAt)
CREATE INDEX "idx_wiraCacheCosts_lifetime"        ON wira_cache_costs("createdAt", "deletedAt");

CREATE OR REPLACE FUNCTION notify_wira_cache_costs_changes()
RETURNS TRIGGER AS $$
DECLARE
    payload JSONB;
BEGIN
    IF TG_OP = 'DELETE' THEN
        payload := jsonb_build_object(
            'operation', TG_OP,
            'table',     TG_TABLE_NAME,
            'data',      row_to_json(OLD)
        );
    ELSE
        payload := jsonb_build_object(
            'operation', TG_OP,
            'table',     TG_TABLE_NAME,
            'data',      row_to_json(NEW)
        );
    END IF;
    PERFORM pg_notify('wira_cache_costs_changes', payload::TEXT);
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_wira_cache_costs_changes
AFTER INSERT OR UPDATE OR DELETE ON wira_cache_costs
FOR EACH ROW EXECUTE FUNCTION notify_wira_cache_costs_changes();


================================================================================
TABLE 10 — wira_queue
================================================================================

A flexible queue table for all scheduled and deferred tasks in the Wira system.
Covers both user-requested reminders triggered via AI and system-initiated
background tasks. The schema is intentionally open-ended — data holds whatever
payload that queue type needs. queueName identifies the task type. setBy
distinguishes who created the queue entry: system (automated pipeline),
assistant (AI decided to queue something), or server (central server injected
it). referenceTable and referenceId soft-link back to the entity that triggered
the queue. pg_cron fires a notification every minute for due items so the
application does not need to poll.

+----------------+--------------+--------------------------------------------+
| Column         | Type         | Constraints                                |
+----------------+--------------+--------------------------------------------+
| id             | BIGSERIAL    | Primary Key                                |
| queueName      | VARCHAR(255) | NOT NULL — task type identifier            |
| promptName     | VARCHAR(255) | nullable — AI prompt to run, if any        |
| triggerAt      | TIMESTAMPTZ  | NOT NULL — when to execute                 |
| data           | JSONB        | NOT NULL — task payload                    |
| platform       | VARCHAR(20)  | nullable, CHECK IN (App, Web,              |
|                |              | Whatsapp, Call)                            |
| setBy          | VARCHAR(20)  | NOT NULL, CHECK IN (system,                |
|                |              | assistant, server)                         |
| referenceTable | VARCHAR(255) | nullable                                   |
| referenceId    | BIGINT       | nullable                                   |
| executed       | BOOLEAN      | NOT NULL, DEFAULT false                    |
| status         | VARCHAR(20)  | NOT NULL, DEFAULT pending                  |
|                |              | CHECK IN (pending, success, failed)        |
| message        | TEXT         | nullable — result or error message         |
| promptCosts    | JSONB        | nullable — AI cost if prompt ran           |
| createdAt      | TIMESTAMPTZ  | NOT NULL, DEFAULT NOW()                    |
| updatedAt      | TIMESTAMPTZ  | NOT NULL, DEFAULT NOW()                    |
+----------------+--------------+--------------------------------------------+

--- SQL ---

CREATE TABLE wira_queue
(
    "id"                BIGSERIAL    PRIMARY KEY,
    "queueName"         VARCHAR(255) NOT NULL,
    "promptName"        VARCHAR(255),
    "triggerAt"         TIMESTAMPTZ  NOT NULL,
    "data"              JSONB        NOT NULL,
    "platform"          VARCHAR(20)  CHECK ("platform" IN ('App', 'Web', 'Whatsapp', 'Call')),
    "setBy"             VARCHAR(20)  NOT NULL CHECK ("setBy" IN ('system', 'assistant', 'server')),
    "referenceTable"    VARCHAR(255),
    "referenceId"       BIGINT,
    "executed"          BOOLEAN      NOT NULL DEFAULT FALSE,
    "status"            VARCHAR(20)  NOT NULL DEFAULT 'pending'
                            CHECK ("status" IN ('pending', 'success', 'failed')),
    "message"           TEXT,
    "promptCosts"       JSONB,
    "createdAt"         TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    "updatedAt"         TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- primary execution query — pending items due now
CREATE INDEX "idx_wiraQueue_pending_triggerAt"   ON wira_queue("triggerAt") WHERE "executed" = FALSE AND "status" = 'pending';
-- queue type filtering
CREATE INDEX "idx_wiraQueue_queueName"           ON wira_queue("queueName");
CREATE INDEX "idx_wiraQueue_queueName_status"    ON wira_queue("queueName", "status");
-- prompt analytics
CREATE INDEX "idx_wiraQueue_promptName"          ON wira_queue("promptName") WHERE "promptName" IS NOT NULL;
-- execution state
CREATE INDEX "idx_wiraQueue_executed"            ON wira_queue("executed");
CREATE INDEX "idx_wiraQueue_status"              ON wira_queue("status");
-- origin tracking
CREATE INDEX "idx_wiraQueue_setBy"               ON wira_queue("setBy");
CREATE INDEX "idx_wiraQueue_platform"            ON wira_queue("platform")       WHERE "platform"       IS NOT NULL;
-- soft reference lookups — find all queues tied to a specific row
CREATE INDEX "idx_wiraQueue_referenceTable"      ON wira_queue("referenceTable") WHERE "referenceTable" IS NOT NULL;
CREATE INDEX "idx_wiraQueue_refTable_refId"      ON wira_queue("referenceTable", "referenceId") WHERE "referenceTable" IS NOT NULL;
CREATE INDEX "idx_wiraQueue_triggerAt"           ON wira_queue("triggerAt");
CREATE INDEX "idx_wiraQueue_createdAt"           ON wira_queue("createdAt" DESC);
CREATE INDEX "idx_wiraQueue_updatedAt"           ON wira_queue("updatedAt" DESC);

-- Trigger: fires when a queue item is created or its status changes.
-- Strips data payload from notification — consumers fetch full row by id.
CREATE OR REPLACE FUNCTION notify_wira_queue_changes()
RETURNS TRIGGER AS $$
DECLARE
    payload  JSONB;
    row_data JSONB;
BEGIN
    IF TG_OP = 'DELETE' THEN
        row_data := row_to_json(OLD)::JSONB;
    ELSE
        row_data := row_to_json(NEW)::JSONB;
    END IF;

    row_data := row_data
        - 'data'
        - 'promptCosts';

    payload := jsonb_build_object(
        'operation', TG_OP,
        'table',     TG_TABLE_NAME,
        'data',      row_data
    );

    PERFORM pg_notify('wira_queue_changes', payload::TEXT);
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_wira_queue_changes
AFTER INSERT OR UPDATE OR DELETE ON wira_queue
FOR EACH ROW EXECUTE FUNCTION notify_wira_queue_changes();

CREATE OR REPLACE TRIGGER trg_wira_queue_updated_at
BEFORE UPDATE ON wira_queue
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- pg_cron: every minute, find all pending due items and fire a single
-- notification containing their ids. Application listens on wira_queue_due
-- and processes each id. After processing update the row:
--   executed = TRUE, status = 'success'/'failed', message = '...', updatedAt = NOW()
--
-- Enable extension once:
--   CREATE EXTENSION IF NOT EXISTS pg_cron;
--
SELECT cron.schedule(
    'wira-queue-poll',
    '* * * * *',
    $cron$
        DO $block$
        DECLARE
            due_ids BIGINT[];
        BEGIN
            SELECT ARRAY_AGG(id)
            INTO due_ids
            FROM wira_queue
            WHERE executed  = FALSE
              AND status    = 'pending'
              AND "triggerAt" <= NOW();

            IF due_ids IS NOT NULL THEN
                PERFORM pg_notify(
                    'wira_queue_due',
                    jsonb_build_object('ids', to_jsonb(due_ids))::TEXT
                );
            END IF;
        END;
        $block$ LANGUAGE plpgsql;
    $cron$
);

-- pg_cron: daily at 02:00 UTC — mark stale queue items as failed.
-- Any item that was due more than 24 hours ago and still shows pending
-- is considered lost (server was down, worker crashed, etc).
SELECT cron.schedule(
    'wira-queue-stale-cleanup',
    '0 2 * * *',
    $$
        UPDATE wira_queue
        SET
            "status"    = 'failed',
            "message"   = 'Marked failed by stale cleanup — triggerAt exceeded 24h threshold',
            "updatedAt" = NOW()
        WHERE executed    = FALSE
          AND status      = 'pending'
          AND "triggerAt" < NOW() - INTERVAL '24 hours';
    $$
);


================================================================================
REFERENCE — intro_audio_template (shared, unchanged)
================================================================================

This table is shared across both the old conversation_* architecture and the
new wira_* architecture. It is the only table not renamed or replaced. Do not
modify its structure.

Stores pre-generated TTS audio segments for intro messages at the start of
outbound calls. The unique constraint on (text, language, speaker) ensures
duplicate audio is never generated for the same combination.

+------------+-------------+--------------------------------------------------+
| Column     | Type        | Constraints                                      |
+------------+-------------+--------------------------------------------------+
| id         | BIGSERIAL   | Primary Key                                      |
| text       | TEXT        | NOT NULL                                         |
| language   | VARCHAR(10) | NOT NULL, DEFAULT hi-IN                          |
| speaker    | VARCHAR(50) | NOT NULL, DEFAULT anushka                        |
| segments   | JSONB       | NOT NULL                                         |
| createdAt  | TIMESTAMPTZ | NOT NULL, DEFAULT NOW()                          |
| updatedAt  | TIMESTAMPTZ | NOT NULL, DEFAULT NOW()                          |
+------------+-------------+--------------------------------------------------+

UNIQUE: (text, language, speaker)

Original creation query (do not re-run — table already exists):

CREATE TABLE intro_audio_template
(
    "id"        BIGSERIAL    PRIMARY KEY,
    "text"      TEXT         NOT NULL,
    "language"  VARCHAR(10)  NOT NULL DEFAULT 'hi-IN',
    "speaker"   VARCHAR(50)  NOT NULL DEFAULT 'anushka',
    "segments"  JSONB        NOT NULL,
    "createdAt" TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX "uq_introAudioTemplate_text_lang_speaker"
    ON intro_audio_template("text", "language", "speaker");

CREATE OR REPLACE TRIGGER trg_intro_audio_template_updated_at
BEFORE UPDATE ON intro_audio_template
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

================================================================================
END OF DOCUMENT
================================================================================
