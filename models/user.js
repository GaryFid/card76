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
    unique: true
  },
  email: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: true
  },
  password: {
    type: DataTypes.STRING,
    allowNull: true
  },
  telegram_id: {
    type: DataTypes.STRING,
    unique: true
  },
  telegram_username: {
    type: DataTypes.STRING
  },
  display_name: {
    type: DataTypes.STRING
  },
  avatar_url: {
    type: DataTypes.STRING
  },
  rating: {
    type: DataTypes.INTEGER,
    defaultValue: 1000
  },
  gamesWon: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  coins: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  avatar: { type: DataTypes.STRING, allowNull: true },
  level: {
    type: DataTypes.INTEGER,
    defaultValue: 1
  },
  school: { type: DataTypes.STRING, allowNull: true },
  referralCode: { type: DataTypes.STRING, unique: true, allowNull: true },
  authType: {
    type: DataTypes.ENUM('basic', 'telegram', 'guest'),
    defaultValue: 'basic'
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
  return await bcrypt.compare(password, this.password);
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