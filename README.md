# Разгильдяй - Telegram Бот для карточной игры

Бот для игры "Разгильдяй" в Telegram с поддержкой мини-приложений.

## Особенности

- Многопользовательская карточная игра
- Поддержка игры с ИИ
- Система рейтинга игроков
- Веб-интерфейс с использованием Telegram WebApp
- Адаптивный дизайн
- Авторизация пользователей

## Технологии

- Node.js
- Express.js
- Telegraf (Telegram Bot API)
- MySQL
- Sequelize ORM
- Telegram WebApp API

## Установка

1. Клонировать репозиторий:
   ```
   git clone https://github.com/GaryFid/card76.git
   cd card76
   ```

2. Установить зависимости:
   ```
   npm install
   ```

3. Создать файл `.env` с следующими переменными:
   ```
   BOT_TOKEN=ваш_токен_бота
   SESSION_SECRET=секретный_ключ_для_сессий
   BASE_URL=url_вашего_приложения
   PORT=3000
   
   # MySQL настройки
   USE_MYSQL=true
   MYSQL_HOST=localhost
   MYSQL_PORT=3306
   MYSQL_USER=root
   MYSQL_PASSWORD=ваш_пароль
   MYSQL_DB=card76
   ```

4. Создайте базу данных MySQL:
   ```
   mysql -u root -p
   CREATE DATABASE card76;
   ```

5. Запустить приложение:
   ```
   npm start
   ```

## Развертывание на Render

Проект можно легко развернуть на Render с использованием MySQL:

1. Создайте аккаунт на Render.com
2. Подключите репозиторий GitHub
3. Создайте Web Service с MySQL с помощью конфигурации render.yaml:
   ```
   render blueprint render.yaml
   ```
   
   Или вручную:
   - Создайте новый Web Service
   - Затем создайте новую MySQL базу данных
   - Свяжите их через переменные окружения

4. После создания сервиса, дождитесь полного развертывания
5. Проверьте, что ваш бот и мини-приложение работают

## Структура проекта

- `/public` - Статические файлы для мини-приложения
- `/scenes` - Сцены Telegram бота
- `/routes` - Маршруты API
- `/models` - Модели для работы с базой данных
- `/config` - Файлы конфигурации
- `/utils` - Вспомогательные функции

## Лицензия

MIT 