// commands/creator.js

const creator = {
    name: "ETHICALMUU",
    number: "+255625816690",
    bio: "Full Stack Developer & Bot Creator",
    location: "Tanzania🇹🇿",
    
    social: {
        instagram: "https://instagram.com/firstborn.06",
        github: ".https://github.com/Muuhacker", 
    },

    skills: ["JavaScript", "Node.js", "React", "Python", "MongoDB", "API Development"],
    
    services: [
        "🤖 Custom WhatsApp Bots",
        "💻 Web Development", 
        "📱 Mobile Apps",
        "⚡ API Integration",
        "🔧 Automation Tools"
    ],

    message: "Let's build something amazing together! 🚀"
};

async function creatorCommand(sock, chatId) {
    try {
        console.log('🎯 Creator command activated for:', chatId);

        // Create a cool ASCII art banner
        const banner = `
╔══════════════════════════════════════╗
║             👑 ETHICALMUU CREATOR PROFILE       ║
╚══════════════════════════════════════╝
        `.trim();

        const creatorText = `
${banner}

🌟 *ABOUT ME*

┌──────────────────────────────────────┐
│ 🤵 *Name:* ${creator.name}
│ 📱 *Contact:* ${creator.number}  
│ 📍 *Location:* ${creator.location}
│ 💼 *Bio:* ${creator.bio}
└──────────────────────────────────────┘

🔗 *CONNECT WITH ME*

┌──────────────────────────────────────┐
│ 📷 *Instagram:* ${creator.social.instagram}
│ 💻 *GitHub:* ${creator.social.github}
│ 
└──────────────────────────────────────┘

💡 *TECH STACK*

┌──────────────────────────────────────┐
│ ${creator.skills.map(skill => `▸ ${skill}`).join('\n│ ')}
└──────────────────────────────────────┘

🛠️ *SERVICES OFFERED*

┌──────────────────────────────────────┐
│ ${creator.services.map(service => `▸ ${service}`).join('\n│ ')}
└──────────────────────────────────────┘

${creator.message}

💬 *Need a custom bot or website?*
📩 *DM me for collaborations & projects!*

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        `.trim();

        console.log('🚀 Sending epic creator profile...');

        await sock.sendMessage(chatId, { 
            text: creatorText,
            contextInfo: {
                forwardingScore: 999,
                isForwarded: true,
                forwardedNewsletterMessageInfo: {
                    newsletterJid: '120363420118357923@newsletter',
                    newsletterName:`CREATOR',
                    serverMessageId: -1
                }
            }
        });

        console.log('✅ Epic creator profile delivered!');

    } catch (error) {
        console.error('💥 Creator command failed:', error);
    }
}

module.exports = creatorCommand;
