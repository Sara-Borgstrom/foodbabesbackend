import express from 'express'
import bodyParser from 'body-parser'
import cors from 'cors'
import mongoose from 'mongoose'
import bcrypt from 'bcrypt-nodejs'
import crypto from 'crypto'
import dotenv from 'dotenv'
import cloudinary from 'cloudinary'
import multer from 'multer'
import cloudinaryStorage from 'multer-storage-cloudinary'

const mongoUrl = process.env.MONGO_URL || "mongodb://localhost/Foodbabes"
mongoose.connect(mongoUrl, { useNewUrlParser: true, useUnifiedTopology: true })
mongoose.Promise = Promise

// Upload model
const Food = mongoose.model('Food', {
  title: String,
  link: String,
  imageUrl: String,
  imageId: String,
  description: String,
  type: String
})

//Inlog model
const User = mongoose.model('User', {
  name: {
    type: String,
    required: true,
    maxlength: 10
  },
  password: {
    type: String,
    required: true
  },
  accessToken: {
    type: String,
    default: () => crypto.randomBytes(128).toString('hex')
  }
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


const port = process.env.PORT || 8080
const app = express()

// Add middlewares to enable cors and json body parsing
app.use(cors())
app.use(bodyParser.json())


app.post('/foods', parser.single('image'), async(req, res) => {
  const { title, link, description, type } = req.body
  const imageUrl = req.file.secure_url
  const imageId = req.file.public_id

  try {
    const food = await new Food({
      title,
      link,
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

app.get('/foods', async(req, res) => {
  try {
    const foods = await Food.find()
    res.status(200).json(foods)
  } catch (err) {
    res.status(400).json({ message: 'Could not fins food', errors: err.errors })
  }
})


// Sign in


app.post('/users', async(req, res) => {
  try {
    const { name, password } = req.body
    const user = new User({ name, password: bcrypt.hashSync(password) })
    user.save()
    res.status(201).json({ id: user._id, accessToken: user.accessToken })
  } catch (err) {
    res.status(400).json({ message: "Could not create user", errors: err.errors })
  }
})

const authenticateUser = async(req, res, next) => {
  try {
    const user = await User.findOne({ accessToken: req.header('Authorization') })
    if (user) {
      req.user = user
      next()
    } else {
      res.status(401).json({ loggedOut: true, message: 'Please try logging in again!' })
    }
  } catch (err) {
    res.status(403).json({ message: 'Access token is missing or wrong', error: err.errors })
  }
}

app.post('/sessions', async(req, res) => {
  const user = await User.findOne({ name: req.body.name })
  if (user && bcrypt.compareSync(req.body.password, user.password)) {
    res.json({ userId: user._id, accessToken: user.accessToken })
  } else {
    res.json({ notFound: true })
  }
})


app.get('/users/current', authenticateUser)
app.get('/users/current', (req, res) => {
  res.json(req.user)
})

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`)
})