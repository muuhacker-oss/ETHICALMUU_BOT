/**
 * CYBERMUU - FULL INTEGRATED INFRASTRUCTURE
 * Copyright (c) 2026 CYBERMUU // ETHICALMUU
 * Fully Functional with Commands & Socket Pairing Gateways
 */

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const chalk = require('chalk');
const fs = require('fs');
const { rmSync } = require('fs');
const pino = require('pino');
const NodeCache = require("node-cache");
const PhoneNumber = require('awesome-phonenumber');

// Core Baileys & Local Modules
const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion,
    jidDecode,
    jidNormalizedUser,
    makeCacheableSignalKeyStore,
    delay
} = require("@whiskeysockets/baileys");

require('./settings');
const { handleMessages, handleGroupParticipantUpdate, handleStatus } = require('./main');
// FIXED: Removed the reserved word 'await' from destructuring to stop Module._compile crash
const { smsg } = require('./lib/myfunc');
const store = require('./lib/lightweight_store');

const app = reportExpressErrors(express());
app.use(express.static(path.join(__dirname)));
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

const PORT = process.env.PORT || 3000;
let XeonBotIncInstance = null;

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Socket logic for dashboard pairing
io.on('connection', (socket) => {
    console.log(chalk.cyan('[SOCKET] Connected to web dashboard.'));

    socket.on('get_code', async (num) => {
        try {
            let formattedNum = num.replace(/[^0-9]/g, '');
            if (!formattedNum) {
                socket.emit('error_msg', 'INVALID PHONE NUMBER FORMAT!');
                return;
            }
            if (!XeonBotIncInstance) {
                socket.emit('error_msg', 'BOT CORE ENGINE IS STARTING... RETRY!');
                return;
            }
            console.log(chalk.yellow(`[GATEWAY] Generating code for: ${formattedNum}`));
            let code = await XeonBotIncInstance.requestPairingCode(formattedNum);
            code = code?.match(/.{1,4}/g)?.join("-") || code;
            socket.emit('pair_code', code);
        } catch (err) {
            socket.emit('error_msg', 'WHATSAPP REFUSED CONNECTION. RETRY!');
        }
    });
});

server.listen(PORT, '0.0.0.0', () => {
    console.log(chalk.green(`📡 MAINFRAME ONLINE ON PORT: ${PORT}`));
});

// Load WhatsApp Core Engine with Full Command Support
store.readFromFile();
setInterval(() => store.writeToFile(), 10000);

async function startXeonBotInc() {
    try {
        let { version } = await fetchLatestBaileysVersion();
        const { state, saveCreds } = await useMultiFileAuthState(`./session`);
        const msgRetryCounterCache = new NodeCache();

        const XeonBotInc = makeWASocket({
            version,
            logger: pino({ level: 'silent' }),
            printQRInTerminal: false,
            browser: ["CYBERMUU SYSTEM", "Chrome", "1.0.0"],
            auth: {
                creds: state.creds,
                keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "fatal" }).child({ level: "fatal" })),
            },
            markOnlineOnConnect: true,
            syncFullHistory: false,
            msgRetryCounterCache,
        });

        XeonBotIncInstance = XeonBotInc;
        XeonBotInc.ev.on('creds.update', saveCreds);
        store.bind(XeonBotInc.ev);

        // This handles your incoming messages and bot commands (.menu, .alive etc)
        XeonBotInc.ev.on('messages.upsert', async chatUpdate => {
            try {
                const mek = chatUpdate.messages[0];
                if (!mek.message) return;
                mek.message = (Object.keys(mek.message)[0] === 'ephemeralMessage') ? mek.message.ephemeralMessage.message : mek.message;
                
                if (mek.key && mek.key.remoteJid === 'status@broadcast') {
                    await handleStatus(XeonBotInc, chatUpdate);
                    return;
                }
                
                await handleMessages(XeonBotInc, chatUpdate, true);
            } catch (err) {
                console.error("Command execution failure:", err);
            }
        });

        XeonBotInc.decodeJid = (jid) => {
            if (!jid) return jid;
            if (/:\d+@/gi.test(jid)) {
                let decode = jidDecode(jid) || {};
                return decode.user && decode.server && decode.user + '@' + decode.server || jid;
            } else return jid;
        };

        XeonBotInc.serializeM = (m) => smsg(XeonBotInc, m, store);

        XeonBotInc.ev.on('connection.update', async (s) => {
            const { connection, lastDisconnect } = s;
            if (connection === 'open') {
                console.log(chalk.green(`🌐 CYBERMUU LIVE: FULL COMMAND SYSTEM LOADED PROPERLY! ✅`));
            }
            if (connection === 'close') {
                const shouldReconnect = (lastDisconnect?.error)?.output?.statusCode !== DisconnectReason.loggedOut;
                if (shouldReconnect) {
                    await delay(5000);
                    startXeonBotInc();
                }
            }
        });

        XeonBotInc.ev.on('group-participants.update', async (update) => {
            await handleGroupParticipantUpdate(XeonBotInc, update);
        });

    } catch (error) {
        await delay(5000);
        startXeonBotInc();
    }
}

function reportExpressErrors(expressApp) {
    return expressApp;
}

startXeonBotInc();
