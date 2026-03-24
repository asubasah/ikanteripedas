require('dotenv').config();
const dns = require('dns');
// Force IPv4 because WhatsApp often blocks or drops IPv6 connections from Data Centers (VPS)
dns.setDefaultResultOrder('ipv4first');

const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, downloadMediaMessage, fetchLatestBaileysVersion, Browsers, jidNormalizedUser } = require('@whiskeysockets/baileys');
const pino = require('pino');
const express = require('express');
const cors = require('cors');
const qrcode = require('qrcode-terminal');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const mime = require('mime-types');

const app = express();
app.use(cors());
app.use(express.json());

const NEXTJS_WEBHOOK_URL = process.env.NEXTJS_WEBHOOK_URL || 'http://localhost:3000/api/webhook/waha';
const NEXTJS_UPLOAD_DIR = path.resolve(__dirname, '../mkm-next/public/uploads');

let sock = null;

// ====================================================================
// LID <-> Phone Resolution (v7 compatible — no makeInMemoryStore)
// ====================================================================
const LID_MAP_FILE = './lid_phone_map.json';
let lidPhoneMap = {};
if (fs.existsSync(LID_MAP_FILE)) {
    try { lidPhoneMap = JSON.parse(fs.readFileSync(LID_MAP_FILE, 'utf8')); } catch(e) {}
    console.log(`📇 Loaded ${Object.keys(lidPhoneMap).length} cached LID mappings`);
}
function saveLidMap() { fs.writeFileSync(LID_MAP_FILE, JSON.stringify(lidPhoneMap, null, 2)); }

function normalizePhone(digits) {
    if (digits.startsWith('628')) return '0' + digits.slice(2);
    if (digits.startsWith('62')) return '0' + digits.slice(2);
    if (digits.startsWith('8') && digits.length >= 9) return '0' + digits;
    return digits;
}

