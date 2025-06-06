const passport = require('passport');
const { User } = require('../models');

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
  } catch (error) {
    logAuth('DESERIALIZE_ERROR', { error: error.message });
    done(error);
  }
});



module.exports = passport; 