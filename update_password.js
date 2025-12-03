const db = require('./database');
const bcrypt = require('bcryptjs');

async function updateAdminPassword() {
    try {
        await db.initDatabase();

        const username = 'ranjan';
        const newPassword = 'what@2020';
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        const client = await db.pool.connect();
        try {
            await client.query(
                'UPDATE users SET password = $1 WHERE username = $2',
                [hashedPassword, username]
            );
            console.log(`✅ Password for user '${username}' updated successfully.`);
        } finally {
            client.release();
        }

        process.exit(0);
    } catch (error) {
        console.error('❌ Failed to update password:', error);
        process.exit(1);
    }
}

updateAdminPassword();
