const passport = require('passport');
// Временно отключим стратегии OAuth
// const GoogleStrategy = require('passport-google-oauth20').Strategy;
// const YandexStrategy = require('passport-yandex').Strategy;
const TelegramLoginStrategy = require('passport-telegram-login').Strategy;
const config = require('../config');
const User = require('../models/user');

// Функция логирования для отладки
const logAuth = (step, data) => {
  console.log(`[PASSPORT ${step}]`, JSON.stringify(data, null, 2));
};

// Сериализация и десериализация пользователя
passport.serializeUser((user, done) => {
  logAuth('SERIALIZE', { userId: user.id, username: user.username });
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findByPk(id);
    logAuth('DESERIALIZE', { 
      userId: id, 
      found: !!user,
      username: user?.username 
    });
    done(null, user);
  } catch (err) {
    logAuth('DESERIALIZE_ERROR', { error: err.message });
    done(err, null);
  }
});

// Стратегии авторизации временно отключены
// Пользователи создаются напрямую через Telegram-бота в сцене авторизации (scenes/auth.js)

/*
// Стратегия для авторизации через Google
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: `${process.env.BASE_URL}/auth/google/callback`
}, async (accessToken, refreshToken, profile, done) => {
  try {
    let user = await User.findOne({ 'google.id': profile.id });
    
    if (!user) {
      user = new User({
        google: {
          id: profile.id,
          email: profile.emails[0].value,
          name: profile.displayName
        }
      });
      await user.save();
    }
    
    return done(null, user);
  } catch (err) {
    return done(err, null);
  }
}));

// Стратегия для авторизации через Яндекс
passport.use(new YandexStrategy({
  clientID: process.env.YANDEX_CLIENT_ID,
  clientSecret: process.env.YANDEX_CLIENT_SECRET,
  callbackURL: `${process.env.BASE_URL}/auth/yandex/callback`
}, async (accessToken, refreshToken, profile, done) => {
  try {
    let user = await User.findOne({ 'yandex.id': profile.id });
    
    if (!user) {
      user = new User({
        yandex: {
          id: profile.id,
          email: profile.emails[0].value,
          name: profile.displayName
        }
      });
      await user.save();
    }
    
    return done(null, user);
  } catch (err) {
    return done(err, null);
  }
}));
*/

// Telegram стратегия
passport.use(new TelegramLoginStrategy({
  botToken: config.botToken,
  botUsername: config.botUsername || 'YourBot', // Имя вашего бота
  passReqToCallback: true,
  verifyExpiration: true // Проверять срок действия данных авторизации
}, async (req, user, done) => {
  try {
    logAuth('TELEGRAM_AUTH_START', { user });

    // Ищем пользователя по telegramId или username
    let dbUser = await User.findOne({
      where: {
        [User.sequelize.Op.or]: [
          { telegramId: user.id.toString() },
          { username: user.username }
        ]
      }
    });

    logAuth('USER_SEARCH', { 
      found: !!dbUser,
      telegramId: user.id,
      username: user.username
    });

    if (!dbUser) {
      // Создаём нового пользователя
      dbUser = await User.create({
        telegramId: user.id.toString(),
        username: user.username,
        firstName: user.first_name,
        lastName: user.last_name,
        avatar: user.photo_url,
        authType: 'telegram',
        registrationDate: new Date(),
        rating: 0,
        coins: 0,
        level: 1
      });

      logAuth('USER_CREATED', { 
        userId: dbUser.id,
        username: dbUser.username
      });
    } else {
      // Обновляем существующего пользователя
      const updates = {
        telegramId: user.id.toString(),
        firstName: user.first_name,
        lastName: user.last_name,
        lastLoginDate: new Date()
      };

      // Обновляем аватар только если он есть
      if (user.photo_url) {
        updates.avatar = user.photo_url;
      }

      await dbUser.update(updates);
      
      logAuth('USER_UPDATED', { 
        userId: dbUser.id,
        username: dbUser.username,
        updates
      });
    }

    // Сохраняем в сессию
    if (req.session) {
      req.session.telegramId = user.id;
      req.session.username = user.username;
      
      logAuth('SESSION_SAVED', {
        sessionId: req.sessionID,
        telegramId: user.id,
        username: user.username
      });
    }

    return done(null, dbUser);
  } catch (error) {
    logAuth('AUTH_ERROR', { error: error.message });
    return done(error, null);
  }
}));

module.exports = passport; 