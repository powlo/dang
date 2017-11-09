const mongoose = require('mongoose');

const Store = mongoose.model('Store');

exports.homePage = (req, res) => {
  console.log(req.name);

  //Flashes only get sent on the *next* request.
  //This only works thanks to sessions, the flash is stored
  //in the server side session ready for the next request.
  req.flash('error', "Something happened.");
  req.flash('info', "Something happened.");
  req.flash('warning', "Something happened.");
  req.flash('success', "Something happened.");
  res.render('index'); //We render the hello template.
}

exports.addStore = (req, res) => {
  res.render('editStore', {title: 'Add Store'});
}

exports.createStore = async (req, res) => {
  const store = new Store(req.body);
  await store.save();
  //Once the store is complete we indicate success
  //Flash middleware was added in index.js and makes .flash available on the req object.

  req.flash('success', `Successfully Created ${store.name}. Care to leave a review?`);
  res.redirect(`/store/${store.slug}`);
}