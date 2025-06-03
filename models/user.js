const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const User = sequelize.define('User', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  telegramId: { type: DataTypes.STRING, unique: true },
  username: { type: DataTypes.STRING },
  rating: { type: DataTypes.INTEGER, defaultValue: 1000 },
  email: { type: DataTypes.STRING, unique: true, allowNull: true },
  password: { type: DataTypes.STRING, allowNull: true },
}, {
  tableName: 'users',
  timestamps: true
});

module.exports = User; 