const {
  Client,
  GatewayIntentBits,
  Partials
} = require('discord.js');

const axios = require('axios');
const express = require('express');
const Parser = require('rss-parser');

const parser = new Parser();

const app = express();

app.get('/', (req, res) => {
  res.send('Nim AI Bot is alive!');
});

app.listen(3000, () => {
  console.log('Server running');
});

const OWNER_ID = '691198014211227679';
const PRINCESS_ID = '665994636484935690';
const ALLY_ID = '715596929332936735';

const USERS = [
  OWNER_ID,
  PRINCESS_ID,
  ALLY_ID
];

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages
  ],

  partials: [
    Partials.Channel
  ]
});

const memory = {};

let lastOnceHumanTitle = '';

client.once('ready', async () => {

  console.log(`Logged in as ${client.user.tag}`);

  startOnceHumanTracker();

  // TEST SEND CURRENT UPDATE
  await sendOnceHumanUpdate(true);
});

async function sendOnceHumanUpdate(forceSend = false) {

  try {

    const feed = await parser.parseURL(
      'https://store.steampowered.com/feeds/news/app/2139460/'
    );

    const latest = feed.items[0];

    if (!latest) return;

    // ANTI SPAM
    if (
      latest.title === lastOnceHumanTitle &&
      !forceSend
    ) {
      return;
    }

    lastOnceHumanTitle = latest.title;

    const rawHTML = latest.content || '';

    // GET ALL IMAGES
    const imageMatches = [
      ...rawHTML.matchAll(
        /https?:\/\/[^\s"]+\.(?:png|jpg|jpeg|webp)/gi
      )
    ];

    const imageUrls = imageMatches
      .map(match => match[0])
      .filter(url => url.length < 2000);

    // CLEAN TEXT
    let cleanText = rawHTML
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n\n')
      .replace(/<li>/gi, '• ')
      .replace(/<\/li>/gi, '\n')
      .replace(/<[^>]*>/g, '')
      .replace(/\n\s*\n/g, '\n\n')
      .trim();

    // SPLIT INTO SECTIONS
    const sections = cleanText
      .split('\n\n')
      .filter(x => x.trim().length > 40);

    // COSMETIC FILTER KEYWORDS
    const keywords = [
      'skin',
      'skins',
      'outfit',
      'fashion',
      'cosmetic',
      'crate',
      'shop',
      'weapon skin',
      'gun skin',
      'appearance',
      'set',
      'clothing',
      'furniture',
      'vehicle',
      'mount',
      'bundle',
      'reward',
      'pass'
    ];

    const filteredSections = sections.filter(section => {

      const lower = section.toLowerCase();

      return keywords.some(keyword =>
        lower.includes(keyword)
      );
    });

    if (filteredSections.length === 0) {
      return;
    }

    for (const id of USERS) {

      try {

        const user =
          await client.users.fetch(id);

        // HEADER
        await user.send(
`🌌 **${latest.title}**

✨ Fashion / Cosmetic Update Detected

🔗 ${latest.link}`
        );

        // SECTION FLOW
        for (let i = 0; i < filteredSections.length; i++) {

          const part = filteredSections[i];

          if (part.length > 1900) continue;

          await user.send(part);

          // SEND IMAGE AFTER SECTION
          if (imageUrls[i]) {

            await user.send(imageUrls[i]);
          }
        }

      } catch (err) {

        console.error(
          `Failed sending update to ${id}:`,
          err.message
        );
      }
    }

    console.log(
      'Cosmetic-focused Once Human update sent.'
    );

  } catch (error) {

    console.error(
      'Once Human Tracker Error:',
      error.message
    );
  }
}

function startOnceHumanTracker() {

  console.log(
    'Once Human tracker started.'
  );

  // CHECK EVERY 30 MINUTES
  setInterval(async () => {

    await sendOnceHumanUpdate(false);

  }, 1800000);
}

client.on('messageCreate', async (message) => {

  if (message.author.bot) return;

  if (
    message.author.id !== OWNER_ID &&
    message.author.id !== PRINCESS_ID &&
    message.author.id !== ALLY_ID
  ) {

    await message.reply(
      '⚠️ Access Denied.\n\nNim AI is exclusively devoted to Master Nim, Ariadne, and their Katulong.'
    );

    return;
  }

  const isDM = message.guild === null;

  if (!isDM) return;

  const lowerMsg =
    message.content.toLowerCase();

  // FORCE UPDATE TEST
  if (
    lowerMsg.includes('once human') ||
    lowerMsg === '!oncehuman'
  ) {

    await sendOnceHumanUpdate(true);

    await message.reply(
      'sinend ko na latest cosmetic/fashion update sainyong tatlo 😭🔥'
    );

    return;
  }

  try {

    await message.channel.sendTyping();

    const userId =
      message.author.id;

    if (!memory[userId]) {
      memory[userId] = [];
    }

    memory[userId].push({
      role: 'user',
      content: message.content
    });

    const response =
      await axios.post(
        'https://openrouter.ai/api/v1/chat/completions',
        {
          model: 'openrouter/auto',

          messages: [
            {
              role: 'system',
              content: `
You are Nim AI.

You are a casual Discord friend.

STRICT RULES:

- Reply ONLY in natural Tagalog or Tagalog-English.
- NEVER translate replies to English.
- NEVER repeat replies in another language.
- NEVER use parentheses translations.
- NEVER roleplay actions.
- NEVER act formal.
- Keep replies SHORT.
- Usually 1 sentence only.
- Talk casually like a real friend.
- Be funny, chill, and natural.

Users:
- 691198014211227679 = Master
- 665994636484935690 = Prinsesa
- 715596929332936735 = Katulong

Mention their titles only sometimes.
`
            },

            ...memory[userId]
          ]
        },

        {
          headers: {
            Authorization:
              `Bearer ${process.env.OPENROUTER_API_KEY}`,

            'Content-Type':
              'application/json',

            'HTTP-Referer':
              'https://railway.app',

            'X-Title':
              'Nim AI'
          }
        }
      );

    const reply =
      response.data
        .choices[0]
        .message.content;

    memory[userId].push({
      role: 'assistant',
      content: reply
    });

    if (
      memory[userId].length > 20
    ) {

      memory[userId] =
        memory[userId]
          .slice(-20);
    }

    await message.reply(reply);

  } catch (error) {

    console.error(
      JSON.stringify(
        error.response?.data,
        null,
        2
      ) || error.message
    );

    await message.reply(
      'may topak servers ko ngayon 😭'
    );
  }

});

console.log(
  'Attempting Discord login...'
);

client.login(
  process.env.DISCORD_TOKEN
)
  .then(() => {

    console.log(
      'LOGIN SUCCESS'
    );

  })
  .catch((err) => {

    console.error(
      'LOGIN ERROR:',
      err
    );
  });

client.on(
  'error',
  (error) => {

    console.error(
      'Discord Client Error:',
      error
    );
  }
);

process.on(
  'unhandledRejection',
  error => {

    console.error(
      'Unhandled promise rejection:',
      error
    );
  }
);
