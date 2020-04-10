var mongoose = require('mongoose');
var Schema = mongoose.Schema;
mongoose.Promise = global.Promise;
mongoose.connect(process.env.DB, { useNewUrlParser: true } );
mongoose.set('useCreateIndex', true);


// Movie schema
var ReviewSchema = new Schema({
    movieReviewed: String,
    reviewerName: String,
    quote: String,
    rating: String,
});

// hash the password before the user is saved
ReviewSchema.pre('save', function(next) {
    return next();
});

// return the model
module.exports = mongoose.model('reviews', ReviewSchema);