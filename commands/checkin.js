const { createCheckInEmbed } = require('../utils/embeds');
const Database = require('better-sqlite3');
const db = new Database('./database.sqlite');

// Ensure tables exist
db.prepare(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    coins INTEGER DEFAULT 0
  )
`).run();

db.prepare(`
  CREATE TABLE IF NOT EXISTS checkins (
    user_id TEXT PRIMARY KEY,
    last_checkin TEXT,
    streak INTEGER DEFAULT 0,
    FOREIGN KEY(user_id) REFERENCES users(id)
  )
`).run();

async function handleCheckInCommand(input) {
    const userId = input.user?.id || input.author.id;
    const currentTime = new Date();

    // Ensure user exists in users table
    db.prepare(`
        INSERT OR IGNORE INTO users (id, coins) VALUES (?, 0)
    `).run(userId);

    // Get user's checkin data
    let userCheckin = db.prepare(`SELECT * FROM checkins WHERE user_id = ?`).get(userId);

    if (!userCheckin) {
        // Initialize if first time
        userCheckin = {
            last_checkin: null,
            streak: 0
        };
        db.prepare(`
            INSERT INTO checkins (user_id, last_checkin, streak) VALUES (?, ?, ?)
        `).run(userId, null, 0);
    }

    // Check if already checked in today
    if (userCheckin.last_checkin) {
        const lastCheckIn = new Date(userCheckin.last_checkin);
        const hoursDiff = (currentTime - lastCheckIn) / (1000 * 60 * 60);

        if (hoursDiff < 24) {
            const remainingHours = Math.ceil(24 - hoursDiff);
            const response = `You have already checked in today! Please wait **${remainingHours} hours** before checking in again.`;
            if (input.reply) await input.reply(response);
            else await input.channel.send(response);
            return;
        }
    }

    // Calculate streak
    let streak = userCheckin.streak;
    if (!userCheckin.last_checkin || (currentTime - new Date(userCheckin.last_checkin)) > 48 * 60 * 60 * 1000) {
        streak = 1; // reset streak
    } else if ((currentTime - new Date(userCheckin.last_checkin)) > 24 * 60 * 60 * 1000) {
        streak += 1; // increment streak
    }

    // Calculate coins
    let coins = streak <= 7 ? streak * 5 : 35;
    if (streak === 7) coins += 15; // weekly bonus

    // Update coins in users table
    const userData = db.prepare(`SELECT coins FROM users WHERE id = ?`).get(userId);
    const newCoins = (BigInt(userData.coins) + BigInt(coins)).toString();
    db.prepare(`UPDATE users SET coins = ? WHERE id = ?`).run(newCoins, userId);

    // Update checkin data
    db.prepare(`UPDATE checkins SET last_checkin = ?, streak = ? WHERE user_id = ?`)
      .run(currentTime.toISOString(), streak, userId);

    // Create rewards message
    let rewardsMessage = "";
    for (let i = 1; i <= 7; i++) {
        const reward = i * 5;
        rewardsMessage += (i <= streak ? `✅` : `⬜`) + ` Day ${i} - +${reward} 🪙\n`;
    }
    if (streak === 7) rewardsMessage += "\n✨ **Weekly Bonus**: +15 🪙";

    // Send embed
    const checkInEmbed = createCheckInEmbed(input.user || input.author, streak, coins, newCoins, rewardsMessage);
    if (input.reply) await input.reply({ embeds: [checkInEmbed] });
    else await input.channel.send({ embeds: [checkInEmbed] });
}

module.exports = { handleCheckInCommand };
