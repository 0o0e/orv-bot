const { ActionRowBuilder, ButtonBuilder, ButtonStyle, AttachmentBuilder, EmbedBuilder } = require('discord.js');
const { createPurchaseEmbed } = require('../utils/embeds');
const { createShopCanvas } = require('../utils/shopCanvas');
const fs = require('fs');
const path = require('path');

// Load shop items from JSON file
function loadShopItems() {
    const shopPath = path.join(__dirname, '..', 'data', 'shop.json');
    try {
        const data = fs.readFileSync(shopPath, 'utf8');
        return JSON.parse(data).items;
    } catch (error) {
        console.error('Error loading shop items:', error);
        return [];
    }
}

async function handleShopCommand(interaction, page = 1) {
    const items = loadShopItems();
    const itemsPerPage = 7;
    const maxPages = Math.ceil(items.length / itemsPerPage);
    
    // Ensure page is within valid range
    page = Math.max(1, Math.min(page, maxPages));
    
    // Get items for current page
    const startIndex = (page - 1) * itemsPerPage;
    const pageItems = items.slice(startIndex, startIndex + itemsPerPage);

    // Create embed
    const embed = new EmbedBuilder()
        .setTitle(`Shop - Page ${page}/${maxPages}`)
        .setColor('#0099ff');

    // Build shop items description
    const description = ['<     Dokkaebi bag      >\n'];
    
    pageItems.forEach(item => {
        let itemLine = `${item.emoji || '🔹'} **${item.name}** | ${item.price} 🪙\n`;
        if (item.description) {
            itemLine += `${item.description}\n`;
        }
        description.push(itemLine);
    });

    embed.setDescription(description.join('\n'));

    // Create navigation and purchase buttons
    const rows = [];
    
    // Split purchase buttons into rows (3 buttons per row)
    for (let i = 0; i < pageItems.length; i += 3) {
        const row = new ActionRowBuilder();
        const rowButtons = pageItems.slice(i, i + 3).map(item => 
            new ButtonBuilder()
                .setCustomId(`buy_${item.id}`)
                .setLabel(`Buy ${item.name}`)
                .setStyle(ButtonStyle.Primary)
        );
        row.addComponents(rowButtons);
        rows.push(row);
    }

    // Add navigation buttons in a new row if there are multiple pages
    if (maxPages > 1) {
        const navigationRow = new ActionRowBuilder();
        
        if (page > 1) {
            navigationRow.addComponents(
                new ButtonBuilder()
                    .setCustomId('prev_page')
                    .setLabel('Previous')
                    .setStyle(ButtonStyle.Secondary)
            );
        }
        
        navigationRow.addComponents(
            new ButtonBuilder()
                .setCustomId('page_indicator')
                .setLabel(`Page ${page}/${maxPages}`)
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(true)
        );
        
        if (page < maxPages) {
            navigationRow.addComponents(
                new ButtonBuilder()
                    .setCustomId('next_page')
                    .setLabel('Next')
                    .setStyle(ButtonStyle.Secondary)
            );
        }
        
        rows.push(navigationRow);
    }

    const messageContent = {
        embeds: [embed],
        components: rows
    };

    if (interaction.deferred) {
        await interaction.editReply(messageContent);
    } else if (interaction.replied) {
        await interaction.editReply(messageContent);
    } else if (interaction.reply) {
        await interaction.reply(messageContent);
    } else {
        await interaction.channel.send(messageContent);
    }
}
async function handleShopInteraction(interaction, userCoins, buyingUserId) {
    try {
        if (interaction.user.id !== buyingUserId) {
            await interaction.reply({
                content: 'You must use the /shop or !shop command yourself to make purchases.',
                ephemeral: true
            });
            return null;
        }

        const customId = interaction.customId;
        
        // Handle navigation buttons
        if (customId === 'prev_page' || customId === 'next_page') {
            // Get current page from the page indicator button
            const pageIndicator = interaction.message.components.slice(-1)[0].components.find(c => c.customId === 'page_indicator');
            const [currentPage, maxPages] = pageIndicator.label.split('/').map(n => parseInt(n.replace('Page ', '')));
            
            const newPage = customId === 'prev_page' ? currentPage - 1 : currentPage + 1;
            await interaction.deferUpdate();
            await handleShopCommand(interaction, newPage);
            return userCoins;
        }

        // Handle item purchase
        const itemId = customId.replace('buy_', '');
        const items = loadShopItems();
        const item = items.find(i => i.id === itemId);

        if (!item) {
            await interaction.reply({ content: 'Invalid item selected.', ephemeral: true });
            return null;
        }

        const userId = interaction.user.id;
        if (!userCoins[userId] || userCoins[userId] < item.price) {
            await interaction.reply({
                content: `You do not have enough coins to buy ${item.name}. You need ${item.price} coins.`,
                ephemeral: true
            });
            return null;
        }

        if (item.type === 'role') {
            const role = interaction.guild.roles.cache.find(r => r.name === itemId);
            const member = interaction.member;

            if (!role) {
                await interaction.reply({
                    content: `Role ${item.name} not found in this server.`,
                    ephemeral: true
                });
                return null;
            }

            if (member.roles.cache.has(role.id)) {
                await interaction.reply({
                    content: `You already have the role ${item.name}.`,
                    ephemeral: true
                });
                return null;
            }

            // Add the role
            await member.roles.add(role);
            userCoins[userId] = BigInt(userCoins[userId]) - BigInt(item.price);

            // Create purchase embed
            const purchaseEmbed = new EmbedBuilder()
                .setColor(item.color || '#0099ff')
                .setTitle('Purchase Successful!')
                .setDescription(`You have purchased ${item.name} for ${item.price} coins!`)
                .addFields(
                    { name: 'Remaining Coins', value: `${userCoins[userId]}`, inline: true },
                    { name: 'Duration', value: `${item.duration / 1000} seconds`, inline: true }
                )
                .setTimestamp();

            await interaction.reply({ embeds: [purchaseEmbed] });

            // Schedule role removal after duration
            setTimeout(async () => {
                try {
                    if (member.roles.cache.has(role.id)) {
                        await member.roles.remove(role);
                        
                        const expirationEmbed = new EmbedBuilder()
                            .setColor('#ff0000')
                            .setTitle('Role Expired')
                            .setDescription(`Your ${item.name} role has expired and has been removed.`)
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
            }, parseInt(item.duration));
        }

        return userCoins;
    } catch (error) {
        console.error('Error in handleShopInteraction:', error);
        await interaction.reply({
            content: 'An error occurred while processing your purchase. Please try again later.',
            ephemeral: true
        });
        return null;
    }
}

module.exports = {
    handleShopCommand,
    handleShopInteraction
}; 