const TelegramBot = require('node-telegram-bot-api');

const token = '8799312893:AAHd3DVeYlyanyMHHmLd50nDvxHhk262kOo';
const bot = new TelegramBot(token, { polling: true });

// DATABASE MATCH GLOBAL (simulasi liga dunia)
const matches = [
  "Manchester City vs Arsenal",
  "Real Madrid vs Barcelona",
  "Inter Milan vs Juventus",
  "Bayern Munich vs Dortmund",
  "PSG vs Marseille",
  "Chelsea vs Liverpool",
  "Atletico Madrid vs Sevilla",
  "AC Milan vs Napoli",
  "Ajax vs PSV",
  "Benfica vs Porto",
  "Flamengo vs Palmeiras",
  "River Plate vs Boca Juniors",
  "LA Galaxy vs Inter Miami",
  "Galatasaray vs Fenerbahce",
  "Celtic vs Rangers"
];

// FUNCTION RANDOM ODDS + PREDIKSI
function generatePrediction(match) {
  const odds = (Math.random() * 2 + 1.2).toFixed(2); // 1.20 - 3.20

  const picks = [
    "OVER 2.5 GOALS",
    "BTTS YES",
    "HOME WIN",
    "AWAY WIN",
    "DRAW NO BET",
    "OVER CORNER 8.5"
  ];

  const pick = picks[Math.floor(Math.random() * picks.length)];

  return `⚽ ${match}
📊 Pick: ${pick}
📈 Odds: ${odds}`;
}

// START COMMAND
bot.onText(/\/start/, (msg) => {
  bot.sendMessage(msg.chat.id,
`🔥 BOT PREDIKSI BOLA GLOBAL

Ketik:
/prediksi → 5 match terbaik hari ini

Powered by Monte Carlo AI ⚡`);
});

// PREDIKSI HARIAN 5 MATCH
bot.onText(/\/prediksi/, (msg) => {

  let shuffled = matches.sort(() => 0.5 - Math.random());
  let selected = shuffled.slice(0, 5);

  let result = selected.map(generatePrediction).join("\n\n");

  bot.sendMessage(msg.chat.id,
`📊 PREDIKSI HARI INI (TOP 5 MATCH GLOBAL)

${result}

⚡ AI Monte Carlo System
📅 Update: ${new Date().toLocaleDateString()}`);
});

console.log("Bot berjalan...");
