const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');
const bcrypt = require('bcryptjs');
const Friendship = require('./friendship');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  username: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      len: [3, 30],
      notEmpty: true
    }
  },
  email: {
    type: DataTypes.STRING,
    allowNull: true,
    unique: true,
    validate: {
      isEmail: true
    }
  },
  password: {
    type: DataTypes.STRING,
    allowNull: true // Может быть null для пользователей, авторизованных через соц. сети
  },
  birthDate: {
    type: DataTypes.DATE,
    allowNull: true // Делаем поле опциональным
  },
  registrationDate: {
    type: DataTypes.DATE,
    allowNull: true,
    defaultValue: DataTypes.NOW
  },
  telegramId: {
    type: DataTypes.STRING,
    allowNull: true,
    unique: true
  },
  googleId: {
    type: DataTypes.STRING,
    allowNull: true,
    unique: true
  },
  yandexId: {
    type: DataTypes.STRING,
    allowNull: true,
    unique: true
  },
  firstName: {
    type: DataTypes.STRING,
    allowNull: true
  },
  lastName: {
    type: DataTypes.STRING,
    allowNull: true
  },
  displayName: {
    type: DataTypes.STRING,
    allowNull: true
  },
  avatar: {
    type: DataTypes.STRING,
    allowNull: true
  },
  rating: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1000
  },
  coins: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  level: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1
  },
  experience: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  gamesPlayed: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  gamesWon: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  authType: {
    type: DataTypes.ENUM('local', 'telegram', 'google', 'yandex'),
    defaultValue: 'local'
  },
  lastLoginDate: {
    type: DataTypes.DATE,
    allowNull: true
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  display_name: {
    type: DataTypes.STRING
  },
  avatar_url: {
    type: DataTypes.STRING
  },
  school: { type: DataTypes.STRING, allowNull: true },
  referralCode: { type: DataTypes.STRING, unique: true, allowNull: true },
  telegram_username: {
    type: DataTypes.STRING
  },
  last_active: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'users',
  timestamps: true,
  hooks: {
    beforeCreate: async (user) => {
      if (user.password) {
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(user.password, salt);
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
      if (user.changed('password') && user.password) {
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(user.password, salt);
      }
    }
  },
  methods: {
    validatePassword: async function(password) {
      return await bcrypt.compare(password, this.password);
    }
  }
});

User.prototype.toPublicJSON = function() {
  return {
    id: this.id,
    username: this.username,
    displayName: this.displayName || this.username,
    avatar: this.avatar,
    rating: this.rating,
    level: this.level,
    coins: this.coins,
    gamesPlayed: this.gamesPlayed,
    gamesWon: this.gamesWon,
    authType: this.authType,
    registrationDate: this.registrationDate
  };
};

function generateReferralCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Определяем связи между пользователями (друзья)
User.belongsToMany(User, {
  as: 'friends',
  through: Friendship,
  foreignKey: 'userId',
  otherKey: 'friendId'
});

// Методы для работы с друзьями
User.prototype.addFriend = async function(friend) {
  const friendship = await Friendship.findOne({
    where: {
      userId: this.id,
      friendId: friend.id
    }
  });

  if (!friendship) {
    await Friendship.create({
      userId: this.id,
      friendId: friend.id,
      status: 'pending'
    });

    // Создаем обратную связь
    await Friendship.create({
      userId: friend.id,
      friendId: this.id,
      status: 'pending'
    });
  }
};

User.prototype.acceptFriend = async function(friendId) {
  await Friendship.update(
    { status: 'accepted' },
    {
      where: {
        userId: this.id,
        friendId: friendId
      }
    }
  );

  // Обновляем статус обратной связи
  await Friendship.update(
    { status: 'accepted' },
    {
      where: {
        userId: friendId,
        friendId: this.id
      }
    }
  );
};

User.prototype.removeFriend = async function(friendId) {
  await Friendship.destroy({
    where: {
      userId: this.id,
      friendId: friendId
    }
  });

  // Удаляем обратную связь
  await Friendship.destroy({
    where: {
      userId: friendId,
      friendId: this.id
    }
  });
};

User.prototype.blockFriend = async function(friendId) {
  await Friendship.update(
    { status: 'blocked' },
    {
      where: {
        userId: this.id,
        friendId: friendId
      }
    }
  );
};

User.prototype.getFriends = async function() {
  const friendships = await Friendship.findAll({
    where: {
      userId: this.id,
      status: 'accepted'
    },
    include: [{
      model: User,
      as: 'friend'
    }]
  });

  return friendships.map(f => f.friend);
};

User.prototype.getPendingFriends = async function() {
  const friendships = await Friendship.findAll({
    where: {
      userId: this.id,
      status: 'pending'
    },
    include: [{
      model: User,
      as: 'friend'
    }]
  });

  return friendships.map(f => f.friend);
};

module.exports = User; 