/**
 * CYBERMUU - SYSTEM EXECUTABLE INFRASTRUCTURE
 * Copyright (c) 2026 CYBERMUU // ETHICALMUU
 * Fully English & Dark Neon Aesthetic Compliant
 */

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const chalk = require('chalk');
const fs = require('fs');
const { rmSync, existsSync } = require('fs');
const { join } = require('path');
const pino = require('pino');
const NodeCache = require("node-cache");
const readline = require("readline");
const PhoneNumber = require('awesome-phonenumber');
const { parsePhoneNumber } = require("libphonenumber-js");
const { Boom } = require('@hapi/boom');
const axios = require('axios');

// Import Baileys Core Modules
const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion,
    generateForwardMessageContent,
    prepareWAMessageMedia,
    generateWAMessageFromContent,
    generateMessageID,
    downloadContentFromMessage,
    jidDecode,
    proto,
    jidNormalizedUser,
    makeCacheableSignalKeyStore,
    delay
} = require("@whiskeysockets/baileys");

// Local File Inclusions
require('./settings');
const { handleMessages, handleGroupParticipantUpdate, handleStatus } = require('./main');
const { imageToWebp, videoToWebp, writeExifImg, writeExifVid } = require('./lib/exif');
// REMOVED 'await' FROM DESTRUCTURING TO FIX RUNTIME SYNTAX ERROR
const { smsg, isUrl, generateMessageTag, getBuffer, getSizeMedia, fetch, sleep, reSize } = require('./lib/myfunc');
const store = require('./lib/lightweight_store');

// Express & Socket Server Initialization
const app = express();
app.use(express.static(path.join(__dirname)));
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*", methods: ["GET", "POST"] }
});

const PORT = process.env.PORT || 3000;
let XeonBotIncInstance = null;

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Real-time Dashboard Socket System
io.on('connection', (socket) => {
    console.log(chalk.cyan('[NET_MONITOR] Dashboard client tunnel established.'));

    socket.on('get_code', async (num) => {
        try {
            let formattedNum = num.replace(/[^0-9]/g, '');
            
            if (!formattedNum) {
                socket.emit('error_msg', 'INVALID TARGET DATA!');
                return;
            }

            if (!XeonBotIncInstance) {
                socket.emit('error_msg', 'CORE COMPILING... RETRY IN 5 SECONDS!');
                return;
            }

            console.log(chalk.yellow(`[GATEWAY] Extracting payload code for: ${formattedNum}`));
            let code = await XeonBotIncInstance.requestPairingCode(formattedNum);
            code = code?.match(/.{1,4}/g)?.join("-") || code;

            socket.emit('pair_code', code);
            console.log(chalk.black(chalk.bgGreen(`[SUCCESS] Token Generated: ${code}`)));
        } catch (err) {
            console.error(err);
            socket.emit('error_msg', 'SOCKET DISRUPTION: SESSION BUSY. RETRY!');
        }
    });
});

server.listen(PORT, '0.0.0.0', () => {
    console.log(chalk.green(`📡 CYBERMUU CORE RUNNING ON PORT: ${PORT} - READY FOR INBOUND TRAFFIC!`));
});

// RAM and Memory Watchdog
setInterval(() => {
    const used = process.memoryUsage().rss / 1024 / 1024;
    if (used > 400) {
        console.log(chalk.red('⚠️ MEMORY OVERFLOW PREVENTION: AUTO-BOOT TRIGGERED...'));
        process.exit(1);
    }
}, 30000);

global.botname = "CYBERMUU";
global.themeemoji = "•";

// Initialize Data Store Sync
store.readFromFile();
setInterval(() => store.writeToFile(), 10000);

// Initialize the Hacker Core Engine Instantly
console.log(chalk.magenta('⚙️ Injecting CYBERMUU Core Kernel & Triggers...'));
startXeonBotInc();

