import User from '../models/User.js';
import twilio from 'twilio';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
dotenv.config();

const otpStore = {}; // { mobile: { otp, expiresAt } }

const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

const ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER;

const client = twilio(ACCOUNT_SID, AUTH_TOKEN);

const sendOTPViaSMS = async (mobile, otp) => {
  await client.messages.create({
    body: `Your ChatApp OTP is: ${otp}`,
    from: TWILIO_PHONE_NUMBER,
    to: `+91${mobile}` // or just mobile if already includes country code
  });
};

// ✅ Send OTP for registration
const sendOTP = async (req, res) => {
  const { mobile } = req.body;
  if (!mobile) return res.status(400).json({ message: 'Mobile is required' });

  const otp = generateOTP();
  otpStore[mobile] = { otp, expiresAt: Date.now() + 5 * 60 * 1000 };

  try {
    await sendOTPViaSMS(mobile, otp);
    res.json({ message: 'OTP sent successfully' });
  } catch (err) {
    console.error('Twilio error:', err); // Add this line
    res.status(500).json({ message: 'Failed to send OTP', error: err.message });
  }
};

// ✅ Register user after OTP verification
const registerUser = async (req, res) => {
  const { fullName, username, email, mobile, otp } = req.body;
  const stored = otpStore[mobile];

  if (!stored || stored.otp !== otp || Date.now() > stored.expiresAt) {
    return res.status(400).json({ message: 'Invalid or expired OTP' });
  }

  const existing = await User.findOne({
    $or: [{ username }, { email }, { mobile }]
  });
  if (existing) return res.status(400).json({ message: 'User already exists' });

  const newUser = new User({ fullName, username, email, mobile });
  await newUser.save();

  delete otpStore[mobile];
  res.status(201).json({ message: 'User registered successfully' });
};

const loginRequest = async (req, res) => {
  try {
    const { identifier } = req.body;
    if (!identifier) {
      return res.status(400).json({ message: 'Identifier is required' });
    }

    const user = await User.findOne({
      $or: [{ username: identifier }, { mobile: identifier }]
    });
    if (!user) return res.status(404).json({ message: 'User not found' });

    const otp = generateOTP();
    otpStore[user.mobile] = { otp, expiresAt: Date.now() + 5 * 60 * 1000 };

    await sendOTPViaSMS(user.mobile, otp);
    res.json({ message: 'OTP sent to registered mobile' });
  } catch (err) {
    console.error("loginRequest error:", err);
    res.status(500).json({ message: 'Failed to send OTP', error: err.message });
  }
};

const verifyLoginOTP = async (req, res) => {
  const { identifier, otp } = req.body;

  // Validate OTP logic here (assumed valid for demo)
  const user = await User.findOne({ $or: [{ username: identifier }, { mobile: identifier }] });
  if (!user) return res.status(400).json({ message: 'User not found' });

  // Assume OTP verification passed
  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '15d' });
  res.status(200).json({ user, token });
};

export {
  sendOTP,
  registerUser,
  loginRequest,
  verifyLoginOTP
};
