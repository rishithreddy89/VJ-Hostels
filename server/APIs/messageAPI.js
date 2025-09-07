const exp = require('express');
const expressAsyncHandler = require('express-async-handler');
const messageApp = exp.Router();
const Message = require('../models/MessageModel');
const { uploadMessageImage } = require('../middleware/uploadMiddleware');
const path = require('path');
const fs = require('fs');

// Use /tmp for serverless environments (Vercel/Lambda), fall back to local path for development
const messageUploadsDir = process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME
  ? '/tmp/uploads/messages'
  : path.join(__dirname, '../uploads/messages');

// Create uploads directory for message images if it doesn't exist
try {
  if (!fs.existsSync(messageUploadsDir)) {
    fs.mkdirSync(messageUploadsDir, { recursive: true });
    // Set proper permissions for /tmp directories in serverless environment
    if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
      fs.chmodSync(messageUploadsDir, 0o777);
    }
  }
} catch (error) {
  console.error('Error creating message uploads directory:', error);
  // Don't throw error in production, just log it
}

// Get all messages
messageApp.get('/all', expressAsyncHandler(async (req, res) => {
    try {
        const messages = await Message.find({ room: 'community' })
            .sort({ createdAt: 1 })
            .limit(100);
        res.status(200).json(messages);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}));

// Upload image for message
messageApp.post('/upload-image', uploadMessageImage, expressAsyncHandler(async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: "No image uploaded" });
        }

        // Create the URL for the uploaded file
        const imageUrl = `${req.protocol}://${req.get('host')}/uploads/messages/${req.file.filename}`;

        res.status(200).json({
            message: "Image uploaded successfully",
            imageUrl: imageUrl
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}));

// Create a new message
messageApp.post('/create', expressAsyncHandler(async (req, res) => {
    try {
        const { content, sender, senderModel, senderName, senderRollNumber, senderProfilePhoto, isAdmin, image } = req.body;

        const newMessage = new Message({
            content,
            sender,
            senderModel,
            senderName,
            senderRollNumber,
            senderProfilePhoto,
            isAdmin,
            image,
            room: 'community'
        });

        await newMessage.save();

        res.status(201).json({
            message: "Message created successfully",
            newMessage
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}));

module.exports = messageApp;
