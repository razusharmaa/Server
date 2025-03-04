// src/utils/emailUtils.js

import nodemailer from 'nodemailer';
import Mailgen from 'mailgen';

const sendMail = async ({ to, subject, html, text }) => {
    // Nodemailer configuration
    const config = {
        service: 'gmail',
        auth: {
            user: process.env.EMAIL,
            pass: process.env.PASSWORD,
        },
    };

    const transporter = nodemailer.createTransport(config);

    // Mailgen configuration
    const MailGenerator = new Mailgen({
        theme: 'default',
        product: {
            name: 'Flowmotion IT Services',
            link: process.env.FRONTEND_URL,
            copyright: '© 2024 Flowmotion IT Services. All rights reserved.',
        },
    });

    try {
        const message = {
            from: process.env.EMAIL,
            to,
            subject,
            html,
            text,
        };

        await transporter.sendMail(message);
    } catch (error) {
        throw new Error(error.message || "Failed to send email.");
    }
};

export {sendMail};
