/*
========================================================
 WORLD FOOTBALL TELEGRAM BOT
========================================================

FITUR:
✅ Semua liga dunia otomatis
✅ Jadwal harian
✅ Max 10 match per hari
✅ Odds Over/Under
✅ BTTS
✅ Prediksi Corner
✅ Best Prediction
✅ Anti crash
✅ Anti API limit
✅ Retry otomatis
✅ Railway ready
✅ Timezone Indonesia
✅ Auto season fix
========================================================
*/

require("dotenv").config();

const TelegramBot = require("node-telegram-bot-api");
const axios = require("axios");
const moment = require("moment-timezone");

moment.tz.setDefault("Asia/Jakarta");

// =====================================================
// TELEGRAM
// =====================================================

const bot = new TelegramBot(process.env.BOT_TOKEN, {
  polling: true,
});

// =====================================================
// API CONFIG
// =====================================================

const API_KEY = process.env.FOOTBALL_API_KEY;

const API_HOST = "v3.football.api-sports.io";

const HEADERS = {
  "x-apisports-key": API_KEY,
  "x-rapidapi-host": API_HOST,
};

// =====================================================
// SAFE REQUEST
// =====================================================

async function safeRequest(url, retries = 3) {

  for (let i = 1; i <= retries; i++) {

    try {

      const response = await axios.get(url, {
        headers: HEADERS,
        timeout: 20000,
      });

      return response.data;

    } catch (err) {

      console.log(`❌ REQUEST ERROR ${i}`);

      if (err.response) {
        console.log(err.response.status);
        console.log(err.response.data);
      } else {
        console.log(err.message);
      }

      if (i === retries) {
        return null;
      }

      await delay(3000);
    }
  }
}

// =====================================================
// DELAY
// =====================================================

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// =====================================================
// SAFE SEASON
// =====================================================

function getSeason() {

  const now = moment();

  let year = now.year();

  /*
    Anti season bug 2026
  */

  if (now.month() < 6) {
    year -= 1;
  }

  return year;
}

// =====================================================
// GET ALL FIXTURES WORLD
// =====================================================

async function getWorldFixtures() {

  const from = moment().format("YYYY-MM-DD");

  const to = moment()
    .add(7, "days")
    .format("YYYY-MM-DD");

  const season = getSeason();

  /*
    Endpoint tanpa league
    = semua pertandingan dunia
  */

  const url =
    `https://${API_HOST}/fixtures` +
    `?season=${season}` +
    `&from=${from}` +
    `&to=${to}`;

  console.log("================================");
  console.log("🌍 WORLD FIXTURES");
  console.log("FROM:", from);
  console.log("TO:", to);
  console.log("SEASON:", season);
  console.log("================================");

  const data = await safeRequest(url);

  if (!data || !data.response) {
    return [];
  }

  const fixtures = [];

  data.response.forEach((match) => {

    fixtures.push({
      fixtureId: match.fixture.id,

      league: match.league.name,

      country: match.league.country,

      home: match.teams.home.name,

      away: match.teams.away.name,

      date: match.fixture.date,
    });

  });

  return fixtures;
}

// =====================================================
// GET ODDS
// =====================================================

async function getOdds(fixtureId) {

  try {

    const url =
      `https://${API_HOST}/odds` +
      `?fixture=${fixtureId}`;

    const data = await safeRequest(url);

    if (
      !data ||
      !data.response ||
      data.response.length === 0
    ) {
      return null;
    }

    const bookmakers =
      data.response[0].bookmakers || [];

    let odds = {
      over25: "-",
      under25: "-",
      bttsYes: "-",
      bttsNo: "-",
    };

    for (const bookie of bookmakers) {

      for (const bet of bookie.bets) {

        // OVER UNDER
        if (bet.name === "Goals Over/Under") {

          for (const value of bet.values) {

            if (value.value === "Over 2.5") {
              odds.over25 = value.odd;
            }

            if (value.value === "Under 2.5") {
              odds.under25 = value.odd;
            }

          }

        }

        // BTTS
        if (bet.name === "Both Teams Score") {

          for (const value of bet.values) {

            if (value.value === "Yes") {
              odds.bttsYes = value.odd;
            }

            if (value.value === "No") {
              odds.bttsNo = value.odd;
            }

          }

        }

      }

    }

    return odds;

  } catch (err) {

    console.log("ODDS ERROR:", err.message);

    return null;
  }
}

// =====================================================
// CORNER PREDICTION
// =====================================================

