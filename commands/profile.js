const { AttachmentBuilder } = require('discord.js');
const { Canvas, loadImage, GlobalFonts } = require('@napi-rs/canvas');
const fs = require('fs');
const path = require('path');

// Register the font
const fontPath = path.join(__dirname, '..', 'fonts', 'Roboto-Bold.ttf');
GlobalFonts.registerFromPath(fontPath, 'Roboto Bold');

async function handleProfileCommand(input) {
    try {
        // Create a new canvas
        const canvas = new Canvas(800, 600);
        const ctx = canvas.getContext('2d');

        // Load the background image
        const background = await loadImage('./profile.png');
        ctx.drawImage(background, 0, 0, canvas.width, canvas.height);

        // Get user info
        const user = input.author || input.user;
        if (!user) {
            throw new Error('Could not determine user');
        }

        // Load and draw user avatar
        try {
            const avatar = await loadImage(user.displayAvatarURL({ extension: 'png', size: 256 }));
            // Draw circular avatar
            ctx.save();
            ctx.beginPath();
            ctx.arc(canvas.width / 2, 150, 64, 0, Math.PI * 2, true);
            ctx.closePath();
            ctx.clip();
            ctx.drawImage(avatar, canvas.width / 2 - 64, 86, 128, 128);
            ctx.restore();

            // Draw avatar border
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.arc(canvas.width / 2, 150, 64, 0, Math.PI * 2, true);
            ctx.stroke();
        } catch (avatarError) {
            console.error('Error loading avatar:', avatarError);
        }

        // Get user data
        const coinsData = JSON.parse(fs.readFileSync('./coins.json', 'utf8'));
        const checkinsData = JSON.parse(fs.readFileSync('./checkins.json', 'utf8'));
        const userCoins = coinsData[user.id] || '0';
        const userStreak = checkinsData[user.id]?.streak || 0;

        // Set up gradients for text
        const gradient = ctx.createLinearGradient(0, 0, canvas.width, 0);
        gradient.addColorStop(0, '#ffffff');  // More vibrant gold
        gradient.addColorStop(1, '#ffffff');  // Orange tint

        // Draw username
        ctx.font = '48px "Roboto Bold"';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#000000';
        ctx.fillText(user.username, canvas.width / 2 + 2, 270 + 2); // Shadow
        ctx.fillStyle = gradient;
        ctx.fillText(user.username, canvas.width / 2, 270);


        
        // Reset shadow
        ctx.shadowBlur = 0;

        // Function to draw centered text with label and value
        const drawCenteredStats = (label, value, y, labelColor, valueColor) => {
            ctx.font = '32px "Roboto Bold"';
            
            // Calculate center point and offsets
            const centerX = canvas.width / 2;
            const spacing = 20; // Space between label and value
            
            // Draw label (left side)
            ctx.textAlign = 'right';
            // Shadow for label
            ctx.fillStyle = '#000000';
            ctx.fillText(label, centerX - spacing + 2, y + 2);
            ctx.fillStyle = labelColor;
            ctx.fillText(label, centerX - spacing, y);

            // Draw value (right side)
            ctx.textAlign = 'left';
            // Shadow for value
            ctx.fillStyle = '#000000';
            ctx.fillText(value, centerX + spacing + 2, y + 2);
            ctx.fillStyle = valueColor;
            ctx.fillText(value, centerX + spacing, y);
        };

        // Draw stats with more spacing between elements
        drawCenteredStats('💰 Coins:', userCoins, 380, '#ffffff', '#ffffff');
        drawCenteredStats('🔥 Streak:', `${userStreak} days`, 430, '#ffffff', '#ffffff');

        // Convert the canvas to a buffer
        const buffer = await canvas.encode('png');
        const attachment = new AttachmentBuilder(buffer, { name: 'profile.png' });

        // Send the profile card
        if (input.reply) {
            await input.reply({ files: [attachment] });
        } else if (input.channel) {
            await input.channel.send({ files: [attachment] });
        } else {
            throw new Error('Could not send message');
        }
    } catch (error) {
        console.error('Error in profile command:', error);
        const errorMessage = 'An error occurred while generating your profile. Please try again later.';
        
        try {
            if (input.reply) {
                await input.reply({ content: errorMessage, ephemeral: true });
            } else if (input.channel) {
                await input.channel.send(errorMessage);
            }
        } catch (replyError) {
            console.error('Error sending error message:', replyError);
        }
    }
}

module.exports = {
    handleProfileCommand
}; 