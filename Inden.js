const TelegramBot = require('node-telegram-bot-api');

const token = '8799312893:AAHd3DVeYlyanyMHHmLd50nDvxHhk262kOo';
const bot = new TelegramBot(token, { polling: true });

bot.onText(/\/start/, (msg) => {
    bot.sendMessage(msg.chat.id,
`🔥 Selamat datang di GhofurPred Bot

Bot prediksi sepak bola ⚽

Ketik:
/prediksi`);
});

bot.onText(/\/prediksi/, (msg) => {

    const data = [
        "Man City vs Arsenal = OVER 2.5",
        "Real Madrid vs Sevilla = BTTS YES",
        "Inter vs Milan = OVER CORNER"
    ];

    bot.sendMessage(msg.chat.id,
`📊 PREDIKSI HARI INI

${data.join("\n")}

🔥 Monte Carlo AI`);
});

console.log("Bot aktif");
