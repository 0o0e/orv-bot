const { createCheckInEmbed } = require('../utils/embeds');

async function handleCheckInCommand(input, userCheckins, userCoins) {
    // Ensure userCheckins and userCoins are initialized
    if (!userCheckins) userCheckins = {};
    if (!userCoins) userCoins = {};
    
    const userId = input.user?.id || input.author.id;

    if (!userCheckins[userId]) {
        userCheckins[userId] = {
            lastCheckIn: null,
            streak: 0,
            lastReward: 0
        };
    }

    const userCheckin = userCheckins[userId];
    const currentTime = new Date();

    // Check if user has already checked in today
    if (userCheckin.lastCheckIn) {
        const lastCheckIn = new Date(userCheckin.lastCheckIn);
        const timeDiff = currentTime - lastCheckIn;
        const hoursDiff = timeDiff / (1000 * 60 * 60);

        if (hoursDiff < 24) {
            const remainingHours = Math.ceil(24 - hoursDiff);
            const response = `You have already checked in today! Please wait **${remainingHours} hours** before checking in again.`;
            if (input.reply) {
                await input.reply(response);
            } else {
                await input.channel.send(response);
            }
            return { checkins: userCheckins, userCoins };
        }
    }

    let streak = userCheckin.streak;
    let coins = 0;

    // Calculate streak and rewards
    if (!userCheckin.lastCheckIn || (currentTime - new Date(userCheckin.lastCheckIn)) > 48 * 60 * 60 * 1000) {
        // Reset streak if more than 48 hours have passed
        streak = 1;
    } else if ((currentTime - new Date(userCheckin.lastCheckIn)) > 24 * 60 * 60 * 1000) {
        // Increment streak if it's been more than 24 hours but less than 48
        streak += 1;
    }

    // Calculate rewards based on streak
    if (streak <= 7) {
        coins = streak * 5; // Day 1 = 5 coins, Day 2 = 10 coins, ..., Day 7 = 35 coins
    } else {
        coins = 35; // After day 7, maintain 35 coins per day
    }

    // Add bonus for perfect week
    if (streak === 7) {
        coins += 15; // Bonus 15 coins for completing a week
    }

    // Initialize user's coins if they don't exist
    if (!userCoins[userId]) {
        userCoins[userId] = BigInt(0);
    }

    // Convert current coins to BigInt if they're not already
    if (typeof userCoins[userId] !== 'bigint') {
        userCoins[userId] = BigInt(userCoins[userId]);
    }

    // Add reward as BigInt
    userCoins[userId] += BigInt(coins);

    // Update user's check-in data
    userCheckins[userId] = {
        lastCheckIn: currentTime,
        streak: streak,
        lastReward: coins
    };

    // Create the rewards display
    let rewardsMessage = "";
    for (let i = 1; i <= 7; i++) {
        const reward = i * 5;
        if (i <= streak) {
            rewardsMessage += `✅ Day ${i} - +${reward} 🪙\n`;
        } else {
            rewardsMessage += `⬜ Day ${i} - +${reward} 🪙\n`;
        }
    }

    // Add weekly bonus information
    if (streak === 7) {
        rewardsMessage += "\n✨ **Weekly Bonus**: +15 🪙";
    }

    // Create and send the check-in embed
    const checkInEmbed = createCheckInEmbed(input.user || input.author, streak, coins, userCoins[userId].toString(), rewardsMessage);
    
    if (input.reply) {
        await input.reply({ embeds: [checkInEmbed] });
    } else {
        await input.channel.send({ embeds: [checkInEmbed] });
    }

    return { checkins: userCheckins, userCoins };
}

module.exports = {
    handleCheckInCommand
}; 