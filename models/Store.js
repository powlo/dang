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

//find reviews where the store's '_id' === the reviews 'store' property.
//A bit like a JOIN in SQL.
//We can then "populate" the store with reviews.
storeSchema.virtual('reviews', {
  ref: 'Review',
  localField: '_id', //which field on the store
  foreignField: 'store' // which field on the review 
})

module.exports = mongoose.model('Store', storeSchema);