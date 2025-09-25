const { REST, Routes, SlashCommandBuilder } = require('discord.js');
require('dotenv').config();

const commands = [
  new SlashCommandBuilder()
    .setName('profile')
    .setDescription('Shows your profile card')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('Whose profile to view')
    ),

  new SlashCommandBuilder()
    .setName('coins')
    .setDescription('Shows your coin balance'),

  new SlashCommandBuilder()
    .setName('checkin')
    .setDescription('Daily check-in to earn coins'),

  new SlashCommandBuilder()
    .setName('quest')
    .setDescription('Start a new quest or check your current quest'),

  new SlashCommandBuilder()
    .setName('shop')
    .setDescription('Open the shop'),

  new SlashCommandBuilder()
    .setName('setbio')
    .setDescription('Set your bio')
    .addStringOption(option =>
      option.setName('text')
        .setDescription('Your new bio')
        .setRequired(true)
    )
].map(cmd => cmd.toJSON());

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

(async () => {
  try {
    console.log('Registering slash commands...');
    await rest.put(
      Routes.applicationCommands(process.env.CLIENT_ID), // use applicationGuildCommands for faster local testing
      { body: commands }
    );
    console.log('Slash commands registered!');
  } catch (err) {
    console.error(err);
  }
})();
