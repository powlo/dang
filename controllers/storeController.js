const mongoose = require('mongoose');

const Store = mongoose.model('Store');

exports.homePage = (req, res) => {
  console.log(req.name);

  //Flashes only get sent on the *next* request.
  //This only works thanks to sessions, the flash is stored
  //in the server side session ready for the next request.
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

  //Inform the browser to make another request. This will flush the flashed messages.
  res.redirect(`/store/${store.slug}`); 
}

exports.getStores = async (req, res) => {
  const stores = await Store.find();

  //NB ES6 allows you to give an implicit key / value expansion if they key is the same as the object.
  //So {xyz : xyz} can be shortened to { xyz }
  res.render('stores', {title: "Stores", stores: stores});
}

exports.editStore = async (req, res) => {
  
  //Find the store given the id
  const store = await Store.findOne({_id: req.params.id});
  
  //Confirm the requestor is the owner
  
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