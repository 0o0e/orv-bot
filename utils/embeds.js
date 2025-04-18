const { EmbedBuilder, AttachmentBuilder } = require('discord.js');

function createQuestEmbed(scenario, difficulty, timeLimit, reward) {
    const embed = new EmbedBuilder()
        .setColor('#0099ff')
        .addFields(
            { name: 'Difficulty', value: `**${difficulty}**`, inline: true },
            { name: 'Time Limit', value: `${timeLimit}`, inline: true },
            { name: 'Reward', value: `${reward} coins` },
            { name: 'Failure', value: 'No coins earned' }
        )
        .setDescription(`Your quest is: **${scenario}**`)
        .setTimestamp()
        .setFooter({ text: 'Good luck!' });
    return embed;
}

function createPurchaseEmbed(user, itemToBuy, itemPrice, remainingCoins, expirationTime) {
    const timeLeft = moment(expirationTime).fromNow(true);
    const embed = new EmbedBuilder()
        .setColor('#0099ff')
        .setTitle('Item purchase successful!')
        .setDescription(`Congratulations <@${user.id}>! You have successfully purchased the item **${itemToBuy}** for **${itemPrice} coins**!`)
        .addFields(
            { name: 'Remaining Coins', value: `${remainingCoins}`, inline: true },
            { name: 'Expires In', value: `${timeLeft}`, inline: true }
        )
        .setTimestamp()
        .setFooter({ text: 'Enjoy your new item!' });
    return embed;
}

function createCheckInEmbed(user, coins, streak, totalCoins, rewardsMessage) {
    const embed = new EmbedBuilder()
        .setColor('#0099ff')
        .setTitle('Daily Check-in')
        .setDescription(`You checked in successfully and earned **${coins} coins!**`)
        .addFields(
            { name: 'Current Streak', value: `${streak} days`, inline: true },
            { name: 'Total Coins', value: `${totalCoins} 🪙`, inline: true }
        )
        .addFields({ name: 'Rewards', value: rewardsMessage })
        .setTimestamp()
        .setFooter({ text: 'Keep checking in daily for more rewards!' });
    return embed;
}

module.exports = {
    createQuestEmbed,
    createPurchaseEmbed,
    createCheckInEmbed
}; 