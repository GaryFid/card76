const express = require('express');
const path = require('path');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const { User, initDatabase } = require('./models');
const config = require('./config');

const app = express();

// Настройка Express
app.use(express.json());
app.use(express.static('public'));
app.use(session({
    secret: config.session.secret,
    resave: false,
    saveUninitialized: true
}));

// Telegram Bot
let bot = null;
if (config.telegram.enabled && config.telegram.token) {
    const TelegramBot = require('node-telegram-bot-api');
    bot = new TelegramBot(config.telegram.token, { polling: true });
    bot.on('message', async (msg) => {
        const chatId = msg.chat.id;
        if (msg.text && msg.text.startsWith('/start auth_')) {
            // Здесь будет логика аутентификации через Telegram
            bot.sendMessage(chatId, 'Аутентификация через Telegram...');
        }
    });
    console.log('Telegram бот успешно запущен');
} else {
    console.log('Telegram бот отключен');
}

// Маршруты
app.post('/auth/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        const user = await User.findOne({
            where: { username }
        });

        if (!user) {
            return res.json({ success: false, message: 'Пользователь не найден' });
        }

        const match = await user.validatePassword(password);

        if (!match) {
            return res.json({ success: false, message: 'Неверный пароль' });
        }

        req.session.userId = user.id;
        res.json({ success: true, user: user.toPublicJSON() });
    } catch (error) {
        console.error('Ошибка при входе:', error);
        res.json({ success: false, message: 'Ошибка сервера' });
    }
});

app.post('/auth/register', async (req, res) => {
    try {
        const { username, password } = req.body;
        const existingUser = await User.findOne({ where: { username } });
        if (existingUser) {
            return res.json({ success: false, message: 'Пользователь уже существует' });
        }
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        const user = await User.create({
            username,
            password: hashedPassword,
            authType: 'local',
            registrationDate: new Date()
        });
        req.session.userId = user.id;
        res.json({ success: true, user: user.toPublicJSON() });
    } catch (error) {
        console.error('Ошибка при регистрации:', error);
        res.json({ success: false, message: 'Ошибка сервера' });
    }
});

app.get('/auth/telegram', (req, res) => {
    if (!config.telegram.enabled || !config.telegram.username) {
        return res.status(500).json({ success: false, message: 'Вход через Telegram временно недоступен' });
    }
    const authToken = Date.now().toString(36) + Math.random().toString(36).substr(2);
    res.redirect(`https://t.me/${config.telegram.username}?start=auth_${authToken}`);
});

// Инициализация базы данных и запуск сервера
initDatabase()
    .then(() => {
        app.listen(config.server.port, () => {
            console.log(`Сервер запущен на порту ${config.server.port}`);
        });
    })
    .catch(error => {
        console.error('Ошибка при инициализации базы данных:', error);
        process.exit(1);
    }); 