function resolveJidToPhone(rawJid) {
    if (!rawJid) return null;
    const num = rawJid.split('@')[0];
    const domain = rawJid.split('@')[1] || '';

    // Already a normal phone
    if (domain === 's.whatsapp.net') return normalizePhone(num);

    // 🔥 PRIMARY: Read Baileys v7 internal lid-mapping auth files
    // File format: auth_info_baileys/lid-mapping-{LID_NUMBER}_reverse.json = "phoneDigits"
    const reverseFile = path.resolve(__dirname, `auth_info_baileys/lid-mapping-${num}_reverse.json`);
    if (fs.existsSync(reverseFile)) {
        try {
            const phoneDigits = JSON.parse(fs.readFileSync(reverseFile, 'utf8'));
            if (phoneDigits && typeof phoneDigits === 'string') {
                console.log(`🔓 LID->Phone from auth: ${rawJid} -> ${normalizePhone(phoneDigits)}`);
                return normalizePhone(phoneDigits);
            }
        } catch (e) {
            console.warn(`Failed to read lid-mapping:`, e.message);
        }
    }

    // SECONDARY: manual cache
    if (lidPhoneMap[rawJid]) {
        const phone = lidPhoneMap[rawJid].split('@')[0];
        return normalizePhone(phone);
    }

    console.warn(`⚠️ Unresolved LID: ${rawJid}`);
    return null;
}

    // ====================================================================
    // BAILEYS ENGINE
    // ====================================================================
    async function startBaileys() {
        const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');
        const { Boom } = require('@hapi/boom');

        sock = makeWASocket({
            auth: state,
            printQRInTerminal: true, // QR akan muncul di terminal
            browser: ["My VPS Bot", "Chrome", "1.0.0"],
            logger: pino({ level: 'info' }), // Keep info for monitoring
        });

        sock.ev.on('creds.update', saveCreds);

        // 🔥 Capture ALL contact sync events -> build LID map
        sock.ev.on('contacts.upsert', (contacts) => {
            // 🔍 DEBUG: Dump first 5 raw contact objects to file for inspection
            const debugFile = path.resolve(__dirname, 'debug_contacts.json');
            const sample = contacts.slice(0, 10).map(c => ({ ...c }));
            fs.writeFileSync(debugFile, JSON.stringify(sample, null, 2));
            console.log(`📇 contacts.upsert: ${contacts.length} contacts received. Sample dumped to debug_contacts.json`);
            
            let mapped = 0;
            for (const c of contacts) {
                const keys = Object.keys(c);
                // Try ALL possible field combinations
                // v7 might use: id, lid, verifiedName, name, notify, imgUrl, status
                const phoneJid = keys.find(k => {
                    const val = c[k];
                    return typeof val === 'string' && val.includes('@s.whatsapp.net');
                });
                const lidJid = keys.find(k => {
                    const val = c[k];
                    return typeof val === 'string' && val.includes('@lid');
                });
                
                if (phoneJid && lidJid) {
                    lidPhoneMap[c[lidJid]] = c[phoneJid];
                    mapped++;
                }
                // Classic approach
                if (c.lid && c.id?.includes('@s.whatsapp.net')) {
                    lidPhoneMap[c.lid] = c.id;
                    mapped++;
                }
            }
            if (mapped > 0) {
                console.log(`📇 ${mapped} LID->Phone mappings captured!`);
                saveLidMap();
            } else {
                console.log(`⚠️ No LID->Phone mappings found in this batch. Check debug_contacts.json`);
            }
        });

        sock.ev.on('contacts.update', (contacts) => {
            let mapped = 0;
            for (const c of contacts) {
                if (c.lid && c.id?.includes('@s.whatsapp.net')) {
                    lidPhoneMap[c.lid] = c.id;
                    mapped++;
                }
            }
            if (mapped > 0) { console.log(`📇 contacts.update: ${mapped} mappings`); saveLidMap(); }
        });

        sock.ev.on('messaging-history.set', (data) => {
            const { contacts, chats } = data;
            let mapped = 0;
            if (contacts) {
                for (const c of contacts) {
                    if (c.lid && c.id?.includes('@s.whatsapp.net')) {
                        lidPhoneMap[c.lid] = c.id;
                        mapped++;
                    }
                }
            }
            if (chats) {
                for (const chat of chats) {
                    // Some chats have the phone JID in their id
                    if (chat.id?.includes('@s.whatsapp.net') && chat.lid) {
                        lidPhoneMap[chat.lid] = chat.id;
                        mapped++;
                    }
                }
            }
            if (mapped > 0) { console.log(`📜 history sync: ${mapped} LID mappings`); saveLidMap(); }
            console.log(`📜 History sync complete. Total LID mappings: ${Object.keys(lidPhoneMap).length}`);
        });

        sock.ev.on('connection.update', (update) => {
            const { connection, lastDisconnect, qr } = update;
            if (qr) {
                console.log("\nScan QR Code:\n");
                qrcode.generate(qr, {small: true});
            }
            if (connection === 'close') {
                const shouldReconnect = (lastDisconnect.error instanceof Boom)?.output?.statusCode !== DisconnectReason.loggedOut;
                console.log('❌ Koneksi terputus karena:', lastDisconnect.error?.message || lastDisconnect.error);
                console.log('🔄 mencoba hubungkan kembali:', shouldReconnect);
                if(shouldReconnect) startBaileys();
            } else if (connection === 'open') {
                console.log('✅ WA Connection Opened!');
                console.log(`📇 LID->Phone map has ${Object.keys(lidPhoneMap).length} entries`);
            }
        });

    sock.ev.on('messages.upsert', async (m) => {
        if (!m.messages || m.messages.length === 0) return;
        const msg = m.messages[0];
        if (msg.key.fromMe) return;

        const rawRemoteJid = msg.key.remoteJid;
        
        // Try to resolve LID -> real phone number
        let cleanPhone = resolveJidToPhone(rawRemoteJid);

        // If resolution failed AND it's a LID, try sock.onWhatsApp as last resort
        if (!cleanPhone && rawRemoteJid.includes('@lid')) {
            try {
                const results = await sock.onWhatsApp(rawRemoteJid);
                if (results?.[0]?.exists && results[0].jid) {
                    lidPhoneMap[rawRemoteJid] = results[0].jid;
                    saveLidMap();
                    cleanPhone = normalizePhone(results[0].jid.split('@')[0]);
                    console.log(`🔓 onWhatsApp resolved: ${rawRemoteJid} -> ${cleanPhone}`);
                }
            } catch (e) {
                console.warn(`onWhatsApp fallback failed:`, e.message);
            }
        }

        // If STILL unresolved, use the raw digits as fallback
        if (!cleanPhone) {
            cleanPhone = rawRemoteJid.split('@')[0];
            console.warn(`⚠️ Using raw LID digits as phone: ${cleanPhone}`);
        }

        console.log(`📨 Raw: ${rawRemoteJid} | Phone: ${cleanPhone} | Name: ${msg.pushName}`);

        let body = '';
        let type = 'text';
        let hasMedia = false;
        let localFileName = null;

        const actualMessage = msg.message?.ephemeralMessage?.message || msg.message?.viewOnceMessage?.message || msg.message;
        if (!actualMessage) return;

        body = actualMessage.conversation || 
               actualMessage.extendedTextMessage?.text || 
               actualMessage.imageMessage?.caption || 
               actualMessage.videoMessage?.caption || 
               actualMessage.documentMessage?.caption || '';

        const messageType = Object.keys(actualMessage || {})[0];

        if (['imageMessage', 'documentMessage', 'videoMessage', 'audioMessage'].includes(messageType)) {
            type = 'media';
            hasMedia = true;
            const fileMime = actualMessage[messageType]?.mimetype;
            
            try {
                const buffer = await downloadMediaMessage(
                    msg, 'buffer', {},
                    { logger: pino({ level: 'silent' }), reuploadRequest: sock.updateMediaMessage }
                );
                if (buffer) {
                    const ext = mime.extension(fileMime) || 'bin';
                    localFileName = `wa_${Date.now()}_${msg.key.id}.${ext}`;
                    if (!fs.existsSync(NEXTJS_UPLOAD_DIR)) fs.mkdirSync(NEXTJS_UPLOAD_DIR, { recursive: true });
                    fs.writeFileSync(path.join(NEXTJS_UPLOAD_DIR, localFileName), buffer);
                    console.log(`✅ Media saved: ${localFileName}`);
                }
            } catch (err) {
                console.error('❌ Media download failed:', err.message);
            }
        }

        const payload = {
            event: 'message',
            payload: {
                id: msg.key.id,
                from: rawRemoteJid,
                rawRemoteJid: rawRemoteJid,
                cleanPhone: cleanPhone,
                to: sock.user.id,
                body: body,
                type: type,
                hasMedia: hasMedia,
                pushName: msg.pushName || 'Customer WA',
                _data: { localFileName: localFileName, notifyName: msg.pushName }
            }
        };

        try {
            await axios.post(NEXTJS_WEBHOOK_URL, payload);
            console.log('🚀 Forwarded to Next.js');
        } catch (err) {
            console.error('⚠️ Forward failed:', err.message);
        }
    });
}

startBaileys();

// ====================================================================
// API LAYER
// ====================================================================
app.post('/api/sendText', async (req, res) => {
    try {
        let { chatId, text } = req.body;
        console.log(`\n[SEND] 📬 Target: ${chatId}`);
        if (!sock) return res.status(500).json({ error: 'Socket offline' });
        
        if (chatId?.includes('@c.us')) chatId = chatId.replace('@c.us', '@s.whatsapp.net');

        res.json({ success: true });

        sock.sendMessage(chatId, { text })
            .then(() => console.log(`✅ Delivered to ${chatId}`))
            .catch((err) => console.error(`❌ SEND FAIL to ${chatId}:`, err.message));
    } catch (error) {
        console.error('❌ sendText error:', error.message);
        if (!res.headersSent) res.status(500).json({ error: error.message });
    }
});

// Debug: see current LID map
app.get('/api/debug/lid-map', (req, res) => {
    res.json({ count: Object.keys(lidPhoneMap).length, map: lidPhoneMap });
});

const PORT = 3017;
app.listen(PORT, () => console.log(`🚀 MKM Baileys running on port ${PORT}`));
