const { AttachmentBuilder, EmbedBuilder } = require('discord.js');
const { Canvas, loadImage, GlobalFonts } = require('@napi-rs/canvas');
const { quests, isCompliment } = require('../quests.js');
const { createQuestEmbed } = require('../utils/embeds');
const path = require('path');

// Register the font
const fontPath = path.join(__dirname, '..', 'fonts', 'Roboto-Bold.ttf');
GlobalFonts.registerFromPath(fontPath, 'Roboto Bold');

// Define different time limits for different difficulties (in milliseconds)
const difficultyTimes = {
    Easy: 1000 * 60 * 30, // 30 minutes
    Medium: 1000 * 60 * 60, // 1 hour
    Hard: 1000 * 60 * 90, // 1.5 hours
    Extreme: 1000 * 60 * 120, // 2 hours
};

// Define cooldown times based on difficulty (in milliseconds)
const cooldownTimes = {
    Easy: 1000 * 60 * 60 * 12, // 12 hours
    Medium: 1000 * 60 * 60 * 12, // 12 hours
    Hard: 1000 * 60 * 60 * 12, // 12 hours
    Extreme: 1000 * 60 * 60 * 12, // 12 hours
};

function formatTime(ms) {
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours} hours and ${minutes} minutes`;
}

function wrapText(ctx, text, maxWidth) {
    const words = text.split(' ');
    const lines = [];
    let currentLine = '';

    for (const word of words) {
        const testLine = currentLine + word + ' ';
        const { width } = ctx.measureText(testLine);
        if (width > maxWidth) {
            lines.push(currentLine.trim());
            currentLine = word + ' ';
        } else {
            currentLine = testLine;
        }
    }
    if (currentLine) lines.push(currentLine.trim());
    return lines;
}

async function createQuestCard(scenario, difficulty, timeLimit, reward) {
    const width = 450;
    const height = 350;

    const canvas = new Canvas(width, height);
    const ctx = canvas.getContext('2d');

    // Load and draw background
    const background = await loadImage('./profile.png');
    ctx.drawImage(background, 0, 0, width, height);

    // Text settings
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'center';

    // Title
    ctx.font = 'normal 20px "Roboto Bold"';
    ctx.fillText('NEW QUEST', width / 2, 60);

    // Scenario (multi-line)
    ctx.font = 'normal 16px "Roboto Bold"';
    const maxLineWidth = 350;
    const lineHeight = 22;
    const lines = wrapText(ctx, scenario, maxLineWidth);
    let y = 100;
    for (const line of lines) {
        ctx.fillText(line, width / 2, y);
        y += lineHeight;
    }

    // Info block
    const infoYStart = y + 40;
    ctx.textAlign = 'left';
    ctx.font = 'normal 16px "Roboto Bold"';

    // Draw each stat with consistent spacing
    const leftMargin = 60;
    const labelWidth = 95;
    const stats = [
        { label: 'DIFFICULTY:', value: difficulty },
        { label: 'TIME LIMIT:', value: timeLimit },
        { label: 'REWARDS:', value: `${reward} COINS` }
    ];

    stats.forEach((stat, index) => {
        const yPos = infoYStart + (index * 25);
        ctx.fillText(stat.label, leftMargin, yPos);
        ctx.fillText(stat.value, leftMargin + labelWidth, yPos);
    });

    return canvas;
}

async function handleQuestCommand(input, userQuests, cooldowns, userCoins) {
    const userId = input.user?.id || input.author.id;
    const currentTime = Date.now();

    // Check if there is an ongoing quest
    if (userQuests[userId] && currentTime < userQuests[userId].expirationTime) {
        const remainingTime = userQuests[userId].expirationTime - currentTime;
        const hoursLeft = Math.floor(remainingTime / (1000 * 60 * 60));
        const minutesLeft = Math.floor((remainingTime % (1000 * 60 * 60)) / (1000 * 60));
        const timeLeft = formatTime(remainingTime);

        const questCanvas = await createQuestCard(
            userQuests[userId].scenario,
            userQuests[userId].difficulty,
            timeLeft,
            userQuests[userId].reward
        );

        const buffer = await questCanvas.encode('png');
        const attachment = new AttachmentBuilder(buffer, { name: 'quest.png' });

        const questEmbed = new EmbedBuilder()
            .setColor('#0099ff')
            .setDescription(`You already have a quest! You have **${hoursLeft} hours and ${minutesLeft} minutes** left to finish it.`)
            .setImage('attachment://quest.png')
            .setTimestamp();

        const replyContent = {
            content: `${input.user || input.author}`,
            embeds: [questEmbed],
            files: [attachment]
        };

        if (input.reply) {
            await input.reply(replyContent);
        } else {
            await input.channel.send(replyContent);
        }
        return { userQuests, cooldowns };
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

        const replyContent = {
            content: `${input.user || input.author}`,
            embeds: [cooldownEmbed],
            files: [attachment]
        };

        if (input.reply) {
            await input.reply(replyContent);
        } else {
            await input.channel.send(replyContent);
        }
        return { userQuests, cooldowns };
    }

    const selectedQuest = quests[Math.floor(Math.random() * quests.length)];
    const scenario = selectedQuest.quest;
    const difficulty = selectedQuest.difficulty;
    const reward = selectedQuest.reward;

    const timeLimit = difficultyTimes[difficulty];
    const cooldown = cooldownTimes[difficulty];
    const timeLimitFormatted = formatTime(timeLimit);

    const questCanvas = await createQuestCard(scenario, difficulty, timeLimitFormatted, reward);
    const buffer = await questCanvas.encode('png');
    const attachment = new AttachmentBuilder(buffer, { name: 'quest.png' });

    const questEmbed = new EmbedBuilder()
        .setColor('#0099ff')
        .setDescription('A new scenario has arrived!')
        .setImage('attachment://quest.png')
        .setTimestamp();

    const replyContent = {
        content: `${input.user || input.author}`,
        embeds: [questEmbed],
        files: [attachment]
    };

    if (input.reply) {
        await input.reply(replyContent);
    } else {
        await input.channel.send(replyContent);
    }

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

    // Handle birthday wish quest
    if (userQuest.scenario === "Wish someone happy birthday in #members-birthday-party" && 
        message.channel.name === 'members-birthday-party' &&
        message.content.toLowerCase().includes('happy birthday')) {
        return await completeQuest(message, userQuests, userCoins, userQuest);
    }

    // Handle Dokkaebi question
    if (userQuest.scenario === "solve this question: What is the name of the Dokkaebi hosting the early scenarios?" && 
        message.content.toLowerCase() === "bihyung") {
        return await completeQuest(message, userQuests, userCoins, userQuest);
    }

    // Handle Jung Heewon's weapon question
    if (userQuest.scenario === "solve this question: What weapon does Jung Heewon wield?" && 
        message.content.toLowerCase() === "flame of justice") {
        return await completeQuest(message, userQuests, userCoins, userQuest);
    }

    // Handle Kim Dokja's mental skill question
    if (userQuest.scenario === "solve this question: What mental skill protects Kim Dokja's mind?" && 
        message.content.toLowerCase().includes('fourth wall')) {
        return await completeQuest(message, userQuests, userCoins, userQuest);
    }

    // Handle Salvation Church leader question
    if (userQuest.scenario === "solve this question: Who leads the Salvation Church?" && 
        message.content.toLowerCase() === "nirvana") {
        return await completeQuest(message, userQuests, userCoins, userQuest);
    }

    // Handle writers-hub compliment quest
    if (userQuest.scenario === "comment, compliment on a writers work in #writers-hub" && 
        message.channel.name === 'writers-hub' && 
        isCompliment(message)) {
        return await completeQuest(message, userQuests, userCoins, userQuest);
    }

    // Handle oc-and-media compliment quest
    if (userQuest.scenario === "comment, compliment on a artists work in #oc-and-media" && 
        message.channel.name === 'oc-and-media' && 
        isCompliment(message)) {
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