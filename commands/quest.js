const { AttachmentBuilder, EmbedBuilder } = require('discord.js');
const { Canvas, loadImage, GlobalFonts } = require('@napi-rs/canvas');
const { quests, isCompliment } = require('../quests.js');
const { createQuestEmbed } = require('../utils/embeds');
const path = require('path');
const fs = require('fs');
const { getUserCoins, setUserCoins } = require('../db/users');

// Path for saving quest data
// const QUEST_DATA_PATH = path.join(__dirname, '..', 'data', 'questData.json');


const { saveUserQuest, getUserQuest, deleteUserQuest, saveCooldown, getCooldown } = require('../db/quests');

// Function to save quest data
function saveQuestData(userQuests, cooldowns) {
    // Ensure the data directory exists
    const dataDir = path.dirname(QUEST_DATA_PATH);
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
    }

    const data = {
        userQuests,
        cooldowns
    };
    fs.writeFileSync(QUEST_DATA_PATH, JSON.stringify(data, (key, value) => {
        // Convert BigInt to string for JSON storage
        if (typeof value === 'bigint') {
            return value.toString();
        }
        return value;
    }, 2));
}

// Function to load quest data
function loadQuestData() {
    if (!fs.existsSync(QUEST_DATA_PATH)) {
        return { userQuests: {}, cooldowns: {} };
    }

    try {
        const data = JSON.parse(fs.readFileSync(QUEST_DATA_PATH, 'utf8'));
        return {
            userQuests: data.userQuests || {},
            cooldowns: data.cooldowns || {}
        };
    } catch (error) {
        console.error('Error loading quest data:', error);
        return { userQuests: {}, cooldowns: {} };
    }
}

// Register the font
const fontPath = path.join(__dirname, '..', 'fonts', 'BebasNeue-Regular.ttf');
GlobalFonts.registerFromPath(fontPath, 'Bebas Neue');

// Define different time limits for different difficulties (in milliseconds)
const difficultyTimes = {
    // Easy: 1000 * 30, // 30 seconds
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
    const seconds = Math.floor((ms % (1000 * 60)) / 1000);

    if (hours > 0) {
        return `${hours} hour${hours !== 1 ? 's' : ''} and ${minutes} minute${minutes !== 1 ? 's' : ''}`;
    } else if (minutes > 0) {
        return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
    } else {
        return `${seconds} second${seconds !== 1 ? 's' : ''}`;
    }
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
    const width = 920;
    const height = 580;

    const canvas = new Canvas(width, height);
    const ctx = canvas.getContext('2d');

    // Enable text anti-aliasing
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // Load and draw background
    const background = await loadImage('./profile.png');
    ctx.drawImage(background, 0, 0, width, height);

    // Shadow settings
    ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;

    // Text settings
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'center';

    // Title
    ctx.font = 'normal 64px "Bebas Neue"';
    ctx.fillText('< NEW QUEST >', width / 2, 100);

    // Info block
    ctx.textAlign = 'left';

    const leftMargin = 120;
    const rightMargin = 120;
    let y = 200;

    // Draw Clear Condition label
    ctx.font = 'normal 48px "Bebas Neue"';  // Label font size
    const clearConditionLabel = 'CLEAR CONDITION:';
    ctx.fillText(clearConditionLabel, leftMargin, y);
    
    // Calculate width of the label to know where to start the scenario text
    const labelWidth = ctx.measureText(clearConditionLabel).width + 20;
    
    // Handle scenario text wrapping with larger font
    ctx.font = 'normal 44px "Bebas Neue"';  // Scenario text slightly smaller than label
    const maxWidth = width - (leftMargin + rightMargin);
    const wrappedLines = [];
    
    // Split scenario into words
    const words = scenario.split(' ');
    let currentLine = '';
    let isFirstLine = true;
    
    for (const word of words) {
        const testLine = currentLine + (currentLine ? ' ' : '') + word;
        const testWidth = isFirstLine ? 
            ctx.measureText(testLine).width + leftMargin + labelWidth :
            ctx.measureText(testLine).width + leftMargin;
            
        if (testWidth > width - rightMargin) {
            wrappedLines.push(currentLine);
            currentLine = word;
            isFirstLine = false;
        } else {
            currentLine = testLine;
        }
    }
    if (currentLine) {
        wrappedLines.push(currentLine);
    }
    
    // Draw wrapped text
    wrappedLines.forEach((line, i) => {
        const xPos = i === 0 ? leftMargin + labelWidth : leftMargin;
        ctx.fillText(line, xPos, y + (i * 50));  // Increased line spacing for larger font
    });

    // Update y position based on number of lines
    y += Math.max(70, (wrappedLines.length * 50)) + 20;

    // Draw remaining stats
    const stats = [
        { label: 'DIFFICULTY:', value: difficulty },
        { label: 'TIME LIMIT:', value: timeLimit },
        { label: 'REWARDS:', value: `${reward} COINS` }
    ];

    stats.forEach(stat => {
        // Draw label with larger font
        ctx.font = 'normal 48px "Bebas Neue"';
        ctx.fillText(stat.label, leftMargin, y);
        
        // Draw value with slightly smaller font
        ctx.font = 'normal 44px "Bebas Neue"';
        ctx.fillText(stat.value, leftMargin + 260, y);
        y += 65;  // Increased spacing between stats
    });

    return canvas;
}

