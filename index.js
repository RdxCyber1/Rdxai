const { default: makeWASocket, useMultiFileAuthState } = require('@whiskeysockets/baileys');
const { OpenAI } = require('openai');
const qrcode = require('qrcode-terminal');

const OPENAI_API_KEY = "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";  // अपनी OpenAI API Key डालो

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('./auth_info');
    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: true
    });

    sock.ev.on('creds.update', saveCreds);
    sock.ev.on('connection.update', (update) => {
        const { connection, qr } = update;
        
        if (qr) {
            console.log("QR Code स्कैन करो:");
            qrcode.generate(qr, { small: true });
        }

        if (connection === 'open') {
            console.log('✅ WhatsApp बॉट कनेक्ट हो गया!');
        }
    });

    sock.ev.on('messages.upsert', async ({ messages }) => {
        await Promise.all(messages.map(async (msg) => {
            if (!msg.message || msg.key.fromMe) return;

            const sender = msg.key.remoteJid;
            const text = msg.message.conversation || msg.message.extendedTextMessage?.text || '';

            console.log(`📩 मैसेज मिला: ${text} (From: ${sender})`);

            await sock.sendPresenceUpdate('composing', sender);

            // OpenAI से जवाब लो
            try {
                const response = await getOpenAIResponse(text);
                await sock.sendMessage(sender, { text: response });
            } catch (error) {
                console.error(`❌ ${sender} के लिए मैसेज प्रोसेस करने में समस्या:`, error);
            }
        }));
    });
}

async function getOpenAIResponse(prompt) {
    const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

    try {
        const response = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [{ role: 'user', content: prompt }]
        });
        return response.choices[0].message.content;
    } catch (error) {
        console.error('❌ OpenAI API Error:', error);
        return 'मुझे आपके प्रश्न का उत्तर देने में समस्या हो रही है।';
    }
}

startBot();


