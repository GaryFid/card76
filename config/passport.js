const passport = require('passport');
// Временно отключим стратегии OAuth
// const GoogleStrategy = require('passport-google-oauth20').Strategy;
// const YandexStrategy = require('passport-yandex').Strategy;
const User = require('../models/user');

// Сериализация и десериализация пользователя
passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
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