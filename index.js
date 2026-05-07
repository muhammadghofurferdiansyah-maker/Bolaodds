/*
====================================================
 STABLE WORLD FOOTBALL BOT
 FIX ALL API ISSUES
====================================================
*/

require("dotenv").config();

const TelegramBot = require("node-telegram-bot-api");
const axios = require("axios");
const moment = require("moment-timezone");

moment.tz.setDefault("Asia/Jakarta");

// ====================================================
// VALIDATE ENV
// ====================================================

if (!process.env.BOT_TOKEN) {
  console.log("❌ BOT_TOKEN NOT FOUND");
  process.exit(1);
}

if (!process.env.FOOTBALL_API_KEY) {
  console.log("❌ FOOTBALL_API_KEY NOT FOUND");
  process.exit(1);
}

// ====================================================
// TELEGRAM
// ====================================================

const bot = new TelegramBot(
  process.env.BOT_TOKEN,
  {
    polling: {
      interval: 300,
      autoStart: true,
      params: {
        timeout: 10,
      },
    },
  }
);

// ====================================================
// API CONFIG
// ====================================================

const API_KEY = process.env.FOOTBALL_API_KEY;

const API_BASE =
  "https://v3.football.api-sports.io";

// ====================================================
// AXIOS INSTANCE
// ====================================================

const api = axios.create({
  baseURL: API_BASE,

  timeout: 20000,

  headers: {
    "x-apisports-key": API_KEY,
    Accept: "application/json",
  },
});

// ====================================================
// SAFE REQUEST
// ====================================================

async function safeGet(url, retry = 3) {

  for (let i = 1; i <= retry; i++) {

    try {

      console.log(`🌐 REQUEST: ${url}`);

      const response = await api.get(url);

      // LOG RESPONSE
      console.log("✅ API CONNECTED");

      if (!response.data) {
        throw new Error("EMPTY RESPONSE");
      }

      return response.data;

    } catch (err) {

      console.log(`❌ API ERROR ${i}`);

      if (err.response) {

        console.log(
          "STATUS:",
          err.response.status
        );

        console.log(
          "DATA:",
          JSON.stringify(err.response.data)
        );

      } else {

        console.log(err.message);

      }

      if (i === retry) {
        return null;
      }

      await delay(3000);
    }
  }
}

// ====================================================
// DELAY
// ====================================================

