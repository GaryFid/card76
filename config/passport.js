const passport = require('passport');
// Временно отключим стратегии OAuth
// const GoogleStrategy = require('passport-google-oauth20').Strategy;
// const YandexStrategy = require('passport-yandex').Strategy;
const TelegramStrategy = require('passport-telegram-official').Strategy;
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
passport.use(new TelegramStrategy({
  botToken: config.botToken,
  passReqToCallback: true
}, async (req, profile, done) => {
  try {
    logAuth('TELEGRAM_AUTH_START', { profile });

    // Ищем пользователя по telegramId или username
    let user = await User.findOne({
      where: {
        [User.sequelize.Op.or]: [
          { telegramId: profile.id.toString() },
          { username: profile.username }
        ]
      }
    });

    logAuth('USER_SEARCH', { 
      found: !!user,
      telegramId: profile.id,
      username: profile.username
    });

    if (!user) {
      // Создаём нового пользователя
      user = await User.create({
        telegramId: profile.id.toString(),
        username: profile.username,
        firstName: profile.first_name,
        lastName: profile.last_name,
        avatar: profile.photo_url,
        authType: 'telegram',
        registrationDate: new Date(),
        rating: 0,
        coins: 0,
        level: 1
      });

      logAuth('USER_CREATED', { 
        userId: user.id,
        username: user.username
      });
    } else {
      // Обновляем существующего пользователя
      const updates = {
        telegramId: profile.id.toString(),
        firstName: profile.first_name,
        lastName: profile.last_name,
        lastLoginDate: new Date()
      };

      // Обновляем аватар только если он есть
      if (profile.photo_url) {
        updates.avatar = profile.photo_url;
      }

      await user.update(updates);
      
      logAuth('USER_UPDATED', { 
        userId: user.id,
        username: user.username,
        updates
      });
    }

    // Сохраняем в сессию
    if (req.session) {
      req.session.telegramId = profile.id;
      req.session.username = profile.username;
      
      logAuth('SESSION_SAVED', {
        sessionId: req.sessionID,
        telegramId: profile.id,
        username: profile.username
      });
    }

    return done(null, user);
  } catch (error) {
    logAuth('AUTH_ERROR', { error: error.message });
    return done(error, null);
  }
}));

module.exports = passport; 