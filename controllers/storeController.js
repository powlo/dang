const mongoose = require('mongoose');
const Store = mongoose.model('Store');
const multer = require('multer');
const jimp = require('jimp');
const uuid = require('uuid');

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
  const stores = await Store.find();

  //NB ES6 allows you to give an implicit key / value expansion if they key is the same as the object.
  //So {xyz : xyz} can be shortened to { xyz }
  res.render('stores', {title: "Stores", stores: stores});
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
  const store = await Store.findOne({slug: req.params.slug}).populate('author');

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

