const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const nodemailer = require('nodemailer');
const cron = require('node-cron');
const url = 'mongodb+srv://isakkiraj:Esscooty%407300@cluster0.fdsuknk.mongodb.net/expense';

const app = express();

app.use(cors());
app.use(express.json());

require("dotenv").config()

const port = process.env.PORT || 5000;

// MongoDB connection
mongoose.connect(url)
    .then(() => console.log('MongoDB connected'))
    .catch(err => console.log(err));

// Models
const User = require('./models/user');
const Expense = require('./models/expense');

// Nodemailer setup
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// Routes
app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await User.findOne({ email });
        if (user) {
            if (user.password === password) {
                res.json({ success: true, userId: user._id });
            } else {
                res.json({ success: false, message: 'Password is incorrect' });
            }
        } else {
            res.json({ success: false, message: 'No user exists with this email' });
        }
    } catch (error) {
        console.error('Error during login:', error);
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
});

app.post('/api/register', async (req, res) => {
    try {
        const user = await User.create(req.body);
        res.json(user);
    } catch (error) {
        console.error('Error during registration:', error);
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
});

app.post('/api/expense', async (req, res) => {
    try {
        const expense = await Expense.create(req.body);
        res.json(expense);
    } catch (error) {
        console.error('Error creating expense:', error);
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
});

app.get('/api/user/:id', async (req, res) => {
    const { id: userId } = req.params;
    try {
        const user = await User.findById(userId);
        res.json(user);
    } catch (error) {
        console.error('Error fetching user:', error);
        res.status(500).json({ message: 'Internal Server Error', error });
    }
});

app.get('/api/expenses/:userId', async (req, res) => {
    const { userId } = req.params;
    try {
        const expenses = await Expense.find({ userId });
        res.json(expenses);
    } catch (error) {
        console.error('Error fetching expenses:', error);
        res.status(500).json({ message: 'Internal Server Error', error });
    }
});

// Email reminder function
async function sendReminderEmail(email) {
    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: 'Monthly Expense Reminder',
        text: 'This is a reminder to check your monthly expenses.'
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log('Reminder email sent to ' + email);
    } catch (error) {
        console.error('Error sending email:', error);
    }
}

// Cron job to send email reminders on the first of every month
cron.schedule('0 0 1 * *', async () => {
    console.log('Running cron job to send reminders...');
    try {
        const users = await User.find({});
        users.forEach(user => {
            sendReminderEmail(user.email);
        });
    } catch (error) {
        console.error('Error during cron job:', error);
    }
});

app.listen(port, () => {
    console.log(`Server started on http://localhost:${port}`);
});