async function startXeonBotInc() {
    try {
        let { version, isLatest } = await fetchLatestBaileysVersion();
        const { state, saveCreds } = await useMultiFileAuthState(`./session`);
        const msgRetryCounterCache = new NodeCache();

        const XeonBotInc = makeWASocket({
            version,
            logger: pino({ level: 'silent' }),
            printQRInTerminal: false,
            browser: ["CYBERMUU SYSTEM", "MacOs", "1.0.0"],
            auth: {
                creds: state.creds,
                keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "fatal" }).child({ level: "fatal" })),
            },
            markOnlineOnConnect: true,
            generateHighQualityLinkPreview: true,
            syncFullHistory: false,
            getMessage: async (key) => {
                let jid = jidNormalizedUser(key.remoteJid);
                let msg = await store.loadMessage(jid, key.id);
                return msg?.message || "";
            },
            msgRetryCounterCache,
            defaultQueryTimeoutMs: 60000,
            connectTimeoutMs: 60000,
            keepAliveIntervalMs: 10000,
        });

        // Instant Instance Exposure
        XeonBotIncInstance = XeonBotInc;
        XeonBotInc.get_io = () => io;

        XeonBotInc.ev.on('creds.update', saveCreds);
        store.bind(XeonBotInc.ev);

        XeonBotInc.ev.on('messages.upsert', async chatUpdate => {
            try {
                const mek = chatUpdate.messages[0];
                if (!mek.message) return;
                mek.message = (Object.keys(mek.message)[0] === 'ephemeralMessage') ? mek.message.ephemeralMessage.message : mek.message;
                
                if (mek.key && mek.key.remoteJid === 'status@broadcast') {
                    await handleStatus(XeonBotInc, chatUpdate);
                    return;
                }
                if (!XeonBotInc.public && !mek.key.fromMe && chatUpdate.type === 'notify') {
                    const isGroup = mek.key?.remoteJid?.endsWith('@g.us');
                    if (!isGroup) return;
                }
                if (mek.key.id.startsWith('BAE5') && mek.key.id.length === 16) return;

                if (XeonBotInc?.msgRetryCounterCache) {
                    XeonBotInc.msgRetryCounterCache.clear();
                }

                await handleMessages(XeonBotInc, chatUpdate, true);
            } catch (err) {
                console.error("Payload routing error:", err);
            }
        });

        XeonBotInc.decodeJid = (jid) => {
            if (!jid) return jid;
            if (/:\d+@/gi.test(jid)) {
                let decode = jidDecode(jid) || {};
                return decode.user && decode.server && decode.user + '@' + decode.server || jid;
            } else return jid;
        };

        XeonBotInc.ev.on('contacts.update', update => {
            for (let contact of update) {
                let id = XeonBotInc.decodeJid(contact.id);
                if (store && store.contacts) store.contacts[id] = { id, name: contact.notify };
            }
        });

        XeonBotInc.getName = (jid, withoutContact = false) => {
            let id = XeonBotInc.decodeJid(jid);
            let withoutContactOpt = XeonBotInc.withoutContact || withoutContact;
            let v;
            if (id.endsWith("@g.us")) return new Promise(async (resolve) => {
                v = store.contacts[id] || {};
                if (!(v.name || v.subject)) v = XeonBotInc.groupMetadata(id) || {};
                resolve(v.name || v.subject || PhoneNumber('+' + id.replace('@s.whatsapp.net', '')).getNumber('international'));
            });
            else v = id === '0@s.whatsapp.net' ? { id, name: 'WhatsApp' } : id === XeonBotInc.decodeJid(XeonBotInc.user.id) ? XeonBotInc.user : (store.contacts[id] || {});
            return (withoutContactOpt ? '' : v.name) || v.subject || v.verifiedName || PhoneNumber('+' + jid.replace('@s.whatsapp.net', '')).getNumber('international');
        };

        XeonBotInc.public = true;
        XeonBotInc.serializeM = (m) => smsg(XeonBotInc, m, store);

        XeonBotInc.ev.on('connection.update', async (s) => {
            const { connection, lastDisconnect } = s;
            if (connection === 'connecting') console.log(chalk.yellow('⚡ Initializing Tunnel Protocols...'));

            if (connection == "open") {
                console.log(chalk.green(`🌐 ACCESS GRANTED: CYBERMUU ENGINE ONLINE v1.0.0 ✅`));
                try {
                    const botNumber = XeonBotInc.user.id.split(':')[0] + '@s.whatsapp.net';
                    await XeonBotInc.sendMessage(botNumber, {
                        text: `🛡️ *CYBERMUU MAINFRAME ACTIVE*\n\nAll links secure. Systems operational.`,
                    });
                } catch (error) {
                    console.error('Failed to dispatch initialization signal:', error.message);
                }
            }

            if (connection === 'close') {
                const shouldReconnect = (lastDisconnect?.error)?.output?.statusCode !== DisconnectReason.loggedOut;
                const statusCode = lastDisconnect?.error?.output?.statusCode;
                console.log(chalk.red(`[ALERT] Connection severed. Automatic Retry: ${shouldReconnect}`));
                if (statusCode === DisconnectReason.loggedOut || statusCode === 401) {
                    try { rmSync('./session', { recursive: true, force: true }); } catch (error) {}
                }
                if (shouldReconnect) {
                    await delay(5000);
                    startXeonBotInc();
                }
            }
        });

        XeonBotInc.ev.on('group-participants.update', async (update) => {
            await handleGroupParticipantUpdate(XeonBotInc, update);
        });

        return XeonBotInc;
    } catch (error) {
        console.error('Fatal crash on core initialization:', error);
        await delay(5000);
        startXeonBotInc();
    }
}

// Global Exception Shields
process.on('uncaughtException', (err) => {});
process.on('unhandledRejection', (err) => {});
