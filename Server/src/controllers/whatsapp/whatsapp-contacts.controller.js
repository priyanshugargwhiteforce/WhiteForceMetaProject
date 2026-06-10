const contactsService = require('../../services/whatsapp-contacts.service');
const intelligenceService = require('../../services/whatsapp-contacts-intelligence.service');
const { pool } = require('../../config/db');
const axios = require('axios');
const whatsappService = require('../../services/whatsapp.service');


exports.importContacts = async (req, res) => {
    try {
        const { contacts, listName, listId } = req.body;
        if (!contacts || !Array.isArray(contacts)) {
            return res.status(400).json({ success: false, message: 'Contacts list (array) is required.' });
        }

        const result = await contactsService.importContacts(contacts, listName, listId);
        res.status(200).json(result);
    } catch (error) {
        console.error('Import contacts controller error:', error.message);
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getContacts = async (req, res) => {
    try {
        const { page, limit, search, listId, tag, segment } = req.query;
        const result = await contactsService.getContacts({
            page: page ? parseInt(page) : 1,
            limit: limit ? parseInt(limit) : 20,
            search,
            listId: listId ? parseInt(listId) : null,
            tag,
            segment  // Sprint 9: pass segment filter
        });
        res.status(200).json({ success: true, ...result });
    } catch (error) {
        console.error('Get contacts controller error:', error.message);
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.createList = async (req, res) => {
    try {
        const { name } = req.body;
        if (!name || name.trim() === '') {
            return res.status(400).json({ success: false, message: 'List name is required.' });
        }
        const result = await contactsService.createContactList(name);
        res.status(201).json({ success: true, list: result });
    } catch (error) {
        console.error('Create list controller error:', error.message);
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getLists = async (req, res) => {
    try {
        const lists = await contactsService.getContactLists();
        res.status(200).json({ success: true, lists });
    } catch (error) {
        console.error('Get lists controller error:', error.message);
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.deleteList = async (req, res) => {
    try {
        const { id } = req.params;
        await contactsService.deleteContactList(id);
        res.status(200).json({ success: true, message: 'Contact list deleted successfully.' });
    } catch (error) {
        console.error('Delete list controller error:', error.message);
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getAttributeKeys = async (req, res) => {
    try {
        const { listId } = req.query;
        const keys = await contactsService.getAttributeKeys(listId ? parseInt(listId) : null);
        res.status(200).json({ success: true, keys });
    } catch (error) {
        console.error('Get attribute keys controller error:', error.message);
        res.status(500).json({ success: false, message: error.message });
    }
};

// ─── Sprint 9: Contact Intelligence Endpoints ─────────────────────────────────

exports.getEngagementSegments = async (req, res) => {
    try {
        const segments = await intelligenceService.getEngagementSegments();
        res.status(200).json({ success: true, segments });
    } catch (error) {
        console.error('Get engagement segments error:', error.message);
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getContactProfile = async (req, res) => {
    try {
        const { id } = req.params;
        const profile = await intelligenceService.getContactProfile(parseInt(id));
        res.status(200).json({ success: true, profile });
    } catch (error) {
        console.error('Get contact profile error:', error.message);
        res.status(error.message.includes('not found') ? 404 : 500)
            .json({ success: false, message: error.message });
    }
};

exports.getContactActivity = async (req, res) => {
    try {
        const { id } = req.params;
        const activity = await intelligenceService.getContactActivity(parseInt(id));
        res.status(200).json({ success: true, activity });
    } catch (error) {
        console.error('Get contact activity error:', error.message);
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.toggleOptIn = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await intelligenceService.toggleOptIn(parseInt(id));
        res.status(200).json(result);
    } catch (error) {
        console.error('Toggle opt-in error:', error.message);
        res.status(error.message.includes('not found') ? 404 : 500)
            .json({ success: false, message: error.message });
    }
};

exports.archiveContact = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await intelligenceService.archiveContact(parseInt(id));
        res.status(200).json(result);
    } catch (error) {
        console.error('Archive contact error:', error.message);
        res.status(error.message.includes('not found') ? 404 : 400)
            .json({ success: false, message: error.message });
    }
};

exports.restoreContact = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await intelligenceService.restoreContact(parseInt(id));
        res.status(200).json(result);
    } catch (error) {
        console.error('Restore contact error:', error.message);
        res.status(error.message.includes('not found') ? 404 : 400)
            .json({ success: false, message: error.message });
    }
};

exports.getChatThreads = async (req, res) => {
    try {
        const threads = await contactsService.getChatThreads();
        res.status(200).json({ success: true, threads });
    } catch (error) {
        console.error('Get chat threads error:', error.message);
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getChatMessages = async (req, res) => {
    try {
        const { contactId } = req.params;
        const messages = await contactsService.getChatMessages(parseInt(contactId));
        res.status(200).json({ success: true, messages });
    } catch (error) {
        console.error('Get chat messages error:', error.message);
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.sendFreeTextChat = async (req, res) => {
    try {
        const { contactId } = req.params;
        const { message } = req.body;
        const configId = req.headers['x-whatsapp-config-id'] || req.query.configId;

        if (!message || message.trim() === '') {
            return res.status(400).json({ success: false, message: 'Message body cannot be empty.' });
        }

        // 1. Resolve contact details (phone number)
        const [[contact]] = await pool.query('SELECT phone FROM whatsapp_contacts WHERE id = ?', [parseInt(contactId)]);
        if (!contact) {
            return res.status(404).json({ success: false, message: `Contact with ID ${contactId} not found.` });
        }
        const recipient = contact.phone;

        // 2. Resolve credentials using whatsappService
        const { token, phoneId } = await whatsappService.resolveWhatsAppConfig(configId);
        if (!token || !phoneId) {
            return res.status(400).json({ success: false, message: 'Missing WhatsApp credentials configuration.' });
        }

        // 3. Send Free-Text message to Meta Cloud API
        const url = `https://graph.facebook.com/v24.0/${phoneId}/messages`;
        const payload = {
            messaging_product: "whatsapp",
            recipient_type: "individual",
            to: recipient.trim(),
            type: "text",
            text: {
                body: message
            }
        };

        const response = await axios.post(url, payload, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        const messageId = response.data.messages?.[0]?.id;

        // 4. Log the sent message
        await pool.query(
            `INSERT INTO whatsapp_message_logs (phone_number_id, recipient_number, template_name, status, message_id)
             VALUES (?, ?, ?, ?, ?)`,
            [phoneId, recipient.trim(), 'Free-Text Chat', 'sent', messageId]
        );

        // Update contact last_message_at
        await pool.query(
            `UPDATE whatsapp_contacts SET last_message_at = NOW() WHERE id = ?`,
            [parseInt(contactId)]
        );

        // Log the activity event 'sent' in whatsapp_contact_activity
        await pool.query(
            `INSERT INTO whatsapp_contact_activity (contact_id, campaign_id, message_id, event_type, metadata, event_timestamp)
             VALUES (?, NULL, ?, 'sent', ?, NOW())`,
            [
                parseInt(contactId),
                messageId,
                JSON.stringify({ body: message, type: 'text', freeText: true })
            ]
        );

        // 5. Recalculate engagement score
        const { recalculateContactEngagement } = require('../../services/whatsapp-contacts-intelligence.service');
        await recalculateContactEngagement(parseInt(contactId));

        res.status(200).json({
            success: true,
            messageId,
            status: 'sent'
        });
    } catch (error) {
        console.error('Send free-text chat error:', error.response?.data || error.message);
        const errDetails = error.response?.data?.error?.message || error.message;
        res.status(500).json({ success: false, message: errDetails });
    }
};


