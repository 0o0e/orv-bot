const Database = require('better-sqlite3');
const db = new Database('database.sqlite');

// Ensure a user exists in the parent users table
function addUserIfNotExists(userId) {
    const exists = db.prepare(`SELECT 1 FROM users WHERE id = ?`).get(userId);
    if (!exists) {
        db.prepare(`INSERT INTO users (id) VALUES (?)`).run(userId);
    }
}

// Save or update quest
function saveUserQuest(userId, questData) {
    db.prepare(`
        INSERT INTO quests (user_id, scenario, difficulty, reward, messages_sent, start_time, expiration_time, messages)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(user_id) DO UPDATE SET
            scenario = excluded.scenario,
            difficulty = excluded.difficulty,
            reward = excluded.reward,
            messages_sent = excluded.messages_sent,
            start_time = excluded.start_time,
            expiration_time = excluded.expiration_time,
            messages = excluded.messages
    `).run(
        userId,
        questData.scenario,
        questData.difficulty,
        questData.reward,
        questData.messagesSent,
        questData.startTime,
        questData.expirationTime,
        JSON.stringify(questData.messages || [])
    );
}
// Load quest for a user
function getUserQuest(userId) {
    const row = db.prepare(`SELECT * FROM quests WHERE user_id = ?`).get(userId);
    if (!row) return null;

    return {
        scenario: row.scenario,
        difficulty: row.difficulty,
        reward: row.reward,
        messagesSent: row.messages_sent,
        startTime: row.start_time,
        expirationTime: row.expiration_time,
        messages: JSON.parse(row.messages || "[]")
    };
}

// Delete quest when finished
function deleteUserQuest(userId) {
    db.prepare('DELETE FROM quests WHERE user_id = ?').run(userId);
}

// Save cooldown
function saveCooldown(userId, cooldownUntil) {
    addUserIfNotExists(userId);

    db.prepare(`
        INSERT INTO quest_cooldowns (user_id, cooldown_until)
        VALUES (?, ?)
        ON CONFLICT(user_id) DO UPDATE SET cooldown_until = excluded.cooldown_until
    `).run(userId, cooldownUntil);
}

// Get cooldown
function getCooldown(userId) {
    const row = db.prepare(`SELECT cooldown_until FROM quest_cooldowns WHERE user_id = ?`).get(userId);
    return row ? row.cooldown_until : null;
}

module.exports = {
    saveUserQuest,
    getUserQuest,
    deleteUserQuest,
    saveCooldown,
    getCooldown
};