function predictCorner(home, away) {

  const attackingTeams = [
    "Manchester City",
    "Liverpool",
    "Arsenal",
    "Barcelona",
    "Real Madrid",
    "Bayern Munich",
    "PSG",
    "Inter",
    "Juventus",
  ];

  let total = 8;

  if (attackingTeams.includes(home)) total += 2;
  if (attackingTeams.includes(away)) total += 2;

  return `${total}-${total + 2}`;
}

// =====================================================
// BEST PREDICTION
// =====================================================

function getBestPrediction(odds) {

  if (!odds) {
    return "⚠️ No odds";
  }

  const over = parseFloat(odds.over25);

  const under = parseFloat(odds.under25);

  const btts = parseFloat(odds.bttsYes);

  if (!isNaN(over) && over <= 1.70) {
    return "🔥 OVER 2.5";
  }

  if (!isNaN(under) && under <= 1.70) {
    return "🧊 UNDER 2.5";
  }

  if (!isNaN(btts) && btts <= 1.65) {
    return "✅ BTTS YES";
  }

  return "⚖️ SAFE BET";
}

// =====================================================
// GROUP PER DAY
// =====================================================

function groupByDate(matches) {

  const grouped = {};

  matches.forEach((match) => {

    const date = moment(match.date)
      .tz("Asia/Jakarta")
      .format("YYYY-MM-DD");

    if (!grouped[date]) {
      grouped[date] = [];
    }

    grouped[date].push(match);

  });

  return grouped;
}

// =====================================================
// FORMAT MATCH
// =====================================================

function formatMatch(match, odds) {

  const time = moment(match.date)
    .tz("Asia/Jakarta")
    .format("HH:mm");

  return `
🌍 ${match.country}
🏆 ${match.league}

⚽ ${match.home}
vs
${match.away}

🕒 ${time}

📊 OVER/UNDER 2.5
⬆️ ${odds?.over25 || "-"}
⬇️ ${odds?.under25 || "-"}

📊 BTTS
✅ ${odds?.bttsYes || "-"}
❌ ${odds?.bttsNo || "-"}

🚩 Corner
📈 ${predictCorner(match.home, match.away)}

🎯 Best Prediction
${getBestPrediction(odds)}

━━━━━━━━━━━━━━`;
}

// =====================================================
// COMMAND MATCH
// =====================================================

bot.onText(/\/match/, async (msg) => {

  const chatId = msg.chat.id;

  await bot.sendMessage(
    chatId,
    "🌍 Mengambil pertandingan seluruh dunia..."
  );

  try {

    const fixtures = await getWorldFixtures();

    if (!fixtures || fixtures.length === 0) {

      return bot.sendMessage(
        chatId,
        `❌ Tidak ada pertandingan ditemukan`
      );

    }

    const grouped = groupByDate(fixtures);

    for (const date in grouped) {

      let text =
`📅 ${moment(date).format("DD MMMM YYYY")}
━━━━━━━━━━━━━━`;

      /*
        Max 10 match per hari
      */

      const dailyMatches =
        grouped[date].slice(0, 10);

      for (const match of dailyMatches) {

        console.log(
          `⚽ ${match.home} vs ${match.away}`
        );

        const odds =
          await getOdds(match.fixtureId);

        text += formatMatch(match, odds);

        await delay(1200);
      }

      /*
        Telegram safe limit
      */

      const chunks =
        text.match(/[\s\S]{1,3500}/g);

      for (const chunk of chunks) {

        await bot.sendMessage(chatId, chunk);

      }

    }

  } catch (err) {

    console.log(err.message);

    bot.sendMessage(
      chatId,
      `❌ Error

${err.message}`
    );
  }
});

// =====================================================
// START
// =====================================================

bot.onText(/\/start/, async (msg) => {

  bot.sendMessage(
    msg.chat.id,
`🤖 WORLD FOOTBALL BOT

Commands:
/match → semua pertandingan dunia
/status → status bot`
  );

});

// =====================================================
// STATUS
// =====================================================

bot.onText(/\/status/, async (msg) => {

  bot.sendMessage(
    msg.chat.id,
`✅ BOT ONLINE

🕒 ${moment().format("DD MMM YYYY HH:mm:ss")}
🌍 Asia/Jakarta`
  );

});

// =====================================================
// GLOBAL ERROR
// =====================================================

process.on("unhandledRejection", (err) => {

  console.log("UNHANDLED REJECTION");
  console.log(err);

});

process.on("uncaughtException", (err) => {

  console.log("UNCAUGHT EXCEPTION");
  console.log(err);

});

console.log("🚀 WORLD FOOTBALL BOT RUNNING...");
