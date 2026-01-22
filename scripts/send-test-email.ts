
import { config } from 'dotenv';
import { resolve } from 'path';
import { sendPromotionEmail } from '../lib/email';

// Load environment variables from .env.local
config({ path: resolve(__dirname, '../.env.local') });

async function main() {
    const email = process.argv[2];

    if (!email) {
        console.error('Please provide an email address as an argument.');
        console.log('Usage: npx tsx scripts/send-test-email.ts <your-email>');
        process.exit(1);
    }

    console.log(`Sending test email to ${email}...`);

    try {
        const result = await sendPromotionEmail({
            to: email,
            userName: 'Test User',
            date: '2026-03-15', // Random date in Ramadan 2026
            cancelUrl: 'http://localhost:3000/dashboard'
        });

        console.log('Email sent successfully!');
        console.log('Result:', result);
    } catch (error) {
        console.error('Failed to send email:', error);
    }
}

main();
