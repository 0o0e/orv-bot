const { EmbedBuilder, Client, GatewayIntentBits, AttachmentBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const fs = require('fs');
require('dotenv').config();
const moment = require('moment-timezone');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
});

const coinsFile = './coins.json';
const cooldownsFile = './cooldowns.json';
const checkinsFile = './checkins.json';

let userCoins = {};
if (fs.existsSync(coinsFile)) {
    userCoins = JSON.parse(fs.readFileSync(coinsFile, 'utf8'));
}

let cooldowns = {};
if (fs.existsSync(cooldownsFile)) {
    cooldowns = JSON.parse(fs.readFileSync(cooldownsFile, 'utf8'));
}

let userCheckins = {};
if (fs.existsSync(checkinsFile)) {
    userCheckins = JSON.parse(fs.readFileSync(checkinsFile, 'utf8'));
}

function saveCoins() {
    fs.writeFileSync(coinsFile, JSON.stringify(userCoins, null, 2));
}

function saveCooldowns() {
    fs.writeFileSync(cooldownsFile, JSON.stringify(cooldowns, null, 2));
}

function saveCheckins() {
    fs.writeFileSync(checkinsFile, JSON.stringify(userCheckins, null, 2));
}

let userQuests = {}; 









// const quests = [
//     "send a message in #off-topic",
//     "send 10 messages in #general in the span of 1 hour, no spam allowed",
//     "solve this question: What is Yoo Joonghyuk's sister's name?",
//     "solve this question: What cabin number was Kim Dokja in at the start of ORV?" // New quest added

// ];


const quests = [
    {
        scenario: "send a message in #off-topic",
        difficulty: "easy",
        type: "main scenario",
        hidden: false,
        time: 5

    },
    {
        scenario: "send 10 messages in #general in the span of 1 hour, no spam allowed",
        difficulty: "medium",
        type: "main scenario",
        hidden: false,
        time: 5

    },
    {
        scenario: "solve this question: What is Yoo Joonghyuk's sister's name?",
        difficulty: "hard",
        type: "sub scenario",
        hidden: false,
        time: 5

    },
    {
        scenario: "solve this question: What cabin number was Kim Dokja in at the start of ORV?",
        difficulty: "medium",
        type: "hidden scenario",
        hidden: true,
        time: 5
    }
];




const roles = {
    testrole1: 300,
    testrole2: 300,
    testrole3: 300,
};

function quest() {
    return quests[Math.floor(Math.random() * quests.length)];
}


function createQuestEmbed(quest) {
    const embed = new EmbedBuilder()
        .setColor('#0099ff')
        .setTitle('A new scenario has arrived!')
        .addFields(
            { name: 'Category/Type', value: `**${quest.type}**` },
            { name: 'Difficulty', value: `**${quest.difficulty}**` },
            { name: 'Time Limit', value: `${quest.time} hours` },
            { name: 'Compensation/Reward', value: '30 coins' },
            { name: 'Failure', value: 'No coins earned' }
        )
        .setDescription(`Your quest is: **${quest.scenario}**`)
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
    console.log('Bot is online!');
});

process.on('SIGINT', () => {
    saveCooldowns();
    process.exit();
});

process.on('SIGTERM', () => {
    saveCooldowns();
    process.exit();
});

let buyingUserId = null; // Variable to keep track of the user who invoked !shop

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    const userId = message.author.id;
    const currentTime = new Date();

    if (!userCoins[userId]) {
        userCoins[userId] = 0;
        saveCoins(); // Save changes
    }


    if (message.content === '!quest') {
        const userQuest = userQuests[userId];
    
        // Check if there is an ongoing quest
        if (userQuest && Date.now() < userQuest.expirationTime) {
            // Calculate remaining time
            const remainingTime = userQuest.expirationTime - Date.now();
            const hoursLeft = Math.floor(remainingTime / (1000 * 60 * 60));  // Convert milliseconds to hours
            const minutesLeft = Math.floor((remainingTime % (1000 * 60 * 60)) / (1000 * 60)); // Get minutes left after hours
            const questEmbed = createQuestEmbed(userQuest.scenario);

            // Send a message saying the user already has a quest and the remaining time
            return message.channel.send({content: `${message.author}, you already have a quest! You have **${hoursLeft} hours and ${minutesLeft} minutes** left to finish it.`, embeds: [questEmbed]});
        
            // Optionally, send the quest embed again
            return message.channel.send({ embeds: [questEmbed] });
        }
    
        // Check if the user is on cooldown
        if (cooldowns[userId] && currentTime < cooldowns[userId]) {
            const timeLeftInHours = Math.ceil((cooldowns[userId] - currentTime) / (1000 * 60));
            const attachment = new AttachmentBuilder('./cooldown_image.png');
            await message.channel.send({ files: [attachment] });
            return message.channel.send(`You have to wait **${timeLeftInHours} hours** before using this command again.`);
        }
    

    
        // If quest expired, notify the user and delete the quest
        if (userQuest && Date.now() > userQuest.expirationTime) {
            const dokkaebiBagChannel = client.channels.cache.get('1292907948330451025');
            dokkaebiBagChannel.send(`${message.author}, you failed to complete your quest: **${userQuest.scenario}**`);
            delete userQuests[userId];
        }
    
        // Create new quest if no ongoing quest exists
        const scenario = quest();
        const questEmbed = createQuestEmbed(scenario);
        
        
        // Ping the user who did the command
        await message.channel.send({ content: `${message.author}, your new quest is ready!`, embeds: [questEmbed] });
    
        userQuests[userId] = {
            scenario: scenario,
            messagesSent: 0,
            startTime: Date.now(),
            expirationTime: Date.now() + 1000 * 60 * 60 * 5, // 5-hour expiration
        };
        cooldowns[userId] = currentTime.getTime() + 1000 * 60 * 60 * 5; // 5-hour cooldown
        saveCooldowns();
    }
    
    const userQuest = userQuests[userId];
    










    if (userQuest) {
        if (Date.now() > userQuest.expirationTime) {
            const dokkaebiBagChannel = client.channels.cache.get('1292907948330451025');
            dokkaebiBagChannel.send(`${message.author}, you failed to complete your quest: **${userQuest.scenario}**`);
            delete userQuests[userId]; // Remove the expired quest
            return;
        }



        if (userQuest.scenario === "send a message in #off-topic" && message.channel.name === 'off-topic') {
            userQuest.messagesSent++;
            userCoins[userId] += 30; 
            const dokkaebiBagChannel = client.channels.cache.get('1292907948330451025');

            // Create an embed with the image and text
            const attachment = new AttachmentBuilder('./completedquest.png'); 
            const embed = new EmbedBuilder()
                .setColor('#0099ff')
                .setTitle('Quest Completed!')
                .setImage('attachment://completedquest.png') // Reference the image attachment
                .setDescription(`You now have ${userCoins[userId]} coins.`)
                .setTimestamp(); // Optionally add a timestamp
        
            // Send the embed and attachment together
            await dokkaebiBagChannel.send({ content: `${message.author}`, embeds: [embed] ,files: [attachment]  });

        
            delete userQuests[userId]; 
                }


                

        if (userQuest.scenario === "send 10 messages in #general in the span of 1 hour, no spam allowed" && message.channel.name === 'general') {
            userQuest.messagesSent++;
            if (userQuest.messagesSent >= 10 && Date.now() - userQuest.startTime <= 3600000) {
                userCoins[userId] += 30; 
                const dokkaebiBagChannel = client.channels.cache.get('1292907948330451025');
    
                // Create an embed with the image and text
                const attachment = new AttachmentBuilder('./completedquest.png'); 
                const embed = new EmbedBuilder()
                    .setColor('#0099ff')
                    .setTitle('Quest Completed!')
                    .setImage('attachment://completedquest.png') // Reference the image attachment
                    .setDescription(`You now have ${userCoins[userId]} coins.`)
                    .setTimestamp(); // Optionally add a timestamp
            
                // Send the embed and attachment together
                await dokkaebiBagChannel.send({ content: `${message.author}`, embeds: [embed] ,files: [attachment]  });
    
            
                delete userQuests[userId]; 
            }
        }

        if (userQuest.scenario ===("solve this question:") && message.content.toLowerCase() === "yoo mia" || message.content.toLowerCase() === "yu mia") {
            userQuest.messagesSent++;
            userCoins[userId] += 30; 
            const dokkaebiBagChannel = client.channels.cache.get('1292907948330451025');

            // Create an embed with the image and text
            const attachment = new AttachmentBuilder('./completedquest.png'); 
            const embed = new EmbedBuilder()
                .setColor('#0099ff')
                .setTitle('Quest Completed!')
                .setImage('attachment://completedquest.png') // Reference the image attachment
                .setDescription(`You now have ${userCoins[userId]} coins.`)
                .setTimestamp(); // Optionally add a timestamp
        
            // Send the embed and attachment together
            await dokkaebiBagChannel.send({ content: `${message.author}`, embeds: [embed] ,files: [attachment]  });

        
            delete userQuests[userId]; 
        }


        if (userQuest.scenario === "solve this question: What cabin number was Kim Dokja in at the start of ORV?" && message.content === "3807") {
            userQuest.messagesSent++;
            userCoins[userId] += 30; 
            const dokkaebiBagChannel = client.channels.cache.get('1292907948330451025');

            // Create an embed with the image and text
            const attachment = new AttachmentBuilder('./completedquest.png'); 
            const embed = new EmbedBuilder()
                .setColor('#0099ff')
                .setTitle('Quest Completed!')
                .setImage('attachment://completedquest.png') // Reference the image attachment
                .setDescription(`You now have ${userCoins[userId]} coins.`)
                .setTimestamp(); // Optionally add a timestamp
        
            // Send the embed and attachment together
            await dokkaebiBagChannel.send({ content: `${message.author}`, embeds: [embed] ,files: [attachment]  });

        
            delete userQuests[userId]; 
        }

    }

















    if (message.content === '!coins') {
        return message.channel.send(`You have ${userCoins[userId]} coins.`);
    }

    if (message.content === '!checkin') {
        // Initialize user check-in data if it doesn't exist
        if (!userCheckins[userId]) {
            userCheckins[userId] = {
                lastCheckIn: null,
                streak: 0,
            };
        }

        const userCheckin = userCheckins[userId];
        const currentTime = new Date();

        let streak = userCheckin.streak;
        let coins = 0;

        const lastCheckIn = userCheckin.lastCheckIn ? new Date(userCheckin.lastCheckIn) : null;

        const timeDiff = lastCheckIn ? currentTime - lastCheckIn : null;
        const daysDiff = timeDiff !== null ? Math.floor(timeDiff / (1000 * 60 * 60 * 24)) : null;

        // Check if the user already checked in today
        if (lastCheckIn && daysDiff === 0) {
            const remainingCooldown = 24 - (currentTime.getHours() - lastCheckIn.getHours());

            return message.channel.send(`You have already checked in today! Please wait **${remainingCooldown} hours** before checking in again.`);
        }

        // Check if the user missed a day
        if (lastCheckIn === null || daysDiff > 1) {
            // Reset streak if they missed a day
            streak = 1;
        } else if (daysDiff === 1) {
            // Increment streak if it's a consecutive check-in
            streak += 1;
        }

        // Calculate coins based on the current streak
        if (streak <= 7) {
            coins = streak * 5; // Day 1 = 5 coins, Day 2 = 10 coins, ..., Day 7 = 35 coins
            userCoins[userId] += coins; // Add the coins to the user's total
            saveCoins();
        } else if (streak > 7) {
            coins = 35; // After day 7, they just get the final reward message with no more coin increments
            userCoins[userId] += coins;

            saveCoins();

        }

        // Update the user's streak and last check-in date
        userCheckins[userId] = {
            lastCheckIn: currentTime,
            streak: streak,
        };
        saveCheckins();

        // Create the message display
        let rewardsMessage = "";
        for (let i = 1; i <= 7; i++) {
            if (i <= streak) {
                rewardsMessage += `✅ Day ${i} - : +${i * 5} 🪙\n`;
            } else {
                rewardsMessage += `⬜ Day ${i} - : +${i * 5} 🪙\n`;
            }
        }

        // Create the final message
        let messageText;
        if (streak <= 7) {
            messageText = `You checked in successfully and earned **${coins} coins!**\n\n**Current Streak days:** ${streak}\n\n**Rewards:**\n${rewardsMessage}\nKeep checking in daily for more rewards!`;
        } else {
            messageText = `You have checked in for all days! Here is **35 coins** for you.\n\n**Current Streak days:** ${streak}\n\n**Rewards:**\n${rewardsMessage}\nKeep checking in daily to maintain your streak!`;
        }

        const checkInEmbed = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle('✅ Check-in Successful!')
            .setDescription(messageText)
            .setTimestamp()
            .setFooter({ text: 'Keep checking in daily for more rewards!' });

        await message.channel.send({ embeds: [checkInEmbed] });
    }

    if (message.content === '!shop') {
        buyingUserId = userId; // Store the user ID who invoked the command

        const attachment = new AttachmentBuilder('./items.png'); 
        await message.channel.send({ files: [attachment] });

        const buttons = Object.keys(roles).map(role => (
            new ButtonBuilder()
                .setCustomId(role)
                .setLabel(role)
                .setStyle(ButtonStyle.Primary)
        ));

        const row = new ActionRowBuilder().addComponents(buttons);

        await message.channel.send({ content: 'Select an item to buy:', components: [row] });
    }
});

