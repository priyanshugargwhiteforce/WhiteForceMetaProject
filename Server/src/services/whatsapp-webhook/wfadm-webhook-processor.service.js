const whatsappTemplatesService = require('../whatsapp-templates.service');
const whatsappCallsService = require('../whatsapp-calls.service');
const whatsappService = require('../whatsapp.service');

/**
 * Core processing function for WFADM WhatsApp webhook body.
 * Expects the standard Meta payload structure.
 */
async function processWebhookBody(body) {
    if (body.object === 'whatsapp_business_account') {
        const entry = body.entry?.[0];
        const change = entry?.changes?.[0];
        const value = change?.value;

        // 1. Check for template status updates
        if (value?.event && value?.message_template_name) {
            const name = value.message_template_name;
            const status = value.event; // e.g. APPROVED, REJECTED, PENDING
            console.log(`Webhook Trigger: Template "${name}" status updated to: ${status}`);
            await whatsappTemplatesService.syncSingleTemplateStatus(name, status);
        }

        // 2. Check for message status updates (sent, delivered, read, failed)
        if (value?.statuses && Array.isArray(value.statuses)) {
            for (const statusObj of value.statuses) {
                const messageId = statusObj.id;
                const status = statusObj.status; // sent, delivered, read, failed
                let errorMessage = null;

                if (statusObj.errors && statusObj.errors.length > 0) {
                    errorMessage = statusObj.errors[0].message;
                }

                console.log(`Webhook Trigger: Message ID ${messageId} status update to: ${status}`);
                await whatsappTemplatesService.updateMessageStatus(messageId, status, errorMessage);
            }
        }

        // 3. Check for incoming customer messages/replies
        if (value?.messages && Array.isArray(value.messages)) {
            for (const msg of value.messages) {
                const fromPhone = msg.from; // Sender phone number
                const messageId = msg.id; // Unique WhatsApp message ID
                const timestamp = msg.timestamp; // Epoch timestamp
                const type = msg.type; // text, location, audio, voice, image, video, document, sticker, interactive, button, reaction, contacts, etc.

                let bodyText = '';
                let locationData = null;
                let mediaData = null;
                let interactiveDetails = null;
                let reactionEmoji = null;
                let contactsData = null;
                let orderData = null;

                if (type === 'text' && msg.text?.body) {
                    bodyText = msg.text.body;
                } else if (type === 'location' && msg.location) {
                    const { latitude, longitude, name, address } = msg.location;
                    const mapsUrl = `https://maps.google.com/?q=${latitude},${longitude}`;
                    const locationLabel = name ? `${name}${address ? ' - ' + address : ''}` : (address || `${latitude}, ${longitude}`);
                    bodyText = `📍 Location: ${locationLabel}\n${mapsUrl}`;
                    locationData = {
                        latitude,
                        longitude,
                        name: name || null,
                        address: address || null,
                        url: mapsUrl
                    };
                } else if ((type === 'audio' || type === 'voice') && (msg.audio || msg.voice)) {
                    const audioObj = msg.audio || msg.voice;
                    const isVoice = type === 'voice' || audioObj?.voice || false;
                    bodyText = isVoice ? '🎙️ Voice Note' : '🎵 Audio Message';

                    let audioUrl = null;
                    if (audioObj.id) {
                        try {
                            audioUrl = await whatsappService.downloadAndSaveWhatsAppAudio(audioObj.id, value.metadata?.phone_number_id);
                        } catch (err) {
                            console.warn('[Webhook Processor] Failed to download audio:', err.message);
                        }
                    }

                    mediaData = {
                        media_id: audioObj.id,
                        mime_type: audioObj.mime_type || null,
                        voice: isVoice,
                        audio_url: audioUrl
                    };
                } else if (type === 'image' && msg.image) {
                    const caption = msg.image.caption || '';
                    bodyText = caption ? `📷 Photo: ${caption}` : '📷 Photo';
                    mediaData = {
                        media_id: msg.image.id,
                        mime_type: msg.image.mime_type || null,
                        caption
                    };
                } else if (type === 'video' && msg.video) {
                    const caption = msg.video.caption || '';
                    bodyText = caption ? `🎥 Video: ${caption}` : '🎥 Video';
                    mediaData = {
                        media_id: msg.video.id,
                        mime_type: msg.video.mime_type || null,
                        caption
                    };
                } else if (type === 'document' && msg.document) {
                    const filename = msg.document.filename || msg.document.caption || 'Document';
                    bodyText = `📄 Document: ${filename}`;
                    mediaData = {
                        media_id: msg.document.id,
                        filename: msg.document.filename || null,
                        caption: msg.document.caption || null,
                        mime_type: msg.document.mime_type || null
                    };
                } else if (type === 'sticker' && msg.sticker) {
                    bodyText = '🎨 Sticker';
                    mediaData = {
                        media_id: msg.sticker.id,
                        mime_type: msg.sticker.mime_type || null,
                        animated: msg.sticker.animated || false
                    };
                } else if (type === 'interactive' && msg.interactive) {
                    const buttonReply = msg.interactive.button_reply;
                    const listReply = msg.interactive.list_reply;
                    const nfmReply = msg.interactive.nfm_reply;

                    if (buttonReply) {
                        bodyText = buttonReply.title || buttonReply.id || 'Selected Button Option';
                        interactiveDetails = { type: 'button_reply', id: buttonReply.id, title: buttonReply.title };
                    } else if (listReply) {
                        const title = listReply.title || 'Selected List Item';
                        const desc = listReply.description ? ` (${listReply.description})` : '';
                        bodyText = `${title}${desc}`;
                        interactiveDetails = { type: 'list_reply', id: listReply.id, title: listReply.title, description: listReply.description };
                    } else if (nfmReply) {
                        bodyText = 'Form Response Submitted';
                        interactiveDetails = { type: 'nfm_reply', response: nfmReply.response_json };
                    } else {
                        bodyText = 'Interactive Response';
                    }
                } else if (type === 'button' && msg.button) {
                    bodyText = msg.button.text || msg.button.payload || 'Clicked Button';
                    interactiveDetails = { type: 'button', text: msg.button.text, payload: msg.button.payload };
                } else if (type === 'reaction' && msg.reaction) {
                    reactionEmoji = msg.reaction.emoji || null;
                    bodyText = reactionEmoji ? `Reacted ${reactionEmoji}` : 'Removed reaction';
                } else if (type === 'contacts' && Array.isArray(msg.contacts) && msg.contacts.length > 0) {
                    const c = msg.contacts[0];
                    const name = c.name?.formatted_name || c.name?.first_name || 'Contact';
                    const phone = c.phones?.[0]?.phone || '';
                    bodyText = `🎴 Contact Shared: ${name}${phone ? ' (' + phone + ')' : ''}`;
                    contactsData = { name, phone };
                } else if (type === 'order' && msg.order) {
                    const catalogId = msg.order.catalog_id;
                    const items = msg.order.product_items || [];
                    bodyText = `🛒 Order Received (${items.length} item${items.length === 1 ? '' : 's'})`;
                    orderData = { catalog_id: catalogId, items, text: msg.order.text || null };
                } else if (type === 'unsupported' || (msg.errors && msg.errors.length > 0)) {
                    const errDetail = msg.errors?.[0]?.message || msg.errors?.[0]?.title || 'Unsupported message type sent by user';
                    bodyText = `⚠️ Unsupported Message (${errDetail})`;
                } else if (msg.system?.body) {
                    bodyText = msg.system.body;
                } else {
                    bodyText = msg.text?.body || msg.caption || `[${type || 'unsupported'} message]`;
                }

                // Sender profile name if present
                let senderName = null;
                if (value.contacts && Array.isArray(value.contacts)) {
                    const contactObj = value.contacts.find(c => c.wa_id === fromPhone);
                    if (contactObj?.profile?.name) {
                        senderName = contactObj.profile.name;
                    }
                }

                console.log(`Webhook Trigger: Incoming message from ${fromPhone} (Type: ${type}, Name: ${senderName}): "${bodyText}"`);

                const replyToMessageId = msg.context?.id || null;

                await whatsappTemplatesService.handleIncomingMessage({
                    fromPhone,
                    messageId,
                    timestamp,
                    type,
                    body: bodyText,
                    senderName,
                    phoneId: value.metadata?.phone_number_id,
                    replyToMessageId,
                    location: locationData,
                    media: mediaData,
                    interactive: interactiveDetails,
                    reactionEmoji,
                    contactsData,
                    orderData
                });
            }
        }

        // 4. Check for incoming WhatsApp Calls events
        if (value?.calls && Array.isArray(value.calls)) {
            const metadata = value.metadata || {};
            const contacts = value.contacts || [];
            for (const callObj of value.calls) {
                console.log(`Webhook Trigger: Incoming WhatsApp Call event '${callObj.event}' for Call ID: ${callObj.id} (From: ${callObj.from})`);
                await whatsappCallsService.processCallWebhook(callObj, metadata, contacts);
            }
        }
    }
}

module.exports = { processWebhookBody };
