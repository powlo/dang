const mongoose = require('mongoose');

//Use built in ES6 promise.
mongoose.Promise = global.Promise;

const slug = require('slugs');

const storeSchema = new mongoose.Schema({
  name: {
    type: String,
    trim: true,
  required: 'Please enter a store name'},
  slug: String,
  description: {
    type: String,
    trim: true
  },
  tags: [String],
  created: {
    type: Date,
    default: Date.now
  },
  location: {
    type: {
      type:  String,
      default: 'Point'  
    },
    coordinates: [{
      type: Number,
      required: "You must supply coordinates!"
    }],
    address: {
      type: String,
      required: "You must supply an address!"
    } 
  },
  photo: String,
  author: {
    type: mongoose.Schema.ObjectId,
    ref: 'User', //this is a reference to the User model.
    required: 'You must provide an author.'
  }
},

//Virtuals by default are not shown when converting to JSON or Object
//eg when dumping to screen. This makes it so they are.
{
  toJSON: { virtuals : true },
  toObject: { virtuals: true }
});

//Add indexes

storeSchema.index({
  name: 'text',
  description: 'text'
})

storeSchema.index({
  location: '2dsphere'
});

storeSchema.pre('save', async function(next) {
  if (!this.isModified('name')) {
    next();
    return;
  }
  this.slug = slug(this.name);
  const slugRegEx = new RegExp(`(${this.slug})((-[0-9]*$)?$)`, 'i');

  //Use a regex to find stores with matching slug.
  const storesWithSlug = await this.constructor.find({slug: slugRegEx});
  if (storesWithSlug.length){
    this.slug = `${this.slug}-${storesWithSlug.length}`;
  }
  next();
});

storeSchema.statics.getTagList = function(){
  
  //Create an aggregate pipeline
  return this.aggregate([
    {$unwind : '$tags'}, //get all the data you need. Here we unpick tags from every store.
    {$group : {_id: '$tags', count: {'$sum' : 1 } } }, //now group those tags by tag name.
    {$sort: {count: -1}} //and sort in descending order.
  ])
}

storeSchema.statics.getTopStores = function(){
  return this.aggregate([
    //Lookup stores and populate their reviews
    {$lookup:
      { from: 'reviews', localField: '_id', foreignField: 'store', as: 'reviews'}
    },

    //filter for only items that have two or more reviews
    //reviews.1 means that a array[1] exists, ie there are at least 2
    {$match: {'reviews.1': {$exists: true}}},

    //add average review field
    { $addFields: {
      averageRating: {$avg: '$reviews.rating'}
    }},
    //sort it y the new average review field
    {$sort: {averageRating: -1}},
    //limit to 10
    {$limit: 10}
  ])
}

//find reviews where the store's '_id' === the reviews 'store' property.
//A bit like a JOIN in SQL.
//We can then "populate" the store with reviews.
storeSchema.virtual('reviews', {
  ref: 'Review',
  localField: '_id', //which field on the store
  foreignField: 'store' // which field on the review 
})

function autopopulate(next){
  this.populate('reviews');
  next();
}

storeSchema.pre('find', autopopulate);
storeSchema.pre('findOne', autopopulate);

module.exports = mongoose.model('Store', storeSchema);