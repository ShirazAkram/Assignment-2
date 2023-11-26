const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = 3030;

// Middleware
// app.use(bodyParser.json());
app.use(bodyParser.json());

// MongoDB Connection
//mongoose.connect('mongodb://localhost:27017/assignment', { useNewUrlParser: true, useUnifiedTopology: true });
mongoose.connect('mongodb+srv://mdshirazakram2326:Asad12345@cluster0.4x33pnn.mongodb.net/Assignment2')

//mongoose.connect('mongodb://localhost/assignment', { useNewUrlParser: true, useUnifiedTopology: true });
// const db = mongoose.connection;
// db.on('error', console.error.bind(console, 'MongoDB connection error:'));

// User Schema
const userSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  password: String,
});

const User = mongoose.model('User', userSchema);

// Post Schema
const postSchema = new mongoose.Schema({
  title: String,
  body: String,
  image: String,
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
});

const Post = mongoose.model('Post', postSchema);

// Register New User
app.post('/register', async (req, res) => {
  // console.log(req.body);
    try {
        const { name, email, password } = req.body;

        // check if user same email using
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({status: 'error', message: 'Email already in use'})
        }

        // create a new user
        const newUser = new User({ name, email, password});
        await newUser.save();
        res.status(200).json({status: 'success', message: 'user registered successfully'})
    } catch(error) {
        console.error(error);
        res.status(500).json({
            status: 'error',
            message: 'Server Error'
        })
    }
});

// User Login
app.post('/login', async (req, res) => {
  // console.log(req.body);
    try {
        const { email, password } = req.body;
        
        // check if user provided mail using
        const user = await User.findOne({ email })
        if (!user || user.password !== password) {
            return res.status(401).json({
                status: 'error',
                message: 'Invalid email or password'
            })
        }

        // generate Token Jwt
         const token = jwt.sign({ userId: user._id }, 'your_secret_key', { expiresIn: '1h' });
        res.status(200).json({ status: 'success', token });


        // const token = jwt.sign({ userId: user._id }, 'your_secret_key', { expiresIn: 'ih' });
        // res.status(200).json({ status: 'success', token })

    } catch (error) {
        console.error(error);
        res.status(500).json({ status: 'error', message: 'Internal server Error' });
        
    }
});

// Middleware for Authentication
const authenticateUser = (req, res, next) => {
     const token = req.headers.authorization;
    //const token = authenticateUser(req); // Replace with your actual token generation logic
    // res.status(200).json({ status: 'success', token });
  
    if (!token) {
      return res.status(401).json({ status: 'error', message: 'Unauthorized: Missing token' });
    }
  
    try {
      // Verify the token
      const decodedToken = jwt.verify(token, 'your_secret_key');
      req.userId = decodedToken.userId;
      next();
    } catch (error) {
      console.error(error);
      res.status(401).json({ status: 'error', message: 'Unauthorized: Invalid token' });
    }
};

// GET All Posts
app.get('/posts', authenticateUser, async (req, res) => {
    try {
      // token included in the request headers
      const token = req.headers.authorization;
      if(!token) {
        return res.status(401).json({
          status: 'error',
          message: 'Unauthorizes: Missing token'
        })
      }
      const decodedToken = jwt.verify(token, 'your_secret_key');
      req.userId = decodedToken.userId;


      const posts = await Post.find().populate('user', 'name email');
      res.status(200).json({ posts });
    } catch (error) {
      console.error(error);
      res.status(500).json({ status: 'error', message: 'Internal Server Error' });
    }
});

// Create a new Post
app.post('posts', authenticateUser, async (req, res) => {
    try {
        const { title, body, image } = req.body;

        //Create a new post with the user reference
        const newPost = new Post ({ title, body, image, user: req.userId });
        await newPost.save();

        res.status(201).json({ status: 'success', message: 'Post created successfully', post: newPost });
    } catch (error) {
        console.error(error);
        res.status(500).json({ status: 'error', message: 'Internal Server Error' });
    }
});

// Edit and Update Post
app.put('/posts/:postId', authenticateUser, async (req, res) => {
    try {
        const { title, body, image } = req.body
        const postId = req.params.postId;

        // check if the blongs to the authenticated user
        const post = await Post.findOne({ _id: postId, user: req.userId });
        if(!post) {
            return res.status(403).json({ status: 'error', message: 'Forbidden: You cannot edit this post' });
        }
        // Update the post
        post.title = title;
        post.body = body;
        post.image = image;
        await post.save();

        res.status(200).json({ status: 'success', message: 'Post updated successfully', post})

    } catch (error) {
        console.error(error);
        res.status(500).json({ status: 'error', message: 'Internal Server Error' });
    }
});

// Delete a Post
app.delete('/posts/:postId', authenticateUser, async (req, res) => {
    try {
      const postId = req.params.postId;
  
      // Check if the post belongs to the authenticated user
      const post = await Post.findOne({ _id: postId, user: req.userId });
      if (!post) {
        return res.status(403).json({ status: 'error', message: 'Forbidden: You cannot delete this post' });
      }
  
      // Delete the post
      await Post.findByIdAndDelete(postId);
  
      res.status(200).json({ status: 'success', message: 'Post deleted successfully' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ status: 'error', message: 'Internal Server Error' });
    }
});




app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
