const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  telegram: {
    id: String,
    username: String,
    firstName: String,
    lastName: String
  },
  google: {
    id: String,
    email: String,
    name: String
  },
  yandex: {
    id: String,
    email: String,
    name: String
  },
  rating: {
    type: Number,
    default: 0
  },
  gamesPlayed: {
    type: Number,
    default: 0
  },
  gamesWon: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Виртуальное свойство для имени пользователя
userSchema.virtual('displayName').get(function() {
  if (this.telegram && this.telegram.username) {
    return this.telegram.username;
  } else if (this.google && this.google.name) {
    return this.google.name;
  } else if (this.yandex && this.yandex.name) {
    return this.yandex.name;
  }
  return 'Игрок';
});

module.exports = mongoose.model('User', userSchema); 