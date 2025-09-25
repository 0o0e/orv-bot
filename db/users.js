const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Open the SQLite database (adjust path if needed)
const dbPath = path.join(__dirname, '..', 'database.sqlite'); // or your actual DB file
const db = new sqlite3.Database(dbPath);

// Get user coins
function getUserCoins(userId) {
    return new Promise((resolve, reject) => {
        db.get('SELECT coins FROM users WHERE id = ?', [userId], (err, row) => {
            if (err) return reject(err);
            resolve(row ? BigInt(row.coins) : 0n);
        });
    });
}

// Set user coins
function setUserCoins(userId, coins) {
    return new Promise((resolve, reject) => {
        db.run('UPDATE users SET coins = ? WHERE id = ?', [coins.toString(), userId], function(err) {
            if (err) return reject(err);
            resolve();
        });
    });
}

module.exports = { getUserCoins, setUserCoins };
