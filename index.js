require('dotenv').config();
const express = require('express');
const cron = require('node-cron');
const mongoose = require('mongoose')
const nodemailer = require('nodemailer');
const cors = require('cors')
const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors({
    origin: '*',
    credentials: true
}));

const DbUrRI = process.env.DB_URI;

mongoose.connect(DbUrRI)
.then(() => {
    console.log('Connected to MongoDB Database');
}).catch(err => {
    console.error('Error connecting to MongoDB', err);
});

const subscriberSchema = new mongoose.Schema({
    email: { type: String, required: true }
});

const Subscriber = mongoose.model('Subscriber', subscriberSchema);


const transporter = nodemailer.createTransport({
    service: 'Gmail',
    auth: {
      user: process.env.EMAIL_ADDRESS, // Replace with your Gmail email
      pass: process.env.EMAIL_PASSWORD // Replace with your Gmail password (consider using environment variables for security)
    }
  });

  const sendNewsletter = (subscriber) => {
    const mailOptions = {
        from: process.env.EMAIL_ADDRESS,
        to: subscriber.email,
        subject: 'Welcome to Our Newsletter!',
        text: `Hello ${subscriber.email}, thank you for subscribing to our newsletter!`
    };

    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.log(error);
        } else {
            console.log('Email sent: ' + info.response);
        }
    });
};
app.post('/dm_me', async (req, res) => {
    const {name, email, message} = req.body;

    const mailOptions = {
        from: email,
        to: process.env.EMAIL_ADDRESS,
        subject: `A New Message from ${name}`,
        text: message,
    };
  
    await transporter.sendMail(mailOptions);
    console.log({name, email, message})
    res.status(201).json({Message: 'sucess'})
});

app.post('/subscribe', async (req, res) => {
    const { email } = req.body;

    try {
        // Save the subscriber to the database
        const newSubscriber = new Subscriber({ email });
        await newSubscriber.save();

        // Send the welcome email immediately
        sendNewsletter(newSubscriber);

        res.status(200).json({ message: 'Subscribed successfully!' });
    } catch (error) {
        res.status(500).json({ message: 'Subscription failed', error });
    }
});


// Schedule a task to send the newsletter on the 1st of every month at 9:00 AM
cron.schedule('0 9 1 * *', async () => {
    try {
        const subscribers = await Subscriber.find();

        subscribers.forEach(subscriber => {
            sendNewsletter(subscriber);
        });

        console.log('Monthly newsletter sent to all subscribers');
    } catch (error) {
        console.error('Error sending monthly newsletter', error);
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
