const {db}=require('../util/admin');
exports.getAllScreams = (req,res) => {
        db
            .collection('screams')
            .orderBy('createdAt', 'desc')
            .get()
            .then((data) => {
                let screams = [];
                data.forEach((doc) => {
                    screams.push({
                        screamId: doc.id,
                        body: doc.data().body,
                        userHandle: doc.data().userHandle,
                        createdAt: doc.data().createdAt,
                    });
                });
                return res.json(screams);
            })
            .catch((err) => {
                console.error(err);
                return res.status(500).json({ error: 'Something went wrong' });
            });
} 
exports.postOneScream = (req, res) => {
    const newScream = {
        body: req.body.body,
        userHandle: req.user.handle, // Use req.user.handle instead of req.body.userHandle if available
        createdAt: new Date().toISOString(),
        userImage: req.user.imageUrl,
        likeCount: 0,
        commentCount: 0
    };
    
    db.collection('screams')
        .add(newScream)
        .then((doc) => {
            newScream.screamId = doc.id;
            return res.status(201).json(newScream);
        })
        .catch((err) => {
            console.error(err);
            return res.status(500).json({ error: 'Something went wrong' });
        });
};

exports.getScream = (req, res) => {
    let screamData = {};
    db.doc(`/screams/${req.params.screamId}`)
        .get()
        .then((doc) => {
            if (!doc.exists) {
                return res.status(404).json({ error: 'Scream not found' });
            }
            screamData = doc.data();
            screamData.screamId = doc.id;
            return (db
                .collection('comment')
                .orderBy('createdAt','desc')
                .where('screamId', '==', req.params.screamId)
                .get());
        })
        .then((data) => {
            screamData.comments = [];
            data.forEach((doc) => {
                screamData.comments.push(doc.data()); // Push comments to the comments array
            });

            return res.json(screamData);
        })
        .catch((err) => {
            console.error(err);
            return res.status(500).json({ error: err.code });
        });
};
exports.getScreamLikes = (req,res) => {
  console.log(req.params)
  db
  .collection('likes')
  .where('screamId', '==', req.params.screamId)
  .get()
  .then(data=>{
    return res.status(200).json({likesCount:data._size})})
    .catch(err=>console.log(err))
}
exports.commentOnScream = (req,res) => {
    if(req.body.body.trim()==='') return res.status(400).json({error: 'Empty comment'})
    const newComment = {
        body: req.body.body,
        createdAt: new Date().toISOString(),
        screamId: req.params.screamId,
        userHandle: req.user.handle,
        userImage: req.user.imageUrl
    };
    db.doc(`/screams/${req.params.screams}`).get()
        .then(doc=>{
            if(!doc.exists) return res.status(404).json({error: 'Scream not found'})
            return doc.ref.update({commentCount: doc.data().commentCount++})
        })
        .then(()=> {
            console.log(newComment)
            return db.collection('comment').add(newComment)
        })
        .then(()=>{
            res.json(newComment)
        })
        .catch(err=>{
            console.error(err)
            return res.status(500).json({error:err.code})
        })
}
exports.likeScream = (req,res) => {
    const likeDocument = db.collection('likes').where('userHandle','==',req.user.handle)
        .where('screamId','==',req.params.screamId).limit(1)
    const screamDoc = db.doc(`/screams/${req.params.screamId}`);
    let screamData={};
    screamDoc.get()
        .then(doc=>{
            if(doc.exists) {
                screamData = doc.data()
                screamData.screamId=doc.id;
                return likeDocument.get()
            }
            else {
                return res.status(404).json({error: 'Scream not found'})
            }
        })
        .then(data=>{
            if(data.empty){
                return db.collection('likes').add({
                    screamId:req.params.screamId,
                    userHandle: req.user.handle
                })
                .then(()=>{
                    screamData.likeCount++
                    return screamDoc.update({likeCount: screamData.likeCount})
                })
                .then(()=>{
                    return res.json(screamData)
                })
            }
            else {
                return res.status(400).json({error: "Scream already liked"})
            }
        })
        .catch(err=>{
            console.error(err.code)
            res.status(500).json({error: err.code})
        })
}
exports.unlikeScream = (req, res) => {
    const likeDocument = db
      .collection('likes')
      .where('userHandle', '==', req.user.handle)
      .where('screamId', '==', req.params.screamId)
      .limit(1);
  
    const screamDocument = db.doc(`/screams/${req.params.screamId}`);
  
    let screamData;
  
    screamDocument
      .get()
      .then((doc) => {
        if (doc.exists) {
          screamData = doc.data();
          screamData.screamId = doc.id;
          return likeDocument.get();
        } else {
          return res.status(404).json({ error: 'Scream not found' });
        }
      })
      .then((data) => {
        if (data.empty) {
          return res.status(400).json({ error: 'Scream not liked' });
        } else {
          return db
            .doc(`/likes/${data.docs[0].id}`)
            .delete()
            .then(() => {
              screamData.likeCount--;
              return screamDocument.update({ likeCount: screamData.likeCount });
            })
            .then(() => {
              res.json(screamData);
            });
        }
      })
      .catch((err) => {
        console.error(err);
        res.status(500).json({ error: err.code });
      });
  };
  exports.likeStatus = async (req, res) => {
    try {
      const likeDocument = db
        .collection('likes')
        .where('userHandle', '==', req.user.handle)
        .where('screamId', '==', req.params.screamId)
        .limit(1);
  
      const screamDocument = db.doc(`/screams/${req.params.screamId}`);
      const doc = await screamDocument.get();
  
      if (doc.exists) {
        const data = await likeDocument.get();
        if (data.empty) {
          res.status(200).json({ message: 'Scream not liked' });
        } else {
          res.status(200).json({ message: 'Scream is liked' });
        }
      } else {
        res.status(404).json({ error: 'Scream not found' });
      }
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.code });
    }
  };
// Delete a scream
exports.deleteScream = (req, res) => {
    const document = db.doc(`/screams/${req.params.screamId}`);
    document
      .get()
      .then((doc) => {
        if (!doc.exists) {
          return res.status(404).json({ error: 'Scream not found' });
        }
        if (doc.data().userHandle !== req.user.handle) {
          return res.status(403).json({ error: 'Unauthorized' });
        } else {
          return document.delete();
        }
      })
      .then(() => {
        res.json({ message: 'Scream deleted successfully' });
      })
      .catch((err) => {
        console.error(err);
        return res.status(500).json({ error: err.code });
      });
  };