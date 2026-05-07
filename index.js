/*
====================================================
ULTIMATE WORLD FOOTBALL BOT
TOP PREDICTION VERSION
====================================================
*/

require("dotenv").config();

process.env.NTBA_FIX_350 = true;
process.env.NTBA_FIX_319 = true;

const TelegramBot = require(
  "node-telegram-bot-api"
);

const axios = require("axios");

const moment = require(
  "moment-timezone"
);

moment.tz.setDefault(
  "Asia/Jakarta"
);

// ====================================================
// ENV CHECK
// ====================================================

if (!process.env.BOT_TOKEN) {
  console.log(
    "❌ BOT_TOKEN NOT FOUND"
  );

  process.exit(1);
}

if (
  !process.env.FOOTBALL_API_KEY
) {
  console.log(
    "❌ FOOTBALL_API_KEY NOT FOUND"
  );

  process.exit(1);
}

// ====================================================
// TELEGRAM
// ====================================================

const bot = new TelegramBot(
  process.env.BOT_TOKEN,
  {
    polling: true,
  }
);

console.log(
  "✅ TELEGRAM CONNECTED"
);

// ====================================================
// API
// ====================================================

const api = axios.create({
  baseURL:
    "https://v3.football.api-sports.io",

  timeout: 20000,

  headers: {
    "x-apisports-key":
      process.env
        .FOOTBALL_API_KEY,

    Accept: "application/json",
  },
});

// ====================================================
// KEEP ALIVE
// ====================================================

setInterval(() => {
  console.log(
    "✅ BOT STILL RUNNING"
  );
}, 60000);

// ====================================================
// DELAY
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
  for (
    let i = 1;
    i <= retry;
    i++
  ) {
    try {

      console.log(
        `🌐 ${endpoint}`
      );

      const response =
        await api.get(endpoint);

      return response.data;

    } catch (err) {

      console.log(
        `❌ API ERROR ${i}`
      );

      if (err.response) {

        console.log(
          err.response.status
        );

      } else {

        console.log(
          err.message
        );

      }

      if (i === retry) {
        return null;
      }

      await delay(3000);
    }
  }
}

// ====================================================
// SEASON
// ====================================================

function getSeason() {

  const now = moment();

  let season =
    now.year();

  if (now.month() < 6) {
    season -= 1;
  }

  return season;
}

// ====================================================
// GET FIXTURES
// ====================================================

async function getFixtures(
  days = 1
) {

  const from =
    moment().format(
      "YYYY-MM-DD"
    );

  const to =
    moment()
      .add(days, "days")
      .format(
        "YYYY-MM-DD"
      );

  const endpoint =
    `/fixtures?season=${getSeason()}` +
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

  return data.response.map(
    (match) => ({
      fixtureId:
        match.fixture?.id,

      league:
        match.league?.name,

      country:
        match.league?.country,

      home:
        match.teams?.home
          ?.name,

      away:
        match.teams?.away
          ?.name,

      date:
        match.fixture?.date,
    })
  );
}

// ====================================================
// GET ODDS
// ====================================================

async function getOdds(
  fixtureId
) {
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

      return null;

    }

    const bookmakers =
      data.response[0]
        ?.bookmakers || [];

    let result = {
      over25: null,
      under25: null,
      bttsYes: null,
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
              result.over25 =
                parseFloat(
                  item.odd
                );
            }

            if (
              item.value ===
              "Under 2.5"
            ) {
              result.under25 =
                parseFloat(
                  item.odd
                );
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
              item.value ===
              "Yes"
            ) {
              result.bttsYes =
                parseFloat(
                  item.odd
                );
            }

          }

        }

      }

    }

    return result;

  } catch (err) {

    console.log(
      err.message
    );

    return null;
  }
}

// ====================================================
// PREDICTION ENGINE
// ====================================================

function getPrediction(
  odds
) {

  if (!odds) {
    return null;
  }

  if (
    odds.over25 &&
    odds.over25 <= 1.65
  ) {

    return {
      type:
        "🔥 OVER 2.5",

      score:
        100 -
        odds.over25 * 10,
    };
  }

  if (
    odds.under25 &&
    odds.under25 <= 1.65
  ) {

    return {
      type:
        "🧊 UNDER 2.5",

      score:
        100 -
        odds.under25 * 10,
    };
  }

  if (
    odds.bttsYes &&
    odds.bttsYes <= 1.70
  ) {

    return {
      type:
        "✅ BTTS YES",

      score:
        100 -
        odds.bttsYes * 10,
    };
  }

  return null;
}

// ====================================================
// TOP PREDICTIONS
// ====================================================

