const mongoose = require('mongoose');

const gameSchema = new mongoose.Schema({
  players: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    cards: [Object],
    score: {
      type: Number,
      default: 0
    },
    isBot: {
      type: Boolean,
      default: false
    }
  }],
  currentPlayer: {
    type: Number,
    default: 0
  },
  deck: [Object],
  discardPile: [Object],
  status: {
    type: String,
    enum: ['waiting', 'active', 'finished'],
    default: 'waiting'
  },
  winner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  lastMoveAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Game', gameSchema); 