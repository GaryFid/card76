const express = require('express');
const passport = require('passport');
const router = express.Router();

// Telegram авторизация - временно отключена из-за проблем с модулем
/*
router.get('/telegram/login', passport.authenticate('telegram'));
router.get('/telegram/callback', passport.authenticate('telegram', {
  successRedirect: '/auth/success',
  failureRedirect: '/auth/failure'
}));
*/

// Google авторизация
router.get('/google/login', passport.authenticate('google', {
  scope: ['profile', 'email']
}));
router.get('/google/callback', passport.authenticate('google', {
  successRedirect: '/auth/success',
  failureRedirect: '/auth/failure'
}));

// Яндекс авторизация
router.get('/yandex/login', passport.authenticate('yandex'));
router.get('/yandex/callback', passport.authenticate('yandex', {
  successRedirect: '/auth/success',
  failureRedirect: '/auth/failure'
}));

// Страницы успеха и ошибки
router.get('/success', (req, res) => {
  res.json({
    success: true,
    message: 'Авторизация успешна',
    user: req.user
  });
});

router.get('/failure', (req, res) => {
  res.json({
    success: false,
    message: 'Ошибка авторизации'
  });
});

// Выход
router.get('/logout', (req, res) => {
  req.logout(function(err) {
    if (err) {
      return next(err);
    }
    res.redirect('/');
  });
});

module.exports = router; 