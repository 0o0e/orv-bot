const { AttachmentBuilder } = require('discord.js');
const { Canvas, loadImage, GlobalFonts } = require('@napi-rs/canvas');
const path = require('path');
const { pathToFileURL } = require('url');

const fs = require('fs');

const fontPath = path.join(__dirname, '..', 'fonts', 'BebasNeue-Regular.ttf');
GlobalFonts.registerFromPath(fontPath, 'Bebas Neue');

function loadBios() {
    try {
        const bios = JSON.parse(fs.readFileSync('./userBios.json', 'utf8'));
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
    const height = 420;
    const canvas = new Canvas(width, height);
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
const backgroundPath = path.join(__dirname, '..', 'assets', 'images', 'profile.png');

const normalizedPath = backgroundPath.replace(/\\/g, '/');

const background = await loadImage(normalizedPath);
ctx.drawImage(background, 0, 0, width, height);
    ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;

    const avatarSize = 200;
    const avatarX = 150;
    const avatarY = 50;
    const avatar = await loadImage(user.displayAvatarURL({ extension: 'png', size: 256 }));
    
    ctx.save();
    ctx.beginPath();
    ctx.arc(avatarX + avatarSize/2, avatarY + avatarSize/2, avatarSize/2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(avatar, avatarX, avatarY, avatarSize, avatarSize);
    ctx.restore();

    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(avatarX + avatarSize/2, avatarY + avatarSize/2, avatarSize/2, 0, Math.PI * 2);
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.font = 'normal 38px "Bebas Neue"';
    const titleY = avatarY + avatarSize + 60;
    
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

    const bracketSpacing = 130;
    const lineHeight = 40;
    const totalHeight = titleLines.length * lineHeight;
    const centerX = avatarX + avatarSize/2;
    
    ctx.font = 'normal 45px "Bebas Neue"';
    ctx.fillStyle = '#FFFFFF';
    
    ctx.font = 'normal 38px "Bebas Neue"';
    titleLines.forEach((line, index) => {
        ctx.fillText(line, centerX, titleY + (index * lineHeight));
    });

    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'left';

    const textStartX = 450;

    ctx.font = 'normal 48px "Bebas Neue"';
    ctx.fillText(`User: ${user.username}`, textStartX, 100);
    ctx.fillText(`Coins: ${coins}`, textStartX, 160);

    ctx.fillText('Overall Evaluation:', textStartX, 250);

    const bios = loadBios();
    let bio = bios[user.id] || 'No bio yet';
    const isDefaultBio = !bios[user.id]; 
    
    bio = bio.replace(/^[O0]\s*/, '');
    
    ctx.font = `normal ${isDefaultBio ? 'italic' : 'normal'} 36px "Bebas Neue"`;
    const maxWidth = width - (textStartX + 50);
    const words = bio.split(' ');
    let line = '';
    let y = 300;
    
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
            if (line) {
                ctx.fillText(line, textStartX, y);
                y += 40;
                line = '';
            }
            
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

async function handleProfileSlashCommand(interaction) {
    try {
        const user = interaction.options.getUser('user') || interaction.user;
        const coinsData = JSON.parse(fs.readFileSync('./coins.json', 'utf8'));
        const coins = coinsData[user.id] || 0;

        const profileCanvas = await createProfileCard(user, coins);
        const buffer = await profileCanvas.encode('png');
        const attachment = new AttachmentBuilder(buffer, { name: 'profile.png' });

        await interaction.reply({ files: [attachment] });
    } catch (error) {
        console.error('Error in profile slash command:', error);

        if (interaction.deferred || interaction.replied) {
            await interaction.followUp({ content: 'errrorrr.', ephemeral: true });
        } else {
            await interaction.reply({ content: 'errrorrr.', ephemeral: true });
        }
    }
}


module.exports = {
    handleProfileCommand,
    handleProfileSlashCommand
}; 