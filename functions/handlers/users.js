const functions = require('firebase-functions');
const {config} = require('../util/config')
const {admin,db} = require('../util/admin');
const { validateSignupData, validateLoginData, reduceUserDetails } = require('../util/validators');
// const { user } = require('firebase-functions/v1/auth');
let userID = '';
let userRecord;

exports.signup = (req, res) => {
    const newUser = {
        email: req.body.email,
        password: req.body.password,
        confirmPassword: req.body.confirmPassword,
        handle: req.body.handle,
    };

    const errorsCheck = validateSignupData(newUser);

    if (errorsCheck.valid) {
        return res.status(200).json(errorsCheck.errors);
    }

    const noImg = 'no-img.png';
    let userRecord; // Define a variable to store the user record

    // Create the user in Firebase Authentication
    admin
        .auth()
        .createUser({
            email: newUser.email,
            password: newUser.password,
            displayName: newUser.handle,
        })
        .then((userRec) => {
            userRecord = userRec; // Assign userRec to userRecord

            const userID = userRec.uid;

            const userCredentials = {
                handle: newUser.handle,
                email: newUser.email,
                password: newUser.password,
                createdAt: new Date().toISOString(),
                imageUrl: `https://firebasestorage.googleapis.com/v0/b/${config.storageBucket}/o/${noImg}?alt=media`,
                userId: userID,
            };

            // Store the user details in the Firestore database
            return db.doc(`/users/${newUser.handle}`).set(userCredentials);
        })
        .then(() => {
            // Generate a custom token for the user
            return admin.auth().createCustomToken(userRecord.uid);
        })
        .then((customToken) => {
            // Send the custom token in the response
            return res.status(201).json({ message: 'User was created!', token: customToken });
        })
        .catch((err) => {
            console.error(err);
            return res.status(200).json({ message: 'Something went wrong, please try again' });
        });
};

exports.login = (req, res) => {
    const user = {
        email: req.body.email,
        password: req.body.password
    };
    let errors = {
        email: '',
        password: ''
    }
    errors = validateLoginData(user);
    if (Object.keys(errors.errors).length>0) {
        return res.status(400).json(errors);
    }
    

    let userData;
    db.collection('users')
        .where('email', '==', user.email)
        .limit(1)
        .get()
        .then((snapshot) => {
            if (snapshot.empty) {
                return res.status(400).json({ message: 'User not found' });
            }

            userData = snapshot.docs[0].data();
            const storedPassword = userData.password;

            if (user.password !== storedPassword) {
                return res.status(200).json({ message: 'Incorrect password' });
            }
            return admin.auth().getUserByEmail(user.email);
        })
        .then((userRecord) => {
            // Password matches, generate a token
            return admin.auth().createCustomToken(userRecord.uid);
        })
        .then((customToken) => {
            // Send the custom token in the response
            
            return res.status(200).json({ message: 'Authentication successful', token: customToken });
        })
        .catch((error) => {
            console.error('Error generating custom token:', error);
            return res.status(500).json({ error: 'Internal server error' });
        });        
};

//Add user details
exports.addUserDetails = (req, res) => {
    try {
        let userDetails = reduceUserDetails(req.body);
        db.doc(`/users/${req.user.handle}`).update(userDetails)
            .then(() => {
                return res.json({ message: 'Details added successfully' });
            })
            .catch((err) => {
                console.error(err);
                return res.status(500).json({ error: err.code });
            });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Failed to process user details', details: error.message });
    }
};
exports.getAuthentificatedUser = (req,res) => {
    let userData = {};
    db.doc(`/users/${req.user.handle}`).get()
        .then(doc=> {
            if(doc.exists) {
                userData.credentials = doc.data();
                return db.collection('likes').where('userHandle','==',req.user.handle).get()
            }
        })
        .then(data=> {
            userData.likes = []
            data.forEach(doc=>{
                userData.likes.push(doc.data())
            })
            return res.json(userData)
        })
        .catch(err=>{
            console.error(err)
            return res.status(500).json({error:err})
        }) 
}
// Upload profile img
exports.uploadImage = (req, res) => {
    const Busboy = require('busboy'); // Corrected import statement
    const path = require('path');
    const os = require('os');
    const fs = require('fs');
    const busboy = Busboy({ headers: req.headers });
    let imageFileName;
    let imageToBeUploaded = {};
    busboy.on('file', (fieldname, file, filename, mimetype) => {
        filename = (filename.filename).replace(/[ .]/g, "");
        console.log(filename)
        const imageExtension = filename.split('.')[filename.split('.').length - 1];
        imageFileName = `${Math.round(Math.random() * 10000000000)}.${imageExtension}`;
        const filepath = path.join(os.tmpdir(), imageFileName);
        imageToBeUploaded = { filepath, mimetype };
        file.pipe(fs.createWriteStream(filepath));
    });
    busboy.on('finish', () => {
        admin.storage().bucket().upload(imageToBeUploaded.filepath, {
            resumable: false,
            metadata: {
                metadata: {
                    contentType: imageToBeUploaded.mimetype,
                },
            },
        })
            .then(() => {
                const imageUrl = `https://firebasestorage.googleapis.com/v0/b/${config.storageBucket}/o/${imageFileName}?alt=media`;
                return db.doc(`/users/${req.user.handle}`).update({ imageUrl });
            })
            .then(() => {
                return res.json({ message: 'Image uploaded successfully' });
            })
            .catch((err) => {
                console.error(err);
                return res.status(500).json({ error: err.code });
            });
    });
    busboy.end(req.rawBody);
};

exports.getUserDetails = (req,res) => {
    let userData = {}
    db.doc(`/users/${req.params.handle}`).get()
        .then(doc=>{
            if(doc.exists){
                userData.user = doc.data()
                return db.collection('screams').where('userHandle','==',req.params.handle)
                    .orderBy('createdAt','desc').get()
            }
            else {
                return res.status(404).json({error:'User not found!'})
            }
        })
        .then(data=>{
            userData.screams=[]
            data.forEach(doc=>{
                userData.screams.push({
                    body: doc.data().body,
                    createdAt: doc.data().createdAt,
                    userHandle: doc.data().userHandle,
                    userImage: doc.data().userImage,
                    likeCount: doc.data().likeCount,
                    commentCount: doc.data().commentCount,
                    screamId: doc.id
                })
            })
            return res.json(userData)
        })
        .catch(err=>{
            console.error(err);
            return res.status(500).json({error: err.code})
        })
}
exports.onUserImageChange = functions.region('europe-west1').firestore.document('/users/{userId}')
    .onUpdate((change)=>{
        console.log(change.before.data())
        console.log(change.after.data())
        if(change.before.data().imageUrl!==change.after.data().imageUrl){
            console.log('image has changed')
            let batch = db.batch();
            return db.collection('screams').where('userHandle','==',change.before.data().handle).get()
            .then(data=>{
                data.forEach(doc=>{
                    const scream = db.doc(`/screams/${doc.id}`)
                    batch.update(scream,{userImage: change.after.data().iomageUrl})
                })
                return batch.commit()
            })
        }
    })