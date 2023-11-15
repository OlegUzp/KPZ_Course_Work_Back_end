const functions = require('firebase-functions');
const express = require('express');
const app = express();
const cors = require('cors');
app.use(cors());
// const bcrypt = require('bcrypt'); // Use bcrypt for password hashing
const {admin,db} = require('./util/admin');
const { getAllScreams,postOneScream,getScream,commentOnScream,likeScream,unlikeScream, deleteScream,getScreamLikes,likeStatus  } = require('./handlers/screams');
const { signup, login, uploadImage, addUserDetails,getAuthentificatedUser, getUserDetails} = require('./handlers/users');
const FBAuth = require('./util/fbAuth');
// Middleware to parse JSON data in requests
app.use(express.json());
// const corsOptions = {
//     origin: 'http://localhost:3000',
//     methods: 'GET,HEAD,PUT,PATCH,POST,DELETE'
//   };
  
//   app.use(cors(corsOptions));
  app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    next();
  });
// Routes: screams
app.get('/screams', getAllScreams);
app.post('/scream/',FBAuth ,postOneScream);
app.get('/scream/:screamId/',getScream);
app.get('/scream/likes/:screamId/',getScreamLikes)
app.get('/scream/likes/likeStatus/:screamId/',FBAuth,likeStatus);
app.post('/scream/:screamId/comment/',FBAuth,commentOnScream)
app.get('/scream/:screamId/like',FBAuth,likeScream)
app.get('/scream/:screamId/unlike',FBAuth,unlikeScream)
app.post('/scream/:screamId/delete/',FBAuth,deleteScream)
// //Routes: user
app.post('/signup', signup)
app.post('/login',login)
app.post('/user/image',FBAuth,uploadImage)
app.post('/user',FBAuth,addUserDetails)
app.get('/user/:handle/',getUserDetails)
app.get('/user',FBAuth,getAuthentificatedUser)

exports.api = functions.region('europe-west1').https.onRequest(app);
