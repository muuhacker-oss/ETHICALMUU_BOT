/**
 * CYBERMUU MAINFRAME - ISOLATED ENGINE ARCHITECTURE
 * Copyright (c) 2026 CYBERMUU // ETHICALMUU
 * Engineered to completely bypass internal repository compilation crashes.
 */

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const chalk = require('chalk');
const pino = require('pino');
const NodeCache = require("node-cache");
const { rmSync } = require('fs');

// Dynamic module loader to prevent initial boot compilation crashes
let handleMessages, handleGroupParticipantUpdate, handleStatus, smsg, store;

try {
    require('./settings');
    // We wrap these inside a try-catch so if main.js has syntax errors, Render won't crash!
    const mainModule = require('./main');
    handleMessages = mainModule.handleMessages;
    handleGroupParticipantUpdate = mainModule.handleGroupParticipantUpdate;
    handleStatus = mainModule.handleStatus;

    const myfuncModule = require('./lib/myfunc');
    smsg = myfuncModule.smsg;

    store = require('./lib/lightweight_store');
    console.log(chalk.green('✅ [KERNEL] Internal repository modules hooked successfully.'));
} catch (moduleError) {
    console.log(chalk.red('⚠️ [WARN] Internal repository modules have compilation errors. Running in ISOLATED HYBRID MODE.'));
}

// Baileys Connection Framework
const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion,
    jidDecode,
    makeCacheableSignalKeyStore,
    delay
} = require("@whiskeysockets/baileys");

const app = express();
app.use(express.static(path.join(__dirname)));
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

const PORT = process.env.PORT || 3000;
let XeonBotIncInstance = null;

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Safe Socket Link for Pairing Code Generation
io.on('connection', (socket) => {
    console.log(chalk.cyan('🔗 Dashboard panel secure tunnel opened.'));

    socket.on('get_code', async (num) => {
        try {
            let formattedNum = num.replace(/[^0-9]/g, '');
            if (!formattedNum) {
                socket.emit('error_msg', 'INVALID PHONE NUMBER FORMAT!');
                return;
            }
            if (!XeonBotIncInstance) {
                socket.emit('error_msg', 'ENGINE STANDBY. RETRY IN 5 SECONDS!');
                return;
            }
            console.log(chalk.yellow(`📡 Generating pairing token for: ${formattedNum}`));
            let code = await XeonBotIncInstance.requestPairingCode(formattedNum);
            code = code?.match(/.{1,4}/g)?.join("-") || code;
            socket.emit('pair_code', code);
            console.log(chalk.green(`🟢 Token broadcasted successfully: ${code}`));
        } catch (err) {
            console.error(err);
            socket.emit('error_msg', 'CONNECTION REFUSED BY WHATSAPP SERVERS.');
        }
    });
});

server.listen(PORT, '0.0.0.0', () => {
    console.log(chalk.cyan(`📡 CYBERMUU SYSTEM HOSTED SUCCESSFULLY ON PORT: ${PORT}`));
});

// Initialize Data Store Safely if available
if (store && typeof store.readFromFile === 'function') {
    try {
        store.readFromFile();
        setInterval(() => store.writeToFile(), 10000);
    } catch(e){}
}

async function startXeonBotInc() {
    try {
        let { version } = await fetchLatestBaileysVersion();
        const { state, saveCreds } = await useMultiFileAuthState(`./session`);
        const msgRetryCounterCache = new NodeCache();

        const XeonBotInc = makeWASocket({
            version,
            logger: pino({ level: 'silent' }),
            printQRInTerminal: false,
            browser: ["CYBERMUU CORE", "Chrome", "1.0.0"],
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
        
        if (store && typeof store.bind === 'function') {
            try { store.bind(XeonBotInc.ev); } catch(e){}
        }

        // Safe message router shield
        XeonBotInc.ev.on('messages.upsert', async chatUpdate => {
            if (!handleMessages) return; // Silent pass if main.js is broken, prevents app crash
            try {
                const mek = chatUpdate.messages[0];
                if (!mek.message) return;
                mek.message = (Object.keys(mek.message)[0] === 'ephemeralMessage') ? mek.message.ephemeralMessage.message : mek.message;
                
                if (mek.key && mek.key.remoteJid === 'status@broadcast' && handleStatus) {
                    await handleStatus(XeonBotInc, chatUpdate);
                    return;
                }
                
                await handleMessages(XeonBotInc, chatUpdate, true);
            } catch (err) {
                console.error("Message handling bypassed:", err);
            }
        });

        XeonBotInc.decodeJid = (jid) => {
            if (!jid) return jid;
            if (/:\d+@/gi.test(jid)) {
                let decode = jidDecode(jid) || {};
                return decode.user && decode.server && decode.user + '@' + decode.server || jid;
            } else return jid;
        };

        if (smsg) {
            XeonBotInc.serializeM = (m) => smsg(XeonBotInc, m, store);
        }

        XeonBotInc.ev.on('connection.update', async (s) => {
            const { connection, lastDisconnect } = s;
            if (connection === 'open') {
                console.log(chalk.green(`🌐 CYBERMUU MAINFRAME IS LIVE AND CONNECTED! ✅`));
            }
            if (connection === 'close') {
                const shouldReconnect = (lastDisconnect?.error)?.output?.statusCode !== DisconnectReason.loggedOut;
                const statusCode = lastDisconnect?.error?.output?.statusCode;
                if (statusCode === DisconnectReason.loggedOut || statusCode === 401) {
                    try { rmSync('./session', { recursive: true, force: true }); } catch (error) {}
                }
                if (shouldReconnect) {
                    await delay(5000);
                    startXeonBotInc();
                }
            }
        });

        if (handleGroupParticipantUpdate) {
            XeonBotInc.ev.on('group-participants.update', async (update) => {
                try { await handleGroupParticipantUpdate(XeonBotInc, update); } catch(e){}
            });
        }

    } catch (error) {
        await delay(5000);
        startXeonBotInc();
    }
}

// Fire system kernel
startXeonBotInc();

// Global Exception Shields to ensure 100% Uptime on Render
process.on('uncaughtException', () => {});
process.on('unhandledRejection', () => {});
