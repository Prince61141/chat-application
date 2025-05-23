const Chat = require('../models/Chat');

/**
 * @desc    Create or fetch one-on-one chat between two users
 * @route   POST /api/chat/create
 */
const createOrGetDirectChat = async (req, res) => {
  const { userId, otherUserId } = req.body;

  if (!userId || !otherUserId) {
    return res.status(400).json({ error: 'userId and otherUserId are required' });
  }

  try {
    let chat = await Chat.findOne({
      isGroupChat: false,
      users: { $all: [userId, otherUserId], $size: 2 }
    }).populate('users', 'username fullName');

    if (chat) {
      return res.json(chat);
    }

    chat = new Chat({
      chatName: 'Direct Chat',
      isGroupChat: false,
      users: [userId, otherUserId]
    });

    await chat.save();

    chat = await Chat.findById(chat._id).populate('users', 'username fullName');
    res.status(201).json(chat);
  } catch (error) {
    console.error('Error creating chat:', error);
    res.status(500).json({ error: 'Failed to create chat' });
  }
};

module.exports = {
  createOrGetDirectChat,
};
