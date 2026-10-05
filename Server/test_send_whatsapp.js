require('dotenv').config();
const { pool } = require('./src/config/db');
const campaignsService = require('./src/services/whatsapp-campaigns.service');
const { cleanPhoneNumber } = require('./src/services/dailyTaskReminder.service');

async function testSendWhatsApp() {
    console.log('\n╔══════════════════════════════════════════════════════════╗');
    console.log('║    Testing WhatsApp Template Delivery: daily_task_not_update    ║');
    console.log('╚══════════════════════════════════════════════════════════╝');

    const targetNumberRaw = '9300855707';
    const managerName = 'Gurmeet';

    const targetPhone = cleanPhoneNumber(targetNumberRaw);
    console.log(`Target Phone Raw: ${targetNumberRaw} -> Formatted: ${targetPhone}`);
    console.log(`Template Variable {{1}}: ${managerName}`);

    try {
        // Fetch template 'daily_task_not_update'
        const [[templateObj]] = await pool.query(
            'SELECT id, name, waba_id, status FROM whatsapp_templates WHERE name = "daily_task_not_update" AND status = "APPROVED" LIMIT 1'
        );

        if (!templateObj) {
            console.error('❌ Template "daily_task_not_update" not found in DB!');
            process.exit(1);
        }

        console.log(`✓ Template found: ${templateObj.name} (ID: ${templateObj.id}, Status: ${templateObj.status})`);

        // Default list
        let [[defaultList]] = await pool.query('SELECT id FROM whatsapp_contact_lists WHERE name = "Test Send List" LIMIT 1');
        let defaultListId;
        if (!defaultList) {
            const [insertRes] = await pool.query('INSERT INTO whatsapp_contact_lists (name) VALUES ("Test Send List")');
            defaultListId = insertRes.insertId;
        } else {
            defaultListId = defaultList.id;
        }

        const campaignName = `Test Daily Task Not Update - ${targetPhone} - ${Date.now()}`;
        const recipients = [
            {
                number: targetPhone,
                parameters: [managerName]
            }
        ];

        console.log('\nDispatching campaign with recipients:', JSON.stringify(recipients, null, 2));

        const result = await campaignsService.createCampaign({
            configId: 0,
            name: campaignName,
            templateId: templateObj.id,
            contactListId: defaultListId,
            campaignType: 'broadcast',
            status: 'queued',
            recipients
        });

        console.log(`\n✅ Campaign Created & Enqueued Successfully! Campaign ID: ${result.campaignId}`);
        console.log('Waiting 5 seconds for BullMQ worker to process and dispatch message via Meta Cloud API...');

        await new Promise(r => setTimeout(r, 5000));

        // Query Campaign Stats and Recipient Status
        const [[stats]] = await pool.query('SELECT * FROM whatsapp_campaign_stats WHERE campaign_id = ?', [result.campaignId]);
        const [recipientsRows] = await pool.query('SELECT * FROM whatsapp_campaign_recipients WHERE campaign_id = ?', [result.campaignId]);

        console.log('\n📊 Campaign Results Summary:');
        console.log('Campaign Stats:', stats);
        console.log('Recipient Status:', recipientsRows.map(r => ({
            phone: r.phone,
            status: r.status,
            messageId: r.message_id,
            error: r.error_message
        })));

        if (recipientsRows.length > 0 && (recipientsRows[0].status === 'sent' || recipientsRows[0].status === 'delivered' || recipientsRows[0].status === 'queued')) {
            console.log('\n🎉 SUCCESS: WhatsApp template message processed and sent!');
        } else if (recipientsRows.length > 0 && recipientsRows[0].status === 'failed') {
            console.error('\n❌ FAILED: Meta API returned an error:', recipientsRows[0].error_message);
        }

    } catch (err) {
        console.error('❌ Error during test send execution:', err);
    } finally {
        process.exit(0);
    }
}

testSendWhatsApp();
