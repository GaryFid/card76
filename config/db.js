const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(process.env.DATA_BASE, {
  dialect: 'postgres',
  protocol: 'postgres',
  logging: false,
  dialectOptions: {
    ssl: process.env.NODE_ENV === 'production' ? { require: true, rejectUnauthorized: false } : false
  }
});

module.exports = sequelize; 