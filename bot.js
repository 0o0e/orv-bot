// var MongoClient = require('mongodb').MongoClient;

// var uri = "mongodb://es1xkc:7RtQH1Uvt67zmizN@es1xkc/?ssl=true&replicaSet=atlas-w8915n-shard-0&authSource=admin&retryWrites=true&w=majority&appName=Bot";
// MongoClient.connect(uri, function(err, client) {
//   const collection = client.db("test").collection("devices");
//   // perform actions on the collection object
//   client.close();
// });

const Database = require('better-sqlite3');
const db = new Database('./database.sqlite'); // your SQLite file

const { ActivityType, EmbedBuilder, Client, GatewayIntentBits, Partials } = require('discord.js');
require('dotenv').config();
const moment = require('moment-timezone');

// Import command handlers
const { handleQuestCommand, checkQuestCompletion } = require('./commands/quest');
const { handleCheckInCommand } = require('./commands/checkin');
const { handleShopCommand, handleShopInteraction } = require('./commands/shop');
const { handleProfileCommand, handleProfileSlashCommand } = require('./commands/profile.js');
const { execute: setBio } = require('./commands/setbio.js');

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
    return new EmbedBuilder()
        .setColor('#0099ff')
        .addFields(
            { name: 'Difficulty', value: `**${difficulty}**`, inline: true },
            { name: 'Time Limit', value: `${timeLimit}`, inline: true },
            { name: 'Reward', value: '30 coins' },
            { name: 'Failure', value: 'No coins earned' }
        )
        .setDescription(`Your quest is: **${scenario}**`)
        .setTimestamp()
        .setFooter({ text: 'Good luck!' });
}

function createPurchaseEmbed(user, Itemtobuy, itemprice, remainingCoins, expirationTime) {
    const timeLeft = moment(expirationTime).fromNow(true); 

    return new EmbedBuilder()
        .setColor('#0099ff')
        .setTitle('Item purchase successful!')
        .setDescription(`Congratulations <@${user.id}>! You have successfully purchased the item **${Itemtobuy}** for **${itemprice} coins**!`)
        .addFields(
            { name: 'Remaining Coins', value: `${remainingCoins}`, inline: true },
            { name: 'Expires In', value: `${timeLeft}`, inline: true }
        )
        .setTimestamp()
        .setFooter({ text: 'Enjoy your new item!' });
}

// --- DATABASE HELPERS ---

// Coins
function getUserCoins(userId) {
    const row = db.prepare('SELECT coins FROM users WHERE id = ?').get(userId);
    if (!row) {
        db.prepare('INSERT INTO users (id, coins) VALUES (?, 0)').run(userId);
        return 0n;
    }
    return BigInt(row.coins);
}

function setUserCoins(userId, amount) {
    db.prepare('UPDATE users SET coins = ? WHERE id = ?').run(amount.toString(), userId);
}


// Quests
function getUserQuest(userId) {
    const row = db.prepare('SELECT * FROM quests WHERE user_id = ?').get(userId);
    if (!row) return null; // NO placeholder
    return row;
}

function setUserQuest(userId, questData) {
    db.prepare(`UPDATE quests SET 
        scenario = ?, 
        difficulty = ?, 
        reward = ?, 
        messages_sent = ?, 
        start_time = ?, 
        expiration_time = ?, 
        messages = ? 
        WHERE user_id = ?`)
      .run(
        questData.scenario,
        questData.difficulty,
        questData.reward,
        questData.messages_sent,
        questData.start_time,
        questData.expiration_time,
        JSON.stringify(questData.messages || []),
        userId
    );
}

// --- CLIENT READY ---
client.once('ready', () => {
    console.log('If you see this ivan is alive and the bot works and shit');
    client.user.setActivity("#BI-7623",{
        type : ActivityType.Streaming,

    })
});

let buyingUserId = null;

// --- MESSAGE HANDLER ---
client.on('messageCreate', async message => {
    if (message.author.bot) return;

    const userId = message.author.id;

    // Check quest completion
    await checkQuestCompletion(message); // handle DB updates inside

    // Initialize user in DB if not exists
    getUserCoins(userId);
    getUserQuest(userId);

    // Only handle commands in dokkaebi-bag
    if (!message.content.startsWith('!') || message.channel.name !== 'dokkaebi-bag') return;

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
                await handleQuestCommand(message); 
                break;
            }
case '!checkin': {
    await handleCheckInCommand(message);
    break;
}

            case '!coins': {
                const coins = getUserCoins(userId);
                await message.reply(`You have ${coins} coins.`);
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
                const bioText = message.content.slice('!setbio'.length).trim();
                await setBio(message, bioText.split(' '));
                break;
            }
        }
    } catch (error) {
        console.error('Error handling command:', error);
        await message.reply('There was an error executing this command! Please try again.');
    }
});

// --- SHOP INTERACTIONS ---
const ALLOWED_CHANNEL_ID = '1292907948330451025'; // your allowed channel

client.on('interactionCreate', async (interaction) => {
    try {
        // Only handle slash commands
        if (!interaction.isChatInputCommand()) return;

        // Restrict all slash commands to one channel
        if (interaction.channelId !== ALLOWED_CHANNEL_ID) {
            return interaction.reply({ content: `nyooooo go to <#${ALLOWED_CHANNEL_ID}>.`, ephemeral: true });
        }

        const commandName = interaction.commandName;

        switch (commandName) {
            case 'profile':
                await handleProfileSlashCommand(interaction);
                break;

            case 'coins':
                const coins = getUserCoins(interaction.user.id);
                await interaction.reply(`You have ${coins} coins.`);
                break;

            case 'checkin':
                await handleCheckInCommand(interaction);
                break;

            case 'quest':
                await handleQuestCommand(interaction);
                break;

            case 'shop':
                buyingUserId = interaction.user.id;
                await handleShopCommand(interaction);
                break;

            case 'setbio':
                const bioText = interaction.options.getString('text');
                await setBio(interaction, bioText.split(' '));
                break;

            default:
                await interaction.reply({ content: 'Unknown command!', ephemeral: true });
        }
    } catch (error) {
        console.error('Error handling interaction:', error);
        if (interaction.replied || interaction.deferred) {
            await interaction.followUp({ content: 'There was an error executing this command!', ephemeral: true });
        } else {
            await interaction.reply({ content: 'There was an error executing this command!', ephemeral: true });
        }
    }
});


client.login(process.env.DISCORD_TOKEN);
