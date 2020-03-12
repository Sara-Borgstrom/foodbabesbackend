import express from 'express'
import bodyParser, { text } from 'body-parser'
import cors from 'cors'
import mongoose from 'mongoose'
import dotenv from 'dotenv'
import cloudinary from 'cloudinary'
import multer from 'multer'
import cloudinaryStorage from 'multer-storage-cloudinary'

const mongoUrl = process.env.MONGO_URL || "mongodb://localhost/blog"
mongoose.connect(mongoUrl, { useNewUrlParser: true, useUnifiedTopology: true })
mongoose.Promise = Promise

const Food = mongoose.model('Food', {
  restaurantId: Number,
  title: String,
  url: String,
  imageUrl: String,
  imageId: String,
  description: String,
  type: String
})

dotenv.config()

cloudinary.config({
  cloud_name: 'saraborg',
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
})

const storage = cloudinaryStorage({
  cloudinary,
  folder: 'food',
  allowedFormats: ['jpg', 'jpeg', 'png'],
  transformation: [{ width: 500, height: 500, crop: "limit" }]
})

const parser = multer({ storage })




const Comment = mongoose.model('Comment', {
  message: {
    type: String,
    required: true,
    minlength: 5,
    maxlength: 140
  },
  likes: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
})

const port = process.env.PORT || 8080
const app = express()

// Add middlewares to enable cors and json body parsing
app.use(cors())
app.use(bodyParser.json())

// Start defining your routes here
app.get('/', async(req, res) => {
  const comments = await Comment.find().sort({ createdAt: 'desc' }).limit(20).exec();
  res.json(comments);
})

app.get('/:commentId', async(req, res) => {
  const commentId = req.params.commentId
  Comment.findOne({ '_id': commentId })
    .then((result) => {
      res.json(result)
    })
})

app.post('/foods', parser.single('image'), async(req, res) => {
  const { restaurantId, title, url, description, type } = req.body
  const imageUrl = req.file.secure_url
  const imageId = req.file.public_id

  try {
    const food = await new Food({
      restaurantId,
      title,
      url,
      imageUrl,
      imageId,
      description,
      type
    }).save()
    res.json(food)
  } catch (err) {
    res.status(400).json({ message: 'Could not create post', errors: err.errors })
  }
})


app.post('/', async(req, res) => {
  const comment = new Comment({
    message: req.body.message,
    likes: 0
  })
  try {
    const saved = await comment.save()
    res.status(201).json(saved)
  } catch (err) {
    res.status(400).json({ message: 'Could not save comment', errors: err.errors })
  }
})

app.post('/:id/like', async(req, res) => {
  try {
    const comment = await Comment.updateOne({ _id: req.params.id }, { $inc: { likes: 1 } }, { new: true })
    res.status(200), json(comment)
  } catch (err) {
    res.status(400).json({ message: 'Could not add like', errors: err.errors })
  }
})

// Start the server
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`)
})