const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');
const bcrypt = require('bcryptjs');

const User = sequelize.define('User', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  telegramId: { type: DataTypes.STRING, unique: true },
  username: { type: DataTypes.STRING },
  rating: { type: DataTypes.INTEGER, defaultValue: 1000 },
  email: { type: DataTypes.STRING, unique: true, allowNull: true },
  password: { type: DataTypes.STRING, allowNull: true },
  coins: { type: DataTypes.INTEGER, defaultValue: 0 },
  avatar: { type: DataTypes.STRING, allowNull: true },
  level: { type: DataTypes.INTEGER, defaultValue: 1 },
  school: { type: DataTypes.STRING, allowNull: true },
  referralCode: { type: DataTypes.STRING, unique: true, allowNull: true },
}, {
  tableName: 'users',
  timestamps: true,
  hooks: {
    beforeCreate: async (user) => {
      if (user.password) {
        user.password = await bcrypt.hash(user.password, 10);
      }
      if (!user.referralCode) {
        let code;
        let exists = true;
        while (exists) {
          code = generateReferralCode();
          exists = await User.findOne({ where: { referralCode: code } });
        }
        user.referralCode = code;
      }
    },
    beforeUpdate: async (user) => {
      if (user.changed('password')) {
        user.password = await bcrypt.hash(user.password, 10);
      }
    }
  }
});

User.prototype.checkPassword = async function(password) {
  if (!this.password) return false;
  return bcrypt.compare(password, this.password);
};

function generateReferralCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

module.exports = User; 