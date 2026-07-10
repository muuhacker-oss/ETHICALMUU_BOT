/**
 * CYBERMUU - A WhatsApp Bot
 * Copyright (c) 2026 ETHICALMUU Professor
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License.
 */

const express = require('express')
const http = require('http')
const { Server } = require('socket.io')
const path = require('path')

// Ruhusu Express isome picha na mafile ya folda zako (kama assets, media nk)
app.use(express.static(path.join(__dirname)));

const app = express()
const server = http.createServer(app)
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
})

// Render inahitaji port 3000 na ip 0.0.0.0 ipatikane haraka sana!
const PORT = process.env.PORT || 3000

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'))
})

// WASHA SEVA KWANZA PAPO HAPO ILI RENDER IPATE PORT TIMEOUT YA HARAKA
server.listen(PORT, '0.0.0.0', () => {
    console.log(`📡 WEB SERVER ACTIVE ON PORT: ${PORT} - READY FOR PORT SCAN!`)
})

// NESTED BOT LOGIC - INASUBIRI SEKUNDE 3 ILI SEVA ITHIBITIKE KWANZA KULE RENDER
setTimeout(() => {
    console.log(`🤖 Starting CYBERMUU Bot Engine core triggers...`)
    startBotEngine()
}, 3000)

// ======================================================================

