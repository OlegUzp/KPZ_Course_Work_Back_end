const admin = require('firebase-admin');
const adminConfig = require('../util/config')
var serviceAccount = require("../config/udodcoursework-firebase-adminsdk-7boo5-688d0548b3.json");
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://udodcoursework-default-rtdb.firebaseio.com",
  storageBucket: "gs://udodcoursework.appspot.com",
});
const db = admin.firestore();
module.exports = {admin,db}