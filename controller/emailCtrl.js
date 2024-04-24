const nodemailer = require("nodemailer");
const asyncHandler = require("express-async-handler");
require('dotenv').config();

const sendEmail = asyncHandler(async (data) => {
    const transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 465,
        secure: true,
        auth: {
            user: process.env.MAIL_ID,
            pass: process.env.MAIL_APP_PASSWORD
        }
    });

    try {
        const info = await transporter.sendMail({
            from: `"Hey 👻" <${process.env.MAIL_ID}>`,
            to: data.to,
            subject: data.subject,
            text: data.text,
            html: data.html,
        });

        console.log('Message sent: %s', info.messageId);
        console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
    } catch (error) {
        console.error('Error sending email:', error);
    }
});

module.exports = sendEmail;