function delay(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// ====================================================
// SAFE SEASON
// ====================================================

function getSeason() {

  const now = moment();

  let year = now.year();

  if (now.month() < 6) {
    year -= 1;
  }

  return year;
}

// ====================================================
// GET FIXTURES
// ====================================================

async function getFixtures() {

  const from =
    moment().format("YYYY-MM-DD");

  const to =
    moment()
      .add(7, "days")
      .format("YYYY-MM-DD");

  const season = getSeason();

  const endpoint =
    `/fixtures?season=${season}` +
    `&from=${from}` +
    `&to=${to}`;

  const data = await safeGet(endpoint);

  if (!data) {
    return [];
  }

  if (data.errors) {

    console.log("❌ API ERRORS");
    console.log(data.errors);

  }

  if (!data.response) {
    return [];
  }

  console.log(
    `✅ FIXTURES: ${data.response.length}`
  );

  return data.response.map((match) => ({
    fixtureId: match.fixture.id,

    league:
      match.league?.name || "Unknown",

    country:
      match.league?.country || "Unknown",

    home:
      match.teams?.home?.name || "Home",

    away:
      match.teams?.away?.name || "Away",

    date:
      match.fixture?.date || null,
  }));
}

// ====================================================
// GET ODDS
// ====================================================

async function getOdds(fixtureId) {

  try {

    const endpoint =
      `/odds?fixture=${fixtureId}`;

    const data =
      await safeGet(endpoint);

    if (
      !data ||
      !data.response ||
      data.response.length === 0
    ) {

      return {
        over25: "-",
        under25: "-",
        bttsYes: "-",
        bttsNo: "-",
      };

    }

    const bookmakers =
      data.response[0]?.bookmakers || [];

    let result = {
      over25: "-",
      under25: "-",
      bttsYes: "-",
      bttsNo: "-",
    };

    for (const bookmaker of bookmakers) {

      for (const bet of bookmaker.bets) {

        // OVER UNDER
        if (
          bet.name ===
          "Goals Over/Under"
        ) {

          for (const item of bet.values) {

            if (
              item.value === "Over 2.5"
            ) {
              result.over25 =
                item.odd;
            }

            if (
              item.value === "Under 2.5"
            ) {
              result.under25 =
                item.odd;
            }

          }

        }

        // BTTS
        if (
          bet.name ===
          "Both Teams Score"
        ) {

          for (const item of bet.values) {

            if (item.value === "Yes") {
              result.bttsYes =
                item.odd;
            }

            if (item.value === "No") {
              result.bttsNo =
                item.odd;
            }

          }

        }

      }

    }

    return result;

  } catch (err) {

    console.log(
      "❌ ODDS ERROR:",
      err.message
    );

    return {
      over25: "-",
      under25: "-",
      bttsYes: "-",
      bttsNo: "-",
    };
  }
}

// ====================================================
// PREDICTION
// ====================================================

function getPrediction(odds) {

  const over =
    parseFloat(odds.over25);

  const under =
    parseFloat(odds.under25);

  const btts =
    parseFloat(odds.bttsYes);

  if (!isNaN(over) && over <= 1.70) {
    return "🔥 OVER 2.5";
  }

  if (!isNaN(under) && under <= 1.70) {
    return "🧊 UNDER 2.5";
  }

  if (!isNaN(btts) && btts <= 1.70) {
    return "✅ BTTS YES";
  }

  return "⚖️ SAFE BET";
}

// ====================================================
// GROUP DATE
// ====================================================

function groupMatches(matches) {

  const grouped = {};

  matches.forEach((match) => {

    const date = moment(match.date)
      .format("YYYY-MM-DD");

    if (!grouped[date]) {
      grouped[date] = [];
    }

    grouped[date].push(match);

  });

  return grouped;
}

// ====================================================
// FORMAT
// ====================================================

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

📊 O/U 2.5
⬆️ ${odds.over25}
⬇️ ${odds.under25}

📊 BTTS
✅ ${odds.bttsYes}
❌ ${odds.bttsNo}

🎯 Prediction
${getPrediction(odds)}

━━━━━━━━━━━━━━`;
}

// ====================================================
// COMMAND START
// ====================================================

bot.onText(/\/start/, async (msg) => {

  bot.sendMessage(
    msg.chat.id,
`🤖 WORLD FOOTBALL BOT

Commands:
/match
/status`
  );

});

// ====================================================
// STATUS
// ====================================================

bot.onText(/\/status/, async (msg) => {

  bot.sendMessage(
    msg.chat.id,
`✅ BOT ONLINE

🕒 ${moment().format(
  "DD MMM YYYY HH:mm:ss"
)}

🌍 API CONNECTED`
  );

});

// ====================================================
// MATCH
// ====================================================

bot.onText(/\/match/, async (msg) => {

  const chatId = msg.chat.id;

  await bot.sendMessage(
    chatId,
    "🔄 Loading matches..."
  );

  try {

    const fixtures =
      await getFixtures();

    if (fixtures.length === 0) {

      return bot.sendMessage(
        chatId,
        `❌ Tidak ada data pertandingan`
      );

    }

    const grouped =
      groupMatches(fixtures);

    for (const date in grouped) {

      let text =
`📅 ${moment(date).format(
  "DD MMMM YYYY"
)}
━━━━━━━━━━━━━━`;

      const matches =
        grouped[date].slice(0, 10);

      for (const match of matches) {

        const odds =
          await getOdds(match.fixtureId);

        text += formatMatch(
          match,
          odds
        );

        await delay(1000);
      }

      const chunks =
        text.match(/[\s\S]{1,3500}/g);

      for (const chunk of chunks) {

        await bot.sendMessage(
          chatId,
          chunk
        );

      }

    }

  } catch (err) {

    console.log(err);

    bot.sendMessage(
      chatId,
      `❌ BOT ERROR

${err.message}`
    );
  }
});

// ====================================================
// ERROR HANDLER
// ====================================================

bot.on("polling_error", (err) => {

  console.log(
    "❌ POLLING ERROR:",
    err.message
  );

});

process.on(
  "unhandledRejection",
  (err) => {

    console.log(
      "❌ UNHANDLED:",
      err
    );

  }
);

process.on(
  "uncaughtException",
  (err) => {

    console.log(
      "❌ UNCAUGHT:",
      err
    );

  }
);

console.log(
  "🚀 WORLD FOOTBALL BOT RUNNING"
);
