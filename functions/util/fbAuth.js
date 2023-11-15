const rp = require('request-promise');
const { admin, db } = require('./admin');
const { config } = require('../util/config');

module.exports = async (req, res, next) => {
  try {
    let customToken;
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer ')
    ) {
      customToken = req.headers.authorization.split('Bearer ')[1];
    } else {
      console.error('No token found');
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Verify the custom token received from the client
    const response = await rp({
      url: `https://www.googleapis.com/identitytoolkit/v3/relyingparty/verifyCustomToken?key=${config.apiKey}`,
      method: 'POST',
      body: {
        token: customToken,
        returnSecureToken: true,
      },
      json: true,
    });

    // Extract the Firebase ID token from the response
    const idToken = response.idToken;

    // Verify the Firebase ID token
    const decodedToken = await admin.auth().verifyIdToken(idToken);

    req.user = decodedToken;

    // Perform the database query after sending the response
    const data = await db
      .collection('users')
      .where('email', '==', req.user.email)
      .limit(1)
      .get();

    if (data.docs.length > 0) {
      req.user.handle = data.docs[0].data().handle;
      req.user.imageUrl = data.docs[0].data().imageUrl;
      req.user.imageUrl = data.docs[0].data().imageUrl;
    } else {
      // Handle the case where no matching documents were found
      req.user.handle = 'No matching user found';
      req.user.imageUrl = 'No matching user found';
    }

    next();
  } catch (error) {
    console.error('Error generating or verifying ID token:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};