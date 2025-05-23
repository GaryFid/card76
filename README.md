# Разгильдяй - Telegram Бот для карточной игры

Бот для игры "Разгильдяй" в Telegram с поддержкой мини-приложений.

## Особенности

- Многопользовательская карточная игра
- Поддержка игры с ИИ
- Система рейтинга игроков
- Веб-интерфейс с использованием Telegram WebApp
- Адаптивный дизайн
- Авторизация пользователей
- Простое JSON-хранилище данных

## Технологии

- Node.js
- Express.js
- Telegraf (Telegram Bot API)
- JSON хранилище данных
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
   ```

4. Запустить приложение:
   ```
   npm start
   ```

## Развертывание на Render

Проект можно легко развернуть на Render:

1. Создайте аккаунт на Render.com
2. Подключите репозиторий GitHub
3. Создайте Web Service с помощью конфигурации render.yaml:
   ```
   render blueprint render.yaml
   ```
   
   Или вручную:
   - Создайте новый Web Service
   - Добавьте постоянный диск объемом 1ГБ (для хранения JSON данных)
   - Настройте переменные окружения (BOT_TOKEN, SESSION_SECRET)

4. После создания сервиса, дождитесь полного развертывания
5. Проверьте, что ваш бот и мини-приложение работают

## Хранение данных

Приложение использует простое JSON-хранилище для данных:

- Пользователи: `data/users.json`
- Игры: `data/games.json`
- Сессии: `data/sessions/`

Благодаря использованию постоянного диска на Render, данные сохраняются между перезапусками сервиса.

## Структура проекта

- `/public` - Статические файлы для мини-приложения
- `/scenes` - Сцены Telegram бота
- `/routes` - Маршруты API
- `/models` - Модели для работы с JSON хранилищем
- `/config` - Файлы конфигурации
- `/utils` - Вспомогательные функции
- `/data` - Директория для хранения JSON данных

## Лицензия

MIT 