client.on('interactionCreate', async (interaction) => {
    if (!interaction.isButton()) return;

    // Check if the user who clicked the button is the one who invoked the !shop command
    if (interaction.user.id !== buyingUserId) {
        return interaction.reply({ content: 'You must use the !shop command yourself to purchase an item.', ephemeral: true });
    }

    const userId = interaction.user.id;
    const roleToBuy = interaction.customId;
    const rolePrice = roles[roleToBuy];

    if (!rolePrice) {
        return interaction.reply({ content: `Invalid role selected.`, ephemeral: true });
    }

    if (userCoins[userId] < rolePrice) {
        return interaction.reply({ content: `You do not have enough coins to buy ${roleToBuy}. You need ${rolePrice} coins.`, ephemeral: true });
    }

    const role = interaction.guild.roles.cache.find(r => r.name === roleToBuy);
    const member = interaction.member;

    if (!role) {
        return interaction.reply({ content: `Role ${roleToBuy} not found in this server.`, ephemeral: true });
    }

    if (member.roles.cache.has(role.id)) {
        return interaction.reply({ content: `You already have the role ${roleToBuy}.`, ephemeral: true });
    }

    await member.roles.add(role);
    userCoins[userId] -= rolePrice;
    saveCoins(); 
    await interaction.reply({ 
        embeds: [createPurchaseEmbed(interaction.user, roleToBuy, rolePrice, userCoins[userId])],
    });
    
    setTimeout(async () => {
        if (member.roles.cache.has(role.id)) {
            await member.roles.remove(role);

            const dokkaebiBagChannel = interaction.guild.channels.cache.find(channel => channel.name === 'dokkaebi-bag');
            if (dokkaebiBagChannel) {
                dokkaebiBagChannel.send(`${interaction.user}, the role ${roleToBuy} has expired and has been removed.`);
            }
        }
    }, 60000); 
});

client.login(process.env.TOKEN);
