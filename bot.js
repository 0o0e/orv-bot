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
const { handleProfileCommand } = require('./commands/profile.js');
const { execute: setBio } = require('./commands/setbio.js');

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
        const loadedCoins = JSON.parse(fs.readFileSync(COINS_FILE));
        for (const [userId, amount] of Object.entries(loadedCoins)) {
            userCoins[userId] = BigInt(amount);
        }
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
    if (!userCoins || typeof userCoins !== 'object') {
        userCoins = {};
        console.error('Warning: userCoins was null or undefined, initializing as empty object');
    }
    const coinsToSave = {};
    for (const [userId, amount] of Object.entries(userCoins)) {
        if (amount !== null && amount !== undefined) {
            coinsToSave[userId] = amount.toString();
        }
    }
    fs.writeFileSync(COINS_FILE, JSON.stringify(coinsToSave, null, 2));
}

function saveCooldowns() {
    fs.writeFileSync(COOLDOWNS_FILE, JSON.stringify(cooldowns, null, 2));
}

function saveCheckins() {
    if (!checkins || typeof checkins !== 'object') {
        checkins = {};
        console.error('Warning: checkins was null or undefined, initializing as empty object');
    }
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
    { name: '!checkin', description: 'Check in daily to earn coins and maintain your streak.' },
    { name: '!profile', description: 'Shows your profile card with username and coins.' }
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

// Handle message commands and quest completion
client.on('messageCreate', async message => {
    if (message.author.bot) return;

    // Check quest completion regardless of channel
    const questCompletionResult = await checkQuestCompletion(message, userQuests, userCoins);
    if (questCompletionResult) {
        userQuests = questCompletionResult.userQuests;
        userCoins = questCompletionResult.userCoins;
        saveCoins();
    }

    // Initialize coins for new users
    const userId = message.author.id;
    if (!userCoins[userId]) {
        userCoins[userId] = BigInt(0);
        saveCoins();
    }

    // Handle prefix commands (only in dokkaebi-bag)
    if (message.content.startsWith('!')) {
        const isDokkaebiBag = message.channel.name === 'dokkaebi-bag';
        if (!isDokkaebiBag) {
            return;
        }

        const command = message.content.toLowerCase().split(' ')[0];

        try {
            switch (command) {
                case '!help': {
                    const helpEmbed = {
                        color: 0x0099ff,
                        title: 'ORV Bot Commands',
                        fields: commandList.map(cmd => ({
                            name: cmd.name,
                            value: cmd.description
                        })),
                        timestamp: new Date()
                    };
                    await message.channel.send({ embeds: [helpEmbed] });
                    break;
                }
                case '!quest': {
                    const questResult = await handleQuestCommand(message, userQuests, cooldowns, userCoins);
                    if (questResult) {
                        userQuests = questResult.userQuests;
                        cooldowns = questResult.cooldowns;
                        saveCoins();
                        saveCooldowns();
                    }
                    break;
                }
                case '!checkin': {
                    const checkinResult = await handleCheckInCommand(message, checkins, userCoins);
                    if (checkinResult) {
                        checkins = checkinResult.checkins;
                        userCoins = checkinResult.userCoins;
                        saveCoins();
                        saveCheckins();
                    }
                    break;
                }
                case '!coins': {
                    const coins = userCoins[userId] || BigInt(0);
                    await message.reply(`You have ${coins.toString()} coins.`);
                    break;
                }
                case '!shop': {
                    buyingUserId = userId;
                    await handleShopCommand(message);
                    break;
                }
                case '!profile': {
                    await handleProfileCommand(message);
                    break;
                }
                case '!setbio': {
                    // Remove the command prefix and get just the bio text
                    const bioText = message.content.slice('!setbio'.length).trim();
                    await setBio(message, bioText.split(' '));
                    break;
                }
            }
        } catch (error) {
            console.error('Error handling prefix command:', error);
            await message.reply('There was an error executing this command! Please try again.');
        }
    }
});

// Handle button interactions (for shop)
client.on('interactionCreate', async interaction => {
    if (!interaction.isButton()) return;

    try {
        if (interaction.user.id === buyingUserId) {
            const newCoins = await handleShopInteraction(interaction, userCoins, buyingUserId);
            if (newCoins) {
                userCoins = newCoins;
                saveCoins();
            }
        } else {
            await interaction.reply({ 
                content: 'You must use the !shop command yourself to make purchases.', 
                ephemeral: true 
            });
        }
    } catch (error) {
        console.error('Error handling button interaction:', error);
        await interaction.reply({ 
            content: 'An error occurred while processing your purchase. Please try again later.',
            ephemeral: true 
        });
    }
});

client.login(process.env.DISCORD_TOKEN);
