require('dotenv').config(); // Load environment variables

const express = require('express');
const mongoose = require('mongoose');
const nodemailer = require('nodemailer');
const cron = require('node-cron');
const cors = require('cors')
const Subscriber = require('./model');

const app = express();
app.use(cors({
  origin: '*',
  credentials: true
}));

app.use(express.json());

// MongoDB connection
mongoose.connect(process.env.DB_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.log(err));

// Nodemailer transporter setup
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

// Welcome email function
const sendWelcomeEmail = async (recipientEmail, name, message) => {
  try {
    // Send the message to the recipient
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: recipientEmail,
      subject: 'Contact Form Submission',
      text: `Hi ${name},

Thank you for contacting us!

Your message:

${message}

We will get back to you shortly.

Sincerely,

The Team`
    });

    // Send a copy of the message to the system's email
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: process.env.EMAIL_USER,
      subject: 'New Message Received',
      text: `You have a new message from ${name}:

${message}`
    });

    console.log(`Welcome email sent to ${recipientEmail} and confirmation email sent to ${process.env.EMAIL_USER}`);
  } catch (error) {
    console.error('Error sending welcome email:', error);
  }
};

// Bi-weekly email function
const sendBiWeeklyEmail = async () => {
  const subscribers = await Subscriber.find();
  for (const subscriber of subscribers) {
    try {
      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: subscriber.email,
        subject: 'Your Bi-Weekly Update!',
        text: 'Here is your bi-weekly update...'
      });
      console.log(`Bi-weekly email sent to ${subscriber.email}`);
    } catch (error) {
      console.error('Error sending bi-weekly email:', error);
    }
  }
};

// Endpoint to add new subscriber
app.post('/subscribe', async (req, res) => {
  const { email } = req.body;

  try {
    const checkEmailList = Subscriber.findOne(email);
    if(checkEmailList){
      return res.json({message: "You are already a subscriber!"})
    }
    const newSubscriber = new Subscriber({ email });
    await newSubscriber.save();
    await sendWelcomeEmail(email); // Send welcome email
    res.status(201).json({ message: 'Subscription successful, welcome email sent.' });
  } catch (error) {
    console.error('Error subscribing:', error);
    res.status(500).json({ error: 'Error subscribing user.' });
  }
});

// Endpoint to send a message
app.post('/message', async (req, res) => {
  const { recipientEmail, name, message } = req.body;

  try {
    await sendWelcomeEmail(recipientEmail, name, message);
    res.status(200).json({ message: 'Message sent successfully!' });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Error sending message.' });
  }
});

// Schedule bi-weekly emails
cron.schedule('0 0 */14 * *', () => {
  sendBiWeeklyEmail();
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});