function startBotEngine() {
    require('./settings')
    const { Boom } = require('@hapi/boom')
    const fs = require('fs')
    const chalk = require('chalk')
    const FileType = require('file-type')
    const axios = require('axios')
    const { handleMessages, handleGroupParticipantUpdate, handleStatus } = require('./main');
    const PhoneNumber = require('awesome-phonenumber')
    const { imageToWebp, videoToWebp, writeExifImg, writeExifVid } = require('./lib/exif')
    const { smsg, isUrl, generateMessageTag, getBuffer, getSizeMedia, fetch, await, sleep, reSize } = require('./lib/myfunc')
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
    } = require("@whiskeysockets/baileys")
    const NodeCache = require("node-cache")
    const pino = require("pino")
    const readline = require("readline")
    const { parsePhoneNumber } = require("libphonenumber-js")
    const { PHONENUMBER_MCC } = require('@whiskeysockets/baileys/lib/Utils/generics')
    const { rmSync, existsSync } = require('fs')
    const { join } = require('path')

    const store = require('./lib/lightweight_store')
    store.readFromFile()
    const settings = require('./settings')
    setInterval(() => store.writeToFile(), settings.storeWriteInterval || 10000)

    // Memory monitoring
    setInterval(() => {
        const used = process.memoryUsage().rss / 1024 / 1024
        if (used > 400) {
            console.log('⚠️ RAM too high (>400MB), restarting bot...')
            process.exit(1)
        }
    }, 30_000)

    let phoneNumber = "" 
    let owner = JSON.parse(fs.readFileSync('./data/owner.json'))

    global.botname = "CYBERMUU"
    global.themeemoji = "•"

    async function startXeonBotInc() {
        try {
            let { version, isLatest } = await fetchLatestBaileysVersion()
            const { state, saveCreds } = await useMultiFileAuthState(`./session`)
            const msgRetryCounterCache = new NodeCache()

            const XeonBotInc = makeWASocket({
                version,
                logger: pino({ level: 'silent' }),
                printQRInTerminal: false, 
                browser: ["Ubuntu", "Chrome", "20.0.04"],
                auth: {
                    creds: state.creds,
                    keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "fatal" }).child({ level: "fatal" })),
                },
                markOnlineOnConnect: true,
                generateHighQualityLinkPreview: true,
                syncFullHistory: false,
                getMessage: async (key) => {
                    let jid = jidNormalizedUser(key.remoteJid)
                    let msg = await store.loadMessage(jid, key.id)
                    return msg?.message || ""
                },
                msgRetryCounterCache,
                defaultQueryTimeoutMs: 60000,
                connectTimeoutMs: 60000,
                keepAliveIntervalMs: 10000,
            })

            // Web Panel Live Request Event
            io.on('connection', (socket) => {
                socket.on('get_code', async (num) => {
                    try {
                        let formattedNum = num.replace(/[^0-9]/g, '')
                        const pn = require('awesome-phonenumber')
                        if (!pn('+' + formattedNum).isValid()) {
                            socket.emit('error_msg', 'Invalid Number! Use format: 255771234567')
                            return
                        }
                        
                        let code = await XeonBotInc.requestPairingCode(formattedNum)
                        code = code?.match(/.{1,4}/g)?.join("-") || code
                        
                        socket.emit('pair_code', code)
                        console.log(chalk.black(chalk.bgGreen(`[DASHBOARD] Code Generated for ${formattedNum}: ${code}`)))
                    } catch (err) {
                        console.error(err)
                        socket.emit('error_msg', 'Server Connection Error. Try Again!')
                    }
                })
            })

            XeonBotInc.get_io = () => io;

            XeonBotInc.ev.on('creds.update', saveCreds)
            store.bind(XeonBotInc.ev)

            XeonBotInc.ev.on('messages.upsert', async chatUpdate => {
                try {
                    const mek = chatUpdate.messages[0]
                    if (!mek.message) return
                    mek.message = (Object.keys(mek.message)[0] === 'ephemeralMessage') ? mek.message.ephemeralMessage.message : mek.message
                    if (mek.key && mek.key.remoteJid === 'status@broadcast') {
                        await handleStatus(XeonBotInc, chatUpdate);
                        return;
                    }
                    if (!XeonBotInc.public && !mek.key.fromMe && chatUpdate.type === 'notify') {
                        const isGroup = mek.key?.remoteJid?.endsWith('@g.us')
                        if (!isGroup) return 
                    }
                    if (mek.key.id.startsWith('BAE5') && mek.key.id.length === 16) return

                    if (XeonBotInc?.msgRetryCounterCache) {
                        XeonBotInc.msgRetryCounterCache.clear()
                    }

                    try {
                        await handleMessages(XeonBotInc, chatUpdate, true)
                    } catch (err) {
                        console.error("Error in handleMessages:", err)
                    }
                } catch (err) {
                    console.error("Error in messages.upsert:", err)
                }
            })

            XeonBotInc.decodeJid = (jid) => {
                if (!jid) return jid
                if (/:\d+@/gi.test(jid)) {
                    let decode = jidDecode(jid) || {}
                    return decode.user && decode.server && decode.user + '@' + decode.server || jid
                } else return jid
                }

            XeonBotInc.ev.on('contacts.update', update => {
                for (let contact of update) {
                    let id = XeonBotInc.decodeJid(contact.id)
                    if (store && store.contacts) store.contacts[id] = { id, name: contact.notify }
                }
            })

            XeonBotInc.getName = (jid, withoutContact = false) => {
                id = XeonBotInc.decodeJid(jid)
                withoutContact = XeonBotInc.withoutContact || withoutContact
                let v
                if (id.endsWith("@g.us")) return new Promise(async (resolve) => {
                    v = store.contacts[id] || {}
                    if (!(v.name || v.subject)) v = XeonBotInc.groupMetadata(id) || {}
                    resolve(v.name || v.subject || PhoneNumber('+' + id.replace('@s.whatsapp.net', '')).getNumber('international'))
                })
                else v = id === '0@s.whatsapp.net' ? { id, name: 'WhatsApp' } : id === XeonBotInc.decodeJid(XeonBotInc.user.id) ? XeonBotInc.user : (store.contacts[id] || {})
                return (withoutContact ? '' : v.name) || v.subject || v.verifiedName || PhoneNumber('+' + jid.replace('@s.whatsapp.net', '')).getNumber('international')
            }

            XeonBotInc.public = true
            XeonBotInc.serializeM = (m) => smsg(XeonBotInc, m, store)

            XeonBotInc.ev.on('connection.update', async (s) => {
                const { connection, lastDisconnect } = s
                if (connection === 'connecting') console.log(chalk.yellow('🔄 Connecting to WhatsApp...'))

                if (connection == "open") {
                    console.log(chalk.green(`🌿 Connected to WhatsApp Successfully! ✅`))
                    try {
                        const botNumber = XeonBotInc.user.id.split(':')[0] + '@s.whatsapp.net';
                        await XeonBotInc.sendMessage(botNumber, {
                            text: `🤖 CYBERMUU Connected Successfully!\n\n✅ Status: Online and Ready!`,
                        });
                    } catch (error) {
                        console.error('Error sending connection message:', error.message)
                    }
                }

                if (connection === 'close') {
                    const shouldReconnect = (lastDisconnect?.error)?.output?.statusCode !== DisconnectReason.loggedOut
                    const statusCode = lastDisconnect?.error?.output?.statusCode
                    console.log(chalk.red(`Connection closed. Reconnecting: ${shouldReconnect}`))
                    if (statusCode === DisconnectReason.loggedOut || statusCode === 401) {
                        try { rmSync('./session', { recursive: true, force: true }) } catch (error) {}
                    }
                    if (shouldReconnect) {
                        await delay(5000)
                        startXeonBotInc()
                    }
                }
            })

            XeonBotInc.ev.on('group-participants.update', async (update) => {
                await handleGroupParticipantUpdate(XeonBotInc, update);
            });

            return XeonBotInc
        } catch (error) {
            console.error('Error in startXeonBotInc:', error)
            await delay(5000)
            startXeonBotInc()
        }
    }

    startXeonBotInc().catch(error => {
        process.exit(1)
    })
}

process.on('uncaughtException', (err) => {})
process.on('unhandledRejection', (err) => {})
