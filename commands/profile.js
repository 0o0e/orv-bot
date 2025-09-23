const { AttachmentBuilder } = require('discord.js');
const { Canvas, loadImage, GlobalFonts } = require('@napi-rs/canvas');
const path = require('path');
const { pathToFileURL } = require('url');

const fs = require('fs');

// Register the font
const fontPath = path.join(__dirname, '..', 'fonts', 'BebasNeue-Regular.ttf');
GlobalFonts.registerFromPath(fontPath, 'Bebas Neue');

function loadBios() {
    try {
        const bios = JSON.parse(fs.readFileSync('./userBios.json', 'utf8'));
        // Convert any number values to strings to prevent "0" appearing
        Object.keys(bios).forEach(key => {
            if (typeof bios[key] === 'number') {
                bios[key] = bios[key].toString();
            }
        });
        return bios;
    } catch (error) {
        return {};
    }
}

async function createProfileCard(user, coins) {
    const width = 920;
    const height = 470;

    const canvas = new Canvas(width, height);
    const ctx = canvas.getContext('2d');

    // Enable text anti-aliasing
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // Load and draw background
const backgroundPath = path.join(__dirname, '..', 'assets', 'images', 'profile.png');

// Fix Windows backslashes → forward slashes
const normalizedPath = backgroundPath.replace(/\\/g, '/');

const background = await loadImage(normalizedPath);
ctx.drawImage(background, 0, 0, width, height);

    // Add shadow to text
    ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;

    // Draw user avatar
    const avatarSize = 200;
    const avatarX = 100;
    const avatarY = 50;
    const avatar = await loadImage(user.displayAvatarURL({ extension: 'png', size: 256 }));
    
    // Draw avatar with circular clip
    ctx.save();
    ctx.beginPath();
    ctx.arc(avatarX + avatarSize/2, avatarY + avatarSize/2, avatarSize/2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(avatar, avatarX, avatarY, avatarSize, avatarSize);
    ctx.restore();

    // Draw white outline for avatar
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(avatarX + avatarSize/2, avatarY + avatarSize/2, avatarSize/2, 0, Math.PI * 2);
    ctx.stroke();

    // Draw title
    ctx.textAlign = 'center';
    ctx.font = 'normal 38px "Bebas Neue"';
    const titleY = avatarY + avatarSize + 60;
    
    // Title text wrapping
    const title = '{ A RANDOM INCARNATION }';
    const titleMaxWidth = 220;
    const titleWords = title.split(' ');
    let titleLine = '';
    let titleLines = [];
    
    for (const word of titleWords) {
        const testLine = titleLine + (titleLine ? ' ' : '') + word;
        const metrics = ctx.measureText(testLine);
        
        if (metrics.width > titleMaxWidth) {
            titleLines.push(titleLine);
            titleLine = word;
        } else {
            titleLine = testLine;
        }
    }
    if (titleLine) {
        titleLines.push(titleLine);
    }

    // Draw brackets and title
    const bracketSpacing = 130;
    const lineHeight = 40;
    const totalHeight = titleLines.length * lineHeight;
    const centerX = avatarX + avatarSize/2;
    
    // Draw brackets
    ctx.font = 'normal 45px "Bebas Neue"';
    ctx.fillStyle = '#FFFFFF';
    
    // Draw title text
    ctx.font = 'normal 38px "Bebas Neue"';
    titleLines.forEach((line, index) => {
        ctx.fillText(line, centerX, titleY + (index * lineHeight));
    });

    // Text settings for the rest
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'left';

    // Define x-coordinates for text
    const textStartX = 450;

    // Draw username and coins
    ctx.font = 'normal 48px "Bebas Neue"';
    ctx.fillText(`User: ${user.username}`, textStartX, 100);
    ctx.fillText(`Coins: ${coins}`, textStartX, 160);

    // Draw Overall Evaluation text
    ctx.fillText('Overall Evaluation:', textStartX, 250);

    // Draw bio if it exists
    const bios = loadBios();
    let bio = bios[user.id] || 'No bio yet';
    const isDefaultBio = !bios[user.id];  // Check if using default bio
    
    // Clean up the bio text - remove any leading 'O' or '0'
    bio = bio.replace(/^[O0]\s*/, '');
    
    // Bio text with wrapping
    ctx.font = `normal ${isDefaultBio ? 'italic' : 'normal'} 36px "Bebas Neue"`;
    const maxWidth = width - (textStartX + 50);
    const words = bio.split(' ');
    let line = '';
    let y = 300;
    
    // Function to split long words
    function splitLongWord(word, maxWidth) {
        let parts = [];
        let currentPart = '';
        
        for (let char of word) {
            const testPart = currentPart + char;
            const metrics = ctx.measureText(testPart);
            
            if (metrics.width > maxWidth) {
                parts.push(currentPart);
                currentPart = char;
            } else {
                currentPart += char;
            }
        }
        
        if (currentPart) {
            parts.push(currentPart);
        }
        
        return parts;
    }
    
    for (const word of words) {
        const testLine = line + (line ? ' ' : '') + word;
        const metrics = ctx.measureText(testLine);
        
        if (metrics.width > maxWidth) {
            // If we have a previous line, draw it
            if (line) {
                ctx.fillText(line, textStartX, y);
                y += 40;
                line = '';
            }
            
            // Check if single word is too long
            if (ctx.measureText(word).width > maxWidth) {
                const parts = splitLongWord(word, maxWidth);
                parts.forEach((part, index) => {
                    ctx.fillText(part, textStartX, y);
                    if (index < parts.length - 1) {
                        y += 40;
                    }
                });
                line = '';
            } else {
                line = word;
            }
        } else {
            line = testLine;
        }
    }
    
    // Draw remaining line if any
    if (line) {
        ctx.fillText(line, textStartX, y);
    }

    return canvas;
}

async function handleProfileCommand(message) {
    try {
        const user = message.mentions.users.first() || message.author;
        const coinsData = JSON.parse(fs.readFileSync('./coins.json', 'utf8'));
        const coins = coinsData[user.id] || 0;

        const profileCanvas = await createProfileCard(user, coins);
const buffer = await profileCanvas.encode('png');
const attachment = new AttachmentBuilder(buffer, { name: 'profile.png' });

await message.reply({ files: [attachment] });
    } catch (error) {
        console.error('Error in profile command:', error);
        await message.reply('errrorrr.');
    }
}

module.exports = {
    handleProfileCommand
}; 