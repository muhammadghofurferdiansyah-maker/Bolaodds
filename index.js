/*
====================================================
ULTIMATE WORLD FOOTBALL BOT
STABLE + RAILWAY READY + API FOOTBALL FIX
====================================================
*/

require("dotenv").config();

const TelegramBot = require("node-telegram-bot-api");
const axios = require("axios");
const moment = require("moment-timezone");

moment.tz.setDefault("Asia/Jakarta");

// ====================================================
// ENV VALIDATION
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
// TELEGRAM BOT
// ====================================================

const bot = new TelegramBot(
  process.env.BOT_TOKEN,
  {
    polling: true,
  }
);

console.log("✅ TELEGRAM CONNECTED");

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
// SAFE DELAY
// ====================================================

function delay(ms) {
  return new Promise((r) =>
    setTimeout(r, ms)
  );
}

// ====================================================
// SAFE REQUEST
// ====================================================

async function safeGet(
  endpoint,
  retry = 3
) {
  for (let i = 1; i <= retry; i++) {
    try {

      console.log(
        `🌐 REQUEST: ${endpoint}`
      );

      const response =
        await api.get(endpoint);

      if (!response.data) {
        throw new Error(
          "EMPTY RESPONSE"
        );
      }

      console.log("✅ API SUCCESS");

      return response.data;

    } catch (err) {

      console.log(
        `❌ API ERROR RETRY ${i}`
      );

      if (err.response) {

        console.log(
          "STATUS:",
          err.response.status
        );

        console.log(
          JSON.stringify(
            err.response.data
          )
        );

      } else {

        console.log(err.message);

      }

      if (i === retry) {
        return null;
      }

      await delay(2500);
    }
  }
}

// ====================================================
// CURRENT SEASON
// ====================================================

function getSeason() {

  const now = moment();

  let season = now.year();

  if (now.month() < 6) {
    season -= 1;
  }

  return season;
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

  const season =
    getSeason();

  const endpoint =
    `/fixtures?season=${season}` +
    `&from=${from}` +
    `&to=${to}` +
    `&timezone=Asia/Jakarta`;

  const data =
    await safeGet(endpoint);

  if (
    !data ||
    !data.response
  ) {
    return [];
  }

  console.log(
    `✅ FIXTURES FOUND: ${data.response.length}`
  );

  return data.response.map(
    (match) => ({
      fixtureId:
        match.fixture?.id,

      league:
        match.league?.name ||
        "Unknown League",

      country:
        match.league?.country ||
        "Unknown Country",

      home:
        match.teams?.home?.name ||
        "Home",

      away:
        match.teams?.away?.name ||
        "Away",

      date:
        match.fixture?.date,

      status:
        match.fixture?.status
          ?.short || "NS",
    })
  );
}

// ====================================================
// GET ODDS
// ====================================================

async function getOdds(fixtureId) {

  try {

    const endpoint =
      `/odds?fixture=${fixtureId}&bookmaker=8`;

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
      data.response[0]
        ?.bookmakers || [];

    let odds = {
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
              item.value ===
              "Over 2.5"
            ) {
              odds.over25 =
                item.odd;
            }

            if (
              item.value ===
              "Under 2.5"
            ) {
              odds.under25 =
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

            if (
              item.value === "Yes"
            ) {
              odds.bttsYes =
                item.odd;
            }

            if (
              item.value === "No"
            ) {
              odds.bttsNo =
                item.odd;
            }

          }

        }

      }

    }

    return odds;

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
// SMART PREDICTION
// ====================================================

function getPrediction(odds) {

  const over =
    parseFloat(odds.over25);

  const under =
    parseFloat(odds.under25);

  const btts =
    parseFloat(odds.bttsYes);

  if (
    !isNaN(over) &&
    over <= 1.65
  ) {
    return "🔥 STRONG OVER 2.5";
  }

  if (
    !isNaN(under) &&
    under <= 1.65
  ) {
    return "🧊 STRONG UNDER 2.5";
  }

  if (
    !isNaN(btts) &&
    btts <= 1.70
  ) {
    return "✅ BTTS YES";
  }

  return "⚖️ SAFE BET";
}

// ====================================================
// GROUP MATCHES
// ====================================================

function groupMatches(matches) {

  const grouped = {};

  matches.forEach((match) => {

    const date =
      moment(match.date)
        .format("YYYY-MM-DD");

    if (!grouped[date]) {
      grouped[date] = [];
    }

    grouped[date].push(match);

  });

  return grouped;
}

// ====================================================
// FORMAT MATCH
// ====================================================

function formatMatch(
  match,
  odds
) {

  const time =
    moment(match.date)
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
⬆️ Over : ${odds.over25}
⬇️ Under : ${odds.under25}

📊 BOTH TEAMS SCORE
✅ Yes : ${odds.bttsYes}
❌ No : ${odds.bttsNo}

🎯 Prediction
${getPrediction(odds)}

━━━━━━━━━━━━━━
`;
}

// ====================================================
// START COMMAND
// ====================================================

bot.onText(/\/start/, async (msg) => {

  await bot.sendMessage(
    msg.chat.id,

`🤖 WORLD FOOTBALL BOT

Commands:

/match
/status

Powered by API-Football`
  );

});

// ====================================================
// STATUS
// ====================================================

bot.onText(/\/status/, async (msg) => {

  await bot.sendMessage(
    msg.chat.id,

`✅ BOT ONLINE

🕒 ${moment().format(
  "DD MMMM YYYY HH:mm:ss"
)}

🌍 API FOOTBALL CONNECTED`
  );

});

// ====================================================
// MATCH COMMAND
// ====================================================

bot.onText(/\/match/, async (msg) => {

  const chatId =
    msg.chat.id;

  await bot.sendMessage(
    chatId,
    "🔄 Loading football matches..."
  );

  try {

    const fixtures =
      await getFixtures();

    if (
      fixtures.length === 0
    ) {

      return bot.sendMessage(
        chatId,
        "❌ Tidak ada pertandingan ditemukan"
      );

    }

    const grouped =
      groupMatches(fixtures);

    for (const date in grouped) {

      let text =
`📅 ${moment(date).format(
  "DD MMMM YYYY"
)}

━━━━━━━━━━━━━━
`;

      // LIMIT AGAR TIDAK KENA RATE LIMIT
      const matches =
        grouped[date].slice(0, 5);

      for (const match of matches) {

        const odds =
          await getOdds(
            match.fixtureId
          );

        text += formatMatch(
          match,
          odds
        );

        await delay(1200);
      }

      const chunks =
        text.match(
          /[\s\S]{1,3500}/g
        );

      for (const chunk of chunks) {

        await bot.sendMessage(
          chatId,
          chunk
        );

      }

    }

  } catch (err) {

    console.log(err);

    await bot.sendMessage(
      chatId,

`❌ BOT ERROR

${err.message}`
    );
  }
});

// ====================================================
// POLLING ERROR
// ====================================================

bot.on(
  "polling_error",
  (err) => {

    console.log(
      "❌ POLLING ERROR:",
      err.message
    );

  }
);

// ====================================================
// GLOBAL ERROR
// ====================================================

process.on(
  "unhandledRejection",
  (err) => {

    console.log(
      "❌ UNHANDLED REJECTION:"
    );

    console.log(err);

  }
);

process.on(
  "uncaughtException",
  (err) => {

    console.log(
      "❌ UNCAUGHT EXCEPTION:"
    );

    console.log(err);

  }
);

// ====================================================
// START LOG
// ====================================================

console.log(
  "🚀 WORLD FOOTBALL BOT RUNNING"
);
