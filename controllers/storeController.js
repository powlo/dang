const mongoose = require('mongoose');
const multer = require('multer');
const jimp = require('jimp');
const uuid = require('uuid');

const Store = mongoose.model('Store');
const User = mongoose.model('User');

const multerOptions = {
  storage: multer.memoryStorage(),
  fileFilter( req, file, next) {
    const isPhoto = file.mimetype.startsWith('image/');
    if (isPhoto) {
      //we got a photo! Good.
      next(null, true);
    }
    //No photo, errror, tell them why.
    else {
      next({message: 'This file type is not allowed.'}, false);
    }
  }
}

exports.upload = multer(multerOptions).single('photo');

exports.resize = async (req, res, next) => {
  if (!req.file) {
    next();
    return;
  }
  //get the file extension. Probably jpeg.
  const extension = req.file.mimetype.split('/')[1];

  //generate a unique identifier for the file name.
  req.body.photo = `${uuid.v4()}.${extension}`;

  //read and resize the file, then write to uploads.
  const photo = await jimp.read(req.file.buffer);
  await photo.resize(800, jimp.AUTO);
  await photo.write(`./public/uploads/${req.body.photo}`);
  next();
}

exports.homePage = (req, res) => {

  //Flashes only get sent on the *next* request.
  //This only works thanks to sessions, the flash is stored
  //in the server side session ready for the next request.
  res.render('index'); //We render the hello template.
}

exports.addStore = (req, res) => {
  res.render('editStore', {title: 'Add Store'});
}

exports.createStore = async (req, res) => {
  req.body.author = req.user._id;
  const store = new Store(req.body);
  await store.save();
  //Once the store is complete we indicate success
  //Flash middleware was added in index.js and makes .flash available on the req object.

  req.flash('success', `Successfully Created ${store.name}. Care to leave a review?`);

  //Inform the browser to make another request. This will flush the flashed messages.
  res.redirect(`/store/${store.slug}`); 
}

exports.getStores = async (req, res) => {
  //to do pagination we take the page out of the url and build our query around it.
  const page = req.params.page || 1;
  const limit = 4;
  const skip = (page * limit) - limit;

  const storePromise = Store.find().skip(skip).limit(limit).sort({created: 'desc'});
  const countPromise = Store.count();
  [stores, count] = await Promise.all([storePromise, countPromise]);

  const pages = Math.ceil(count /limit);
  //NB ES6 allows you to give an implicit key / value expansion if they key is the same as the object.
  //So {xyz : xyz} can be shortened to { xyz }
  if (!stores.length && skip) {
    res.redirect(`/stores/page/${pages}`);
    return;
  }
  res.render('stores', {title: "Stores", stores, count, page, pages});
}

const confirmOwner = (store, user) => {
  if(!store.author.equals(user._id)) {
    throw Error('You must own a store in order to edit it!');
  }
}

exports.editStore = async (req, res) => {
  
  //Find the store given the id
  const store = await Store.findOne({_id: req.params.id});
  //Confirm the requestor is the owner
  confirmOwner(store, req.user);
  //Render out the form
  res.render('editStore', {title: `Edit ${store.name}`, store: store});
}

exports.updateStore = async (req, res) => {
  //Force location type to be Point because mongoose field defaults don't apply on update.
  req.body.location.type = "Point";
  //find and update the store
  //findAndUpdate takes three params (query, data, options)
  const store = await Store.findOneAndUpdate({_id : req.params.id}, req.body, {
    new: true, //returns the updated object not the old one
    runValidators: true,
  }).exec();

  //redirect to the store and tell them it worked
  req.flash('success', `Successfully update <strong>${store.name}</strong>. <a href="/stores/${store.slug}">View Store.</a>`)
  res.redirect(`/stores/${store._id}/edit`)
}

exports.getStoreBySlug = async (req, res, next) => {
  const store = await Store.findOne({slug: req.params.slug}).populate('author reviews');

  //Nothing found? Call the next middleware / route, which happens to be a 404 handler.
  if (!store) return next();
  res.render('store', {store: store, title: store.name});
}

exports.getStoresByTag = async (req, res) => {
  //pull the tag from the query
  tag = req.params.tag;

  //if no url parameter, just get all stores with a tag
  tagQuery = tag || {$exists: true};

  //We want to make two queries asynchronously, so we fire them off
  //and then use promise.all to wait for them *both* to complete.
  tagsPromise = Store.getTagList();
  storesPromise = Store.find({tags: tagQuery});
  const [tags, stores ] = await Promise.all([tagsPromise, storesPromise]);
  res.render('tags', {tag, tags, stores, title: "Tags"});
}

exports.mapPage = (req, res) => {
  res.render('map', {title: 'Map'});
}

exports.getFavourites = async (req, res) => {
  const stores = await Store.find({_id : {$in : req.user.hearts}});
  res.render('stores', {title: 'Your favourites', stores: stores })
}


//*** API Endpoints ***
exports.searchStores = async (req, res) => {
  //req.params come from :xyz statements in the route
  //req.query comes from ?a=b in the url

  //$text allows a search on any fields that are indexed as text
  const stores = await Store.find({
    $text: {
      $search: req.query.q
    }
  }, {
    score: { $meta: 'textScore'}
  })
  .sort({ 
    score: {$meta: 'textScore'}
  });

  res.json(stores);
}

exports.mapStores = async (req, res) => {
  //massage data into something MongoDB recognises.
  const coordinates = [req.query.lng, req.query.lat].map(parseFloat);

  const q = {
    location: {
      $near: {
        $geometry: {
          type: 'point',
          coordinates: coordinates
        },
        $maxDistance: 10000
      }
    }
  }
  const stores = await Store.find(q).select('slug name description location photo').limit(10);
  res.json(stores);
}

/* api endpoint allowing the user to heart or unheart a store. */
exports.heartStore = async (req, res) => {
  const hearts = req.user.hearts.map(obj => obj.toString());
  //dynamically determine if we want to remove (pull) or add to the set
  const operator = hearts.includes(req.params.id) ? '$pull' : '$addToSet';
  
  //NB [xyz] is ES6 computed property name
  //https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Object_initializer
  //{new: true} returns the updated object not the original. Weird.
  const user = await User.findByIdAndUpdate(req.user._id,
    {[operator] : {hearts: req.params.id}},
    {new: true}
  )
  res.json(user);
}

exports.getTopStores = async (req, res) => {
  //dont put complicated queries in the controller. It's better to put them in the model.
  const stores = await Store.getTopStores();
  res.render('topStores', {stores : stores, title: '★ Top Stores!'});
}