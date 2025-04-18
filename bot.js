// var MongoClient = require('mongodb').MongoClient;

// var uri = "mongodb://es1xkc:7RtQH1Uvt67zmizN@es1xkc/?ssl=true&replicaSet=atlas-w8915n-shard-0&authSource=admin&retryWrites=true&w=majority&appName=Bot";
// MongoClient.connect(uri, function(err, client) {
//   const collection = client.db("test").collection("devices");
//   // perform actions on the collection object
//   client.close();
// });


const mongoURL = process.env.mongoURL;

const { EmbedBuilder, Client, GatewayIntentBits, AttachmentBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, Partials } = require('discord.js');
const fs = require('fs');
require('dotenv').config();
const moment = require('moment-timezone');
const path = require('path');

// Import command handlers
const { handleQuestCommand, checkQuestCompletion } = require('./commands/quest');
const { handleCheckInCommand } = require('./commands/checkin');
const { handleShopCommand, handleShopInteraction } = require('./commands/shop');

// File paths for data storage
const COINS_FILE = 'coins.json';
const COOLDOWNS_FILE = 'cooldowns.json';
const CHECKINS_FILE = 'checkins.json';

// Initialize data storage
let userCoins = {};
let cooldowns = {};
let checkins = {};
let userQuests = {};
let buyingUserId = null;

// Load existing data if available
try {
    if (fs.existsSync(COINS_FILE)) {
        userCoins = JSON.parse(fs.readFileSync(COINS_FILE));
    }
    if (fs.existsSync(COOLDOWNS_FILE)) {
        cooldowns = JSON.parse(fs.readFileSync(COOLDOWNS_FILE));
    }
    if (fs.existsSync(CHECKINS_FILE)) {
        checkins = JSON.parse(fs.readFileSync(CHECKINS_FILE));
    }
} catch (error) {
    console.error('Error loading data:', error);
}

// Save functions
function saveCoins() {
    // Convert BigInt values to regular numbers before saving
    const coinsToSave = {};
    for (const [userId, amount] of Object.entries(userCoins)) {
        coinsToSave[userId] = Number(amount);
    }
    fs.writeFileSync(COINS_FILE, JSON.stringify(coinsToSave, null, 2));
}

function saveCooldowns() {
    fs.writeFileSync(COOLDOWNS_FILE, JSON.stringify(cooldowns, null, 2));
}

function saveCheckins() {
    fs.writeFileSync(CHECKINS_FILE, JSON.stringify(checkins, null, 2));
}

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ],
    partials: [Partials.Channel]
});

// Command list for help command
const commandList = [
    { name: '!help', description: 'Shows a list of all commands and their explanations.' },
    { name: '!quest', description: 'Starts a new quest or checks the status of your current quest.' },
    { name: '!coins', description: 'Displays your current coin balance.' },
    { name: '!shop', description: 'Shows the shop and allows you to buy an item, if you have enough coins.' },
    { name: '!checkin', description: 'Check in daily to earn coins and maintain your streak.' }
];

// const quests = [
//     "send a message in #off-topic",
//     "send 10 messages in #general in the span of 1 hour, no spam allowed",
//     "solve this question: What is Yoo Joonghyuk's sister's name?",
//     "solve this question: What cabin number was Kim Dokja in at the start of ORV?" // New quest added

// ];
const quests = require("./quests.js"); 






const roles = {
    testrole1: 300,
    testrole2: 300,
    testrole3: 300,
};

function quest() {
    return quests[Math.floor(Math.random() * quests.length)];
}

function createQuestEmbed(scenario, difficulty, timeLimit) {
    const embed = new EmbedBuilder()
        .setColor('#0099ff')
        // .setTitle('A new scenario has arrived!')
        .addFields(
            { name: 'Difficulty', value: `**${difficulty}**`, inline: true },
            { name: 'Time Limit', value: `${timeLimit}`, inline: true },
            { name: 'Reward', value: '30 coins' },
            { name: 'Failure', value: 'No coins earned' }
        )
        .setDescription(`Your quest is: **${scenario}**`)
        .setTimestamp()
        .setFooter({ text: 'Good luck!' });
    return embed;
}


function createPurchaseEmbed(user, Itemtobuy, itemprice, remainingCoins,expirationTime) {
    const timeLeft = moment(expirationTime).fromNow(true); // Calculate remaining time in a human-readable format

    const embed = new EmbedBuilder()
        .setColor('#0099ff')
        .setTitle('Item purchase successful!')
        .setDescription(`Congratulations <@${user.id}>! You have successfully purchased the item **${Itemtobuy}** for **${itemprice} coins**!`)
        
        .addFields(
            { name: 'Remaining Coins', value: `${remainingCoins}`, inline: true },
            { name: 'Expires In', value: `${timeLeft}`, inline: true } // Add the time left until expiration

        )
        .setTimestamp()
        .setFooter({ text: 'Enjoy your new item!' });
    return embed;
}

client.once('ready', () => {
    console.log('Bot is ready!');
});


process.on('SIGINT', () => {
    saveCooldowns();
    process.exit();
});

process.on('SIGTERM', () => {
    saveCooldowns();
    process.exit();
});

client.on('messageCreate', async message => {
    if (message.author.bot) return;

    const userId = message.author.id;
    const currentTime = new Date();

    if (!userCoins[userId]) {
        userCoins[userId] = 0;
        saveCoins(); // Save changes
    }

    if (message.content.startsWith('!help')) {
        const helpEmbed = {
            color: 0x0099ff,
            title: 'ORV Bot Commands',
            fields: [
                { name: '!quest', value: 'Start a quest to earn coins' },
                { name: '!checkin', value: 'Check in daily to earn coins' },
                { name: '!coins', value: 'Check your coin balance' },
                { name: '!shop', value: 'View and purchase items from the shop' }
            ],
            timestamp: new Date()
        };
        await message.channel.send({ embeds: [helpEmbed] });
    }

    if (message.content.startsWith('!quest')) {
        await handleQuestCommand(message, userQuests, cooldowns, userCoins);
        saveCoins();
        saveCooldowns();
    }

    if (message.content.startsWith('!checkin')) {
        await handleCheckInCommand(message, checkins, userCoins);
        saveCoins();
        saveCheckins();
    }

    if (message.content.startsWith('!coins')) {
        const coins = userCoins[userId] || 0;
        await message.reply(`You have ${coins} coins.`);
    }

    if (message.content.startsWith('!shop')) {
        buyingUserId = userId;
        await handleShopCommand(message);
    }

    // Check for quest completion on every message
    const result = await checkQuestCompletion(message, userQuests, userCoins);
    if (result) {
        userQuests = result.userQuests;
        userCoins = result.userCoins;
        saveCoins(userCoins);
    }
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isButton()) return;

    const userId = interaction.user.id;
    const userCoinsCopy = { ...userCoins };
    
    const updatedCoins = await handleShopInteraction(interaction, userCoinsCopy, userId);
    if (updatedCoins) {
        // Convert coin values to BigInt when loading back
        for (const [id, amount] of Object.entries(updatedCoins)) {
            userCoins[id] = BigInt(amount);
        }
        saveCoins();
    }
});

client.login(process.env.DISCORD_TOKEN);
