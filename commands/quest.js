const { AttachmentBuilder, EmbedBuilder } = require('discord.js');
const quests = require('../quests.js');
const { createQuestEmbed } = require('../utils/embeds');

// Define different time limits for different difficulties (in milliseconds)
const difficultyTimes = {
    easy: 1000 * 60 * 30, // 30 minutes
    medium: 1000 * 60 * 60, // 1 hour
    hard: 1000 * 60 * 90, // 1.5 hours
    extreme: 1000 * 60 * 120, // 2 hours
};

// Define cooldown times based on difficulty (in milliseconds)
const cooldownTimes = {
    easy: 1000 * 60 * 60 * 12, // 12 hours
    medium: 1000 * 60 * 60 * 12, // 12 hours
    hard: 1000 * 60 * 60 * 12, // 12 hours
    extreme: 1000 * 60 * 60 * 12, // 12 hours
};

function formatTime(ms) {
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours} hours and ${minutes} minutes`;
}

async function handleQuestCommand(message, userQuests, cooldowns, userCoins) {
    const userId = message.author.id;
    const currentTime = Date.now();

    // Check if there is an ongoing quest
    if (userQuests[userId] && currentTime < userQuests[userId].expirationTime) {
        const remainingTime = userQuests[userId].expirationTime - currentTime;
        const hoursLeft = Math.floor(remainingTime / (1000 * 60 * 60));
        const minutesLeft = Math.floor((remainingTime % (1000 * 60 * 60)) / (1000 * 60));

        const questEmbed = createQuestEmbed(
            userQuests[userId].scenario,
            userQuests[userId].difficulty,
            formatTime(remainingTime),
            userQuests[userId].reward
        );

        return message.channel.send({
            content: `${message.author}, you already have a quest! You have **${hoursLeft} hours and ${minutesLeft} minutes** left to finish it.`,
            embeds: [questEmbed],
        });
    }

    // Check if the user is on cooldown
    if (cooldowns[userId] && currentTime < cooldowns[userId]) {
        const timeLeft = cooldowns[userId] - currentTime;
        const hoursLeft = Math.floor(timeLeft / (1000 * 60 * 60));
        const minutesLeft = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
        const attachment = new AttachmentBuilder('./cooldown_image.png');

        const cooldownEmbed = new EmbedBuilder()
            .setColor('#FF0000')
            .setDescription(`You have to wait **${hoursLeft} hours and ${minutesLeft} minutes** before using this command again.`)
            .setTimestamp()
            .setImage('attachment://cooldown_image.png');

        return message.channel.send({
            content: `${message.author}`,
            embeds: [cooldownEmbed],
            files: [attachment]
        });
    }

    const selectedQuest = quests[Math.floor(Math.random() * quests.length)];
    const scenario = selectedQuest.quest;
    const difficulty = selectedQuest.difficulty;
    const reward = selectedQuest.reward;

    const timeLimit = difficultyTimes[difficulty];
    const cooldown = cooldownTimes[difficulty];

    const questEmbed = createQuestEmbed(scenario, difficulty, formatTime(timeLimit), reward);

    await message.channel.send({ content: `${message.author}, A new scenario has arrived!`, embeds: [questEmbed] });

    userQuests[userId] = {
        scenario: scenario,
        difficulty: difficulty,
        reward: reward,
        messagesSent: 0,
        startTime: currentTime,
        expirationTime: currentTime + timeLimit,
    };

    // Set cooldown for when the quest expires
    cooldowns[userId] = currentTime + timeLimit + cooldown;
    return { userQuests, cooldowns };
}

async function checkQuestCompletion(message, userQuests, userCoins) {
    const userId = message.author.id;
    const userQuest = userQuests[userId];

    if (!userQuest) return { userQuests, userCoins };

    if (Date.now() > userQuest.expirationTime) {
        const dokkaebiBagChannel = message.client.channels.cache.get('1292907948330451025');
        const failedQuestEmbed = new EmbedBuilder()
            .setColor('#ff0000')
            .setTitle('Quest Failed!')
            .setDescription(`You failed to complete your quest: **${userQuest.scenario}** within the time limit.`)
            .setTimestamp();

        await dokkaebiBagChannel.send({ content: `<@${userId}>`, embeds: [failedQuestEmbed] });
        delete userQuests[userId];
        return { userQuests, userCoins };
    }

    // Handle different quest types
    if (userQuest.scenario === "send a message in #off-topic" && message.channel.name === 'off-topic') {
        return await completeQuest(message, userQuests, userCoins, userQuest);
    }

    if (userQuest.scenario === "send 10 messages in #general in the span of 1 hour, no spam allowed" && 
        message.channel.name === 'general') {
        userQuest.messagesSent++;
        if (userQuest.messagesSent >= 10 && Date.now() - userQuest.startTime <= 3600000) {
            return await completeQuest(message, userQuests, userCoins, userQuest);
        }
    }

    if (userQuest.scenario.includes("solve this question:") && 
        (message.content.toLowerCase() === "yoo mia" || message.content.toLowerCase() === "yu mia")) {
        return await completeQuest(message, userQuests, userCoins, userQuest);
    }

    if (userQuest.scenario === "solve this question: What cabin number was Kim Dokja in at the start of ORV?" && 
        message.content === "3807") {
        return await completeQuest(message, userQuests, userCoins, userQuest);
    }

    return { userQuests, userCoins };
}

async function completeQuest(message, userQuests, userCoins, userQuest) {
    const userId = message.author.id;
    const dokkaebiBagChannel = message.client.channels.cache.get('1292907948330451025');

    // Initialize user's coins if they don't exist
    if (!userCoins[userId]) {
        userCoins[userId] = BigInt(0);
    }

    // Convert current coins to BigInt if they're not already
    if (typeof userCoins[userId] !== 'bigint') {
        userCoins[userId] = BigInt(userCoins[userId]);
    }
    
    // Add reward as BigInt
    const reward = BigInt(userQuest.reward || 0);
    userCoins[userId] += reward;

    const attachment = new AttachmentBuilder('./completedquest.png');
    const embed = new EmbedBuilder()
        .setColor('#0099ff')
        .setTitle('Quest Completed!')
        .setImage('attachment://completedquest.png')
        .setDescription(`You earned ${userQuest.reward} coins! You now have ${userCoins[userId].toString()} coins.`)
        .setTimestamp();

    await dokkaebiBagChannel.send({ content: `${message.author}`, embeds: [embed], files: [attachment] });
    delete userQuests[userId];

    return { userQuests, userCoins };
}

module.exports = {
    handleQuestCommand,
    checkQuestCompletion
}; 