async function getTopPredictions(
  days = 1
) {

  const fixtures =
    await getFixtures(
      days
    );

  let results = [];

  for (const match of fixtures.slice(
    0,
    25
  )) {

    const odds =
      await getOdds(
        match.fixtureId
      );

    const prediction =
      getPrediction(
        odds
      );

    if (prediction) {

      results.push({
        ...match,

        prediction:
          prediction.type,

        score:
          prediction.score,

        odds,
      });

    }

    await delay(1000);
  }

  results.sort(
    (a, b) =>
      b.score - a.score
  );

  return results.slice(0, 10);
}

// ====================================================
// FORMAT
// ====================================================

function formatPrediction(
  match
) {

  return `
🌍 ${match.country}
🏆 ${match.league}

⚽ ${match.home}
vs
${match.away}

🕒 ${moment(
  match.date
)
  .tz(
    "Asia/Jakarta"
  )
  .format(
    "DD MMM HH:mm"
  )}

🎯 ${match.prediction}

📊 Odds
⬆️ Over : ${match.odds.over25}
⬇️ Under : ${match.odds.under25}
✅ BTTS : ${match.odds.bttsYes}

━━━━━━━━━━━━━━
`;
}

// ====================================================
// MENU
// ====================================================

function mainMenu() {

  return {
    reply_markup: {
      keyboard: [
        [
          "🔥 Prediksi Hari Ini",
        ],

        [
          "📅 Prediksi Besok",
        ],

        [
          "🌍 Top 1 Minggu",
        ],

        [
          "📡 Status Bot",
        ],
      ],

      resize_keyboard: true,
    },
  };
}

// ====================================================
// START
// ====================================================

bot.onText(
  /\/start/,
  async (msg) => {

    await bot.sendMessage(
      msg.chat.id,

`🤖 WORLD FOOTBALL BOT

MENU PREDIKSI TERSEDIA 👇`,

      mainMenu()
    );

  }
);

// ====================================================
// STATUS
// ====================================================

bot.onText(
  /\/status/,
  async (msg) => {

    await bot.sendMessage(
      msg.chat.id,

`✅ BOT ONLINE

🕒 ${moment().format(
  "DD MMMM YYYY HH:mm:ss"
)}

🌍 API CONNECTED`
    );

  }
);

// ====================================================
// TODAY
// ====================================================

bot.on(
  "message",
  async (msg) => {

    const chatId =
      msg.chat.id;

    const text =
      msg.text;

    // TODAY

    if (
      text ===
      "🔥 Prediksi Hari Ini"
    ) {

      await bot.sendMessage(
        chatId,
        "🔄 Loading top predictions today..."
      );

      const matches =
        await getTopPredictions(
          1
        );

      if (
        matches.length === 0
      ) {

        return bot.sendMessage(
          chatId,
          "❌ Tidak ada prediksi"
        );

      }

      let result =
`🔥 TOP PREDIKSI HARI INI

━━━━━━━━━━━━━━
`;

      matches.forEach(
        (match) => {

          result +=
            formatPrediction(
              match
            );

        }
      );

      return bot.sendMessage(
        chatId,
        result
      );
    }

    // TOMORROW

    if (
      text ===
      "📅 Prediksi Besok"
    ) {

      await bot.sendMessage(
        chatId,
        "🔄 Loading predictions tomorrow..."
      );

      const matches =
        await getTopPredictions(
          2
        );

      let result =
`📅 TOP PREDIKSI BESOK

━━━━━━━━━━━━━━
`;

      matches.forEach(
        (match) => {

          result +=
            formatPrediction(
              match
            );

        }
      );

      return bot.sendMessage(
        chatId,
        result
      );
    }

    // WEEK

    if (
      text ===
      "🌍 Top 1 Minggu"
    ) {

      await bot.sendMessage(
        chatId,
        "🔄 Loading weekly predictions..."
      );

      const matches =
        await getTopPredictions(
          7
        );

      let result =
`🌍 TOP PREDIKSI 1 MINGGU

━━━━━━━━━━━━━━
`;

      matches.forEach(
        (match) => {

          result +=
            formatPrediction(
              match
            );

        }
      );

      return bot.sendMessage(
        chatId,
        result
      );
    }

    // STATUS

    if (
      text ===
      "📡 Status Bot"
    ) {

      return bot.sendMessage(
        chatId,

`✅ BOT ONLINE

🕒 ${moment().format(
  "DD MMM YYYY HH:mm:ss"
)}

🌍 API READY`
      );
    }
  }
);

// ====================================================
// ERROR
// ====================================================

bot.on(
  "polling_error",
  (err) => {

    console.log(
      "❌ POLLING ERROR"
    );

    console.log(
      err.message
    );

  }
);

process.on(
  "unhandledRejection",
  (err) => {

    console.log(err);

  }
);

process.on(
  "uncaughtException",
  (err) => {

    console.log(err);

  }
);

console.log(
  "🚀 WORLD FOOTBALL BOT RUNNING"
);
