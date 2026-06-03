/**
 * Sprint 9 Validation — run from Server directory:
 * node run_sprint9_validation.js
 */
require('dotenv').config();
const { pool } = require('./src/config/db');
const {
    getContactProfile,
    getEngagementSegments,
    recalculateContactEngagement,
    recalculateCampaignContacts,
    toggleOptIn,
    archiveContact,
    restoreContact
} = require('./src/services/whatsapp-contacts-intelligence.service');

let passed = 0, failed = 0;
let testContactId = null, testCampaignId = null;

function assert(cond, label) {
    if (cond) { console.log('  ✅ PASS:', label); passed++; }
    else { console.error('  ❌ FAIL:', label); failed++; }
}

async function run() {
    console.log('\n╔══════════════════════════════════════════════════════╗');
    console.log('║    Sprint 9 – Contact Intelligence Validation        ║');
    console.log('╚══════════════════════════════════════════════════════╝');

    try {
        // ── Setup ────────────────────────────────────────────────────────────
        console.log('\n[Setup] Seeding test contact...');
        const [r] = await pool.query(
            `INSERT INTO whatsapp_contacts (phone, name, email, opt_in_status)
             VALUES ('9999999999','Sprint9Test','s9@test.com',1)
             ON DUPLICATE KEY UPDATE name = VALUES(name)`
        );
        testContactId = r.insertId || null;
        if (!testContactId) {
            const [[row]] = await pool.query("SELECT id FROM whatsapp_contacts WHERE phone='9999999999'");
            testContactId = row?.id;
        }
        await pool.query(
            "UPDATE whatsapp_contacts SET engagement_score=0,total_sent=0,total_delivered=0,total_read=0,status='active' WHERE id=?",
            [testContactId]
        );
        const [[camp]] = await pool.query('SELECT id FROM whatsapp_campaigns LIMIT 1');
        testCampaignId = camp?.id || null;
        console.log(`  contactId=${testContactId}  campaignId=${testCampaignId}`);

        // ── Test 1: Activity Insert ──────────────────────────────────────────
        console.log('\n[T1] Activity records inserted correctly');
        if (testCampaignId) {
            await pool.query(
                `INSERT INTO whatsapp_contact_activity (contact_id,campaign_id,message_id,event_type,event_timestamp)
                 VALUES (?,?,'msg_s9_t1','sent',NOW())`,
                [testContactId, testCampaignId]
            );
            const [[row]] = await pool.query(
                "SELECT * FROM whatsapp_contact_activity WHERE contact_id=? AND message_id='msg_s9_t1'",
                [testContactId]
            );
            assert(!!row, 'Activity record inserted and retrievable');
            assert(row?.event_type === 'sent', 'Event type is "sent"');
        } else { console.log('  ⚠️  SKIP: No campaigns in DB'); }

        // ── Test 2: Engagement Score ─────────────────────────────────────────
        console.log('\n[T2] Engagement score calculations verified');
        if (testCampaignId) {
            await pool.query('DELETE FROM whatsapp_contact_activity WHERE contact_id=?', [testContactId]);
            const events = [['msg_a','sent'],['msg_b','delivered'],['msg_c','sent'],['msg_c','read']];
            for (const [mid, ev] of events) {
                await pool.query(
                    `INSERT INTO whatsapp_contact_activity (contact_id,campaign_id,message_id,event_type,event_timestamp)
                     VALUES (?,?,?,?,NOW())`,
                    [testContactId, testCampaignId, mid, ev]
                );
            }
            const res = await recalculateContactEngagement(testContactId);
            // Latest per msg_id: msg_a=sent, msg_b=delivered, msg_c=read → 3 sent, 2 delivered, 1 read
            assert(res.totalSent === 3, `total_sent=3 (got ${res.totalSent})`);
            assert(res.totalDelivered === 2, `total_delivered=2 (got ${res.totalDelivered})`);
            assert(res.totalRead === 1, `total_read=1 (got ${res.totalRead})`);
            assert(res.score > 0 && res.score <= 100, `Score in range: ${res.score}`);
            const [[dbRow]] = await pool.query('SELECT engagement_score FROM whatsapp_contacts WHERE id=?', [testContactId]);
            assert(parseFloat(dbRow?.engagement_score) === res.score, `Score persisted to DB: ${dbRow?.engagement_score}`);
        } else { console.log('  ⚠️  SKIP'); }

        // ── Test 3: Segment Classification ──────────────────────────────────
        console.log('\n[T3] Segment classification accuracy');
        const segs = await getEngagementSegments();
        assert(typeof segs.total === 'number', 'total is a number');
        assert(typeof segs.champions?.count === 'number', 'champions segment exists');
        assert(typeof segs.engaged?.count === 'number', 'engaged segment exists');
        assert(typeof segs.at_risk?.count === 'number', 'at_risk segment exists');
        assert(typeof segs.never_opened?.count === 'number', 'never_opened segment exists');
        assert(typeof segs.unsubscribed?.count === 'number', 'unsubscribed segment exists');
        await pool.query('UPDATE whatsapp_contacts SET engagement_score=90 WHERE id=?', [testContactId]);
        const segs2 = await getEngagementSegments();
        assert(segs2.champions.count >= 1, `Champions >=1 after score=90 (got ${segs2.champions.count})`);

        // ── Test 4: Archive / Restore ────────────────────────────────────────
        console.log('\n[T4] Archive / Restore workflow');
        await pool.query("UPDATE whatsapp_contacts SET status='active',opt_in_status=1 WHERE id=?", [testContactId]);
        const ar = await archiveContact(testContactId);
        assert(ar.success === true, 'Archive returns success');
        const [[arRow]] = await pool.query('SELECT status FROM whatsapp_contacts WHERE id=?', [testContactId]);
        assert(arRow?.status === 'archived', 'DB status = archived');
        const rr = await restoreContact(testContactId);
        assert(rr.success === true, 'Restore returns success');
        const [[rrRow]] = await pool.query('SELECT status,opt_in_status FROM whatsapp_contacts WHERE id=?', [testContactId]);
        assert(rrRow?.status === 'active', 'DB status = active after restore');
        assert(rrRow?.opt_in_status === 1, 'opt_in_status = 1 after restore');

        // ── Test 5: Opt-in Toggle ────────────────────────────────────────────
        console.log('\n[T5] Opt-in toggle validation');
        await pool.query("UPDATE whatsapp_contacts SET status='active',opt_in_status=1 WHERE id=?", [testContactId]);
        const tog1 = await toggleOptIn(testContactId);
        assert(tog1.newStatus === 'unsubscribed', `1st toggle → unsubscribed (got ${tog1.newStatus})`);
        assert(tog1.opted_in === false, 'opted_in=false after 1st toggle');
        const tog2 = await toggleOptIn(testContactId);
        assert(tog2.newStatus === 'active', `2nd toggle → active (got ${tog2.newStatus})`);
        assert(tog2.opted_in === true, 'opted_in=true after 2nd toggle');

        // ── Test 6: Campaign Completion Score Refresh ────────────────────────
        console.log('\n[T6] Campaign completion score refresh');
        if (testCampaignId) {
            await pool.query('UPDATE whatsapp_contacts SET total_sent=0,engagement_score=0 WHERE id=?', [testContactId]);
            await recalculateCampaignContacts(testCampaignId);
            const [[uc]] = await pool.query('SELECT total_sent,engagement_score FROM whatsapp_contacts WHERE id=?', [testContactId]);
            assert(typeof uc?.total_sent === 'number', `total_sent is a number (${uc?.total_sent})`);
            console.log(`  ℹ️  Score after campaign sync: ${uc?.engagement_score}`);
        } else { console.log('  ⚠️  SKIP'); }

        // ── Test 7: Profile API Accuracy ─────────────────────────────────────
        console.log('\n[T7] Drawer profile API accuracy');
        const prof = await getContactProfile(testContactId);
        assert(prof.id === testContactId, `Profile ID matches: ${prof.id}`);
        assert(prof.phone === '9999999999', `Phone correct: ${prof.phone}`);
        assert(Array.isArray(prof.tags), 'tags is an array');
        assert(Array.isArray(prof.lists), 'lists is an array');
        assert('engagement_score' in prof, 'engagement_score field present');
        assert('total_sent' in prof, 'total_sent field present');

        // ── Test 8: Performance ──────────────────────────────────────────────
        console.log('\n[T8] Segment query performance benchmark');
        const t0 = Date.now();
        await getEngagementSegments();
        const dur = Date.now() - t0;
        console.log(`  ℹ️  getEngagementSegments() completed in ${dur}ms`);
        assert(dur < 3000, `Query < 3000ms (took ${dur}ms)`);

        // ── Test 9: Never Opened Segment ─────────────────────────────────────
        console.log('\n[T9] Never Opened segment accuracy');
        await pool.query('UPDATE whatsapp_contacts SET total_sent=5,total_read=0,engagement_score=20 WHERE id=?', [testContactId]);
        const segs3 = await getEngagementSegments();
        assert(segs3.never_opened.count >= 1, `never_opened count >=1 (got ${segs3.never_opened.count})`);

        // ── Test 10: Unsubscribed Exclusion ──────────────────────────────────
        console.log('\n[T10] Unsubscribed exclusion validation');
        await pool.query("UPDATE whatsapp_contacts SET status='unsubscribed',opt_in_status=0 WHERE id=?", [testContactId]);
        const segs4 = await getEngagementSegments();
        assert(segs4.unsubscribed.count >= 1, `unsubscribed count >=1 (got ${segs4.unsubscribed.count})`);

    } catch (err) {
        console.error('\n[FATAL]', err.message);
        failed++;
    } finally {
        // Cleanup
        if (testContactId) {
            try {
                await pool.query('DELETE FROM whatsapp_contact_activity WHERE contact_id=?', [testContactId]);
                await pool.query('DELETE FROM whatsapp_contacts WHERE id=?', [testContactId]);
                console.log('\n[Cleanup] Test data removed.');
            } catch { /* ignore */ }
        }
        await pool.end();
    }

    console.log('\n╔══════════════════════════════════════════════════════╗');
    console.log(`║  Results: ${passed} PASSED  |  ${failed} FAILED  |  ${passed + failed} TOTAL`);
    if (failed === 0) {
        console.log('║  🎉  Sprint 9 FULLY VALIDATED — Production Ready!');
    } else {
        console.log(`║  ⚠️   ${failed} test(s) need attention.`);
    }
    console.log('╚══════════════════════════════════════════════════════╝');
    process.exit(failed > 0 ? 1 : 0);
}

run();
