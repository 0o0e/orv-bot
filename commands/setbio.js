const fs = require('fs');
const { EmbedBuilder } = require('discord.js');

const MAX_BIO_LENGTH = 112; // Maximum characters for bio

function saveBios(bios) {
    fs.writeFileSync('./userBios.json', JSON.stringify(bios, null, 2));
}

function loadBios() {
    try {
        return JSON.parse(fs.readFileSync('./userBios.json', 'utf8'));
    } catch (error) {
        return {};
    }
}

module.exports = {
    name: 'setbio',
    description: 'Set your profile bio',
    async execute(message, args) {
        if (!args.length) {
            return message.reply('Please provide a bio! Usage: !setbio [your bio here]');
        }

        // Join args and clean the text
        let bio = args.join(' ');
        // Remove any leading/trailing spaces and any 'o' prefix that might get added

        if (bio.length > MAX_BIO_LENGTH) {
            return message.reply(`Your bio is too long! Maximum length is ${MAX_BIO_LENGTH} characters. Your bio was ${bio.length} characters.`);
        }

        const bios = loadBios();
        bios[message.author.id] = bio;
        saveBios(bios);

        const embed = new EmbedBuilder()
            .setColor('#0099ff')
            .setDescription(`✅ Your bio has been updated to: "${bio}"`)
            .setTimestamp();

        message.reply({ embeds: [embed] });
    }
}; 