async function handleQuestCommand(input, userCoins) {
    const userId = input.user?.id || input.author.id;
    const currentTime = Date.now();

    // Check for existing quest
    const existingQuest = getUserQuest(userId);
    if (existingQuest && currentTime < existingQuest.expirationTime) {
        const remainingTime = existingQuest.expirationTime - currentTime;
        const timeLeft = formatTime(remainingTime);

        const questCanvas = await createQuestCard(
            existingQuest.scenario,
            existingQuest.difficulty,
            timeLeft,
            existingQuest.reward
        );

        const buffer = await questCanvas.encode('png');
        const attachment = new AttachmentBuilder(buffer, { name: 'quest.png' });

        const questEmbed = new EmbedBuilder()
            .setColor('#0099ff')
            .setDescription(`You already have a quest! You have **${timeLeft}** left to finish it.`)
            .setImage('attachment://quest.png')
            .setTimestamp();

        const replyContent = {
            content: `${input.user || input.author}`,
            embeds: [questEmbed],
            files: [attachment]
        };

        if (input.reply) await input.reply(replyContent);
        else await input.channel.send(replyContent);

        return;
    }

    // Check cooldown
    const cooldownUntil = getCooldown(userId);
    if (cooldownUntil && currentTime < cooldownUntil) {
        const timeLeft = cooldownUntil - currentTime;
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

        if (input.reply) await input.reply(replyContent);
        else await input.channel.send(replyContent);

        return;
    }

    // New quest
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

    if (input.reply) await input.reply(replyContent);
    else await input.channel.send(replyContent);

    // Save quest + cooldown in DB
    const newQuest = {
    scenario: selectedQuest.quest || "Unknown Quest", // MUST exist
    difficulty: selectedQuest.difficulty || "Easy",
    reward: selectedQuest.reward || 0,
    messagesSent: 0,
    startTime: Date.now(),
    expirationTime: Date.now() + difficultyTimes[selectedQuest.difficulty],
    messages: []
};

saveUserQuest(userId, newQuest);

    saveUserQuest(userId, newQuest);
    saveCooldown(userId, currentTime + timeLimit + cooldown);
}


// Add this function to check for spam
function isSpam(messages, newMessage) {
    if (messages.length === 0) return false;

    // Check time between messages (minimum 30 seconds)
    const lastMessage = messages[messages.length - 1];
    const timeDiff = newMessage.timestamp - lastMessage.timestamp;
    if (timeDiff < 30000) { // 30 seconds in milliseconds
        return true;
    }

    // Check for similar content using Levenshtein distance
    function levenshteinDistance(str1, str2) {
        const m = str1.length;
        const n = str2.length;
        const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

        for (let i = 0; i <= m; i++) dp[i][0] = i;
        for (let j = 0; j <= n; j++) dp[0][j] = j;

        for (let i = 1; i <= m; i++) {
            for (let j = 1; j <= n; j++) {
                if (str1[i - 1] === str2[j - 1]) {
                    dp[i][j] = dp[i - 1][j - 1];
                } else {
                    dp[i][j] = 1 + Math.min(
                        dp[i - 1][j],     // deletion
                        dp[i][j - 1],     // insertion
                        dp[i - 1][j - 1]  // substitution
                    );
                }
            }
        }
        return dp[m][n];
    }

    // Calculate similarity ratio
    const similarityThreshold = 0.8;
    for (const message of messages) {
        const distance = levenshteinDistance(message.content.toLowerCase(), newMessage.content.toLowerCase());
        const maxLength = Math.max(message.content.length, newMessage.content.length);
        const similarity = 1 - (distance / maxLength);
        
        if (similarity > similarityThreshold) {
            return true;
        }
    }

    return false;
}

async function checkQuestCompletion(message,userCoins) {
    const userId = message.author.id;
    const userQuest = getUserQuest(userId);
    
if (!userQuest) {
    return; // Exit early
}


    if (Date.now() > userQuest.expirationTime) {
        const dokkaebiBagChannel = message.client.channels.cache.get('1292907948330451025');
        const failedQuestEmbed = new EmbedBuilder()
            .setColor('#ff0000')
            .setTitle('Quest Failed!')
            .setDescription(`You failed to complete your quest: **${userQuest.scenario}** within the time limit.`)
            .setTimestamp();
        await dokkaebiBagChannel.send({ content: `<@${userId}>`, embeds: [failedQuestEmbed] });
        deleteUserQuest(userId);
        return;
    }

    const scenario = userQuest.scenario;

    // Handle message-based quests
    if (scenario === "send a message in #off-topic" && message.channel.name === 'off-topic') {
        await completeQuest(message, userQuest);
        return;
    }

    if (scenario === "send 10 messages in #general in the span of 1 hour, no spam allowed" &&
        message.channel.name === 'general') {

        if (!userQuest.messages) userQuest.messages = [];

        const newMessage = { content: message.content, timestamp: Date.now() };
        if (isSpam(userQuest.messages, newMessage)) return;

        userQuest.messages.push(newMessage);
        userQuest.messagesSent++;

        if (userQuest.messagesSent >= 10 && Date.now() - userQuest.startTime <= 3600000) {
            await completeQuest(message, userQuest);
            return;
        }
        saveUserQuest(userId, userQuest);
        return;
    }

    // Add other scenario checks as before...
    // Example:
    if (scenario.includes("solve this question:") &&
        ["yoo mia", "yu mia"].includes(message.content.toLowerCase())) {
        await completeQuest(message, userQuest);
        return;
    }
}

async function completeQuest(message, userQuest) {
    const userId = message.author.id;
    const dokkaebiBagChannel = message.client.channels.cache.get('1292907948330451025');

    const reward = BigInt(userQuest.reward || 0);
    let coins = await getUserCoins(userId);
    coins += reward;
    await setUserCoins(userId, coins);

    const attachment = new AttachmentBuilder(
        path.join(__dirname, '..', 'assets', 'images', 'completedquest.png')
    );

    const embed = new EmbedBuilder()
        .setColor('#0099ff')
        .setTitle('Quest Completed!')
        .setImage('attachment://completedquest.png')
        .setDescription(`You earned ${reward} coins! You now have ${coins} coins.`)
        .setTimestamp();

    await dokkaebiBagChannel.send({ content: `<@${userId}>`, embeds: [embed], files: [attachment] });

    deleteUserQuest(userId);
}


module.exports = {
    handleQuestCommand,
    checkQuestCompletion,
    loadQuestData
}; 