const { User } = require('./models');
const { initDatabase } = require('./models');

(async () => {
  try {
    // Устанавливаем строку подключения к базе явно
    process.env.DATABASE_URL = 'postgresql://user_igakha95:EUFasxUtgLODxo4a1BJfM1SzFyOOhKrs@dpg-d0s15r95pdvs7393i2k0-a/dbpdr_card';
    await initDatabase();
    const users = await User.findAll();
    console.log('Все пользователи:');
    users.forEach(user => {
      console.log({
        id: user.id,
        username: user.username,
        email: user.email,
        registrationDate: user.registrationDate,
        authType: user.authType
      });
    });
    process.exit(0);
  } catch (err) {
    console.error('Ошибка:', err);
    process.exit(1);
  }
})(); 