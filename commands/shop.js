const { ActionRowBuilder, ButtonBuilder, ButtonStyle, AttachmentBuilder, EmbedBuilder } = require('discord.js');
const { createPurchaseEmbed } = require('../utils/embeds');
const moment = require('moment-timezone');

const roles = {
    testrole1: 300,
    testrole2: 300,
    testrole3: 300,
};

async function handleShopCommand(message) {
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

async function handleShopInteraction(interaction, userCoins, buyingUserId) {
    try {
        if (interaction.user.id !== buyingUserId) {
            await interaction.reply({ 
                content: 'You must use the !shop command yourself to purchase an item.', 
                ephemeral: true 
            });
            return userCoins;
        }

        const userId = interaction.user.id;
        const roleToBuy = interaction.customId;
        const rolePrice = roles[roleToBuy];

        if (!rolePrice) {
            await interaction.reply({ content: `Invalid role selected.`, ephemeral: true });
            return userCoins;
        }

        if (userCoins[userId] < rolePrice) {
            await interaction.reply({ 
                content: `You do not have enough coins to buy ${roleToBuy}. You need ${rolePrice} coins.`, 
                ephemeral: true 
            });
            return userCoins;
        }

        const role = interaction.guild.roles.cache.find(r => r.name === roleToBuy);
        const member = interaction.member;

        if (!role) {
            await interaction.reply({ 
                content: `Role ${roleToBuy} not found in this server.`, 
                ephemeral: true 
            });
            return userCoins;
        }

        if (member.roles.cache.has(role.id)) {
            await interaction.reply({ 
                content: `You already have the role ${roleToBuy}.`, 
                ephemeral: true 
            });
            return userCoins;
        }

        // Add the role
        await member.roles.add(role);
        userCoins[userId] = BigInt(userCoins[userId]) - BigInt(rolePrice);

        // Create purchase embed
        const purchaseEmbed = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle('Purchase Successful!')
            .setDescription(`You have purchased the role ${roleToBuy} for ${rolePrice} coins!`)
            .addFields(
                { name: 'Remaining Coins', value: `${userCoins[userId]}`, inline: true },
                { name: 'Role Duration', value: '1 minute', inline: true }
            )
            .setTimestamp();

        await interaction.reply({ embeds: [purchaseEmbed] });

        // Schedule role removal after 1 minute
        setTimeout(async () => {
            try {
                if (member.roles.cache.has(role.id)) {
                    await member.roles.remove(role);
                    
                    // Send expiration message
                    const expirationEmbed = new EmbedBuilder()
                        .setColor('#ff0000')
                        .setTitle('Role Expired')
                        .setDescription(`Your ${roleToBuy} role has expired and has been removed.`)
                        .setTimestamp();

                    const dokkaebiBagChannel = interaction.guild.channels.cache.find(channel => channel.name === 'dokkaebi-bag');
                    if (dokkaebiBagChannel) {
                        await dokkaebiBagChannel.send({ 
                            content: `<@${userId}>`, 
                            embeds: [expirationEmbed] 
                        });
                    }
                }
            } catch (error) {
                console.error('Error removing role:', error);
            }
        }, 60 * 1000); // 1 minute

        return userCoins;
    } catch (error) {
        console.error('Error in handleShopInteraction:', error);
        await interaction.reply({ 
            content: 'An error occurred while processing your purchase. Please try again later.', 
            ephemeral: true 
        });
        return userCoins;
    }
}

module.exports = {
    handleShopCommand,
    handleShopInteraction
}; 