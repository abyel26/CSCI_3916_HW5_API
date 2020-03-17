

var mongoose = require('mongoose');
var Schema = mongoose.Schema;
mongoose.Promise = global.Promise;
mongoose.connect(process.env.DB, { useNewUrlParser: true } );
mongoose.set('useCreateIndex', true);


// Movie schema
var MovieSchema = new Schema({
    title: String,
    yearReleased: String,
    genre: String,
    actors: [[String, String], [String, String], [String, String]],
});

// return the model
module.exports = mongoose.model('movies', MovieSchema);