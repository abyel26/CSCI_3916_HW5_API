var express = require('express');
var bodyParser = require('body-parser');
var passport = require('passport');
var authJwtController = require('./auth_jwt');
var User = require('./Users');
var Movie = require('./Movie');
var Reviews = require('./Reviews');
var jwt = require('jsonwebtoken');
var cors = require("cors");
var app = express();
module.exports = app; // for testing
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cors());
app.use(passport.initialize());
var mongoose = require('mongoose');
var Schema = mongoose.Schema;
mongoose.Promise = global.Promise;
mongoose.connect(process.env.DB, { useNewUrlParser: true } );
mongoose.set('useCreateIndex', true);




var router = express.Router();

function getJSONObject(req) {
    var json = {
        headers: "No Headers",
        key: process.env.SECRET_KEY,
        body: "No Body"
    };

    if (req.body != null) {
        json.body = req.body;
    }
    if (req.headers != null) {
        json.headers = req.headers;
    }
    return json;
}

router.route('/reviews')
    .post(authJwtController.isAuthenticated, function (req, res) {

            var  newReview = new  Reviews();
            newReview.movieReviewed = req.body.movieReviewed;
            newReview.reviewerName = req.user.name;
            newReview.quote = req.body.quote;
            newReview.rating  = req.body.rating;

            var movieExists = false;
                Movie.findOne({title: newReview.movieReviewed},function (err, exists) {
                    if (err) {
                        return res.json({ success: false, message: 'Could not save review.'});
                    }
                    if (!exists) {
                        return res.json({ success: false, message: 'Movie does not exist in database.'});
                    }
                    else{//If movie exists, save
                        newReview.save(function(err) {
                            if (err) {
                                return res.json({ success: false, message: 'Could not save review.'});
                            }

                            else{
                                res.status(200).send({
                                    success: true,
                                    message: "Review Saved",
                                    headers: req.headers,
                                    query: req.query,
                                    env: process.env.SECRET_KEY
                                });
                            }
                        });
                    }
                });
        }
    )

    .get(function (req, res) {

        Reviews.find({}, function(err, reviews) {
            var reviewMap = {};

            if (!err) {
                reviews.forEach(function (review) {//Iterate through reviews and send back json array

                    reviewMap[review._id] = review;
                });
                res.status(200).send({
                    message: "GET Reviews",
                    headers: req.headers,
                    query: req.query,
                    env: process.env.SECRET_KEY,
                    reviews: reviewMap
                });
            } else {
                return res.json({success: false, message: 'Could not GET'});
            }

        })

    });

router.use('/movies', passport.authenticate('jwt', { //CRUD operations with jwt authentication.
    session: false
}), (req, res) => {

    var newMovie = new Movie();
    newMovie.title = req.body.title;
    newMovie.yearReleased = req.body.yearReleased;
    newMovie.genre = req.body.genre;
    newMovie.actors = req.body.actors;
    newMovie.imageUrl = req.body.imageUrl;

    var newReview = new Reviews();
    newReview.movieReviewed = req.body.title;


    if (req.method == 'GET') { //Read

        var url = req._parsedUrl.pathname;
       var id = url.substring(url.lastIndexOf('/') + 1);
       if(id.localeCompare("") == 0){
       }
        if(id.localeCompare("movies") == 0){
        }

       if(!((id.localeCompare("") == 0) || (id.localeCompare("movies") == 0))) { //If passed movie id, return get movie of that specific id
           Movie.findOne({_id: id}, {}, (err, docs) => {

               if (err) {
                   res.send({status: false, message: "Could not GET movie."});
               } else {

                   res.status(200).send({movie: docs._doc});
               }

           })
       }
       else { //No movie id passed, return all movies

           Movie.find({}, function (err, movies) {
               var moviesMap = {};

               if (!err) {
                   movies.forEach(function (movie) {//Iterate through movies and send back json array
                       moviesMap[movie._id] = movie;
                   });
                   var sendReviews = req.query.reviews; //check parameter for reviews

                   if (sendReviews == "true") {//If parameter is true, send movie info with reviews
                       mongoose.model('movies').aggregate([
                           {$lookup: {

                                   from: "reviews",
                                   localField: "title",
                                   foreignField: "movieReviewed",
                                   as: "review"
                               }
                           }
                       ]).then(function (res2) {

                           function sortByAvgRating(){//Used to sort descending the movies by avg rating
                               return function(a,b){
                                   if(a["avgRating"] > b["avgRating"])
                                       return -1;
                                   else if(a["avgRating"] < b["avgRating"])
                                       return 1;

                                   return 0;
                               }
                           }

                           var averageRating = 0;
                           var n = 0;

                           for (let i = 0; i < Object.keys(res2).length; i++) { //Compute average rating of reviews
                               for (let k = 0; k < Object.keys(res2[i]["review"]).length; k++) {
                                   averageRating = +averageRating + +res2[i]["review"][k]["rating"];
                                   n++;
                               }
                               averageRating = averageRating/n;
                               res2[i]["avgRating"] = averageRating;
                               averageRating = 0;
                               n = 0;
                           }

                           res2.sort(sortByAvgRating());

                           res.status(200).send({
                               message: "GET Movies",
                               headers: req.headers,
                               query: req.query,
                               env: process.env.SECRET_KEY,
                               "movies": res2
                           });
                       });


                   }//if
                   else { //If parameter is false, don't send reviews.
                       res.status(200).send({
                           message: "GET Movies",
                           headers: req.headers,
                           query: req.query,
                           env: process.env.SECRET_KEY,
                           movies: moviesMap
                       });
                   }
               } else {
                   return res.json({success: false, message: 'Could not GET'});
               }
           });
       }
    }

    else { //Go to other http methods.

        if (!newMovie.title || !newMovie.yearReleased || !newMovie.genre || !newMovie.actors){//Check request body.
            res.json({success: false, message: 'Please pass title, released year, genre, and a two-dimensional array of 3 actors with actor name, and character name.'});
        }
        else {
            if (newMovie.actors.length != 3) { //Check actors array size.
                res.json({
                    success: false, message: 'Need to pass a two-dimensional array of 3 actors. ' +
                        'Each element needs an actor name, and a character name.'
                });
            } else {
                if (req.method == 'POST') { //Create

                    // save the movie
                    newMovie.save(function (err) {
                        if (err) {
                            return res.json({success: false, message: 'Could not save movie.'});
                        } else {
                            res.status(200).send({
                                success: true,
                                message: "Movie Saved",
                                headers: req.headers,
                                query: req.query,
                                env: process.env.SECRET_KEY
                            });
                        }
                    });


                } else if (req.method == 'DELETE') { //Delete

                    Movie.remove({title: newMovie.title}, function (err) {
                        if (err) {
                            res.send({status: false, message: "Unable to delete movie."});
                        } else {
                            res.status(200).send({
                                message: "Movie Deleted",
                                headers: req.headers,
                                query: req.query,
                                env: process.env.SECRET_KEY
                            });
                        }
                    });


                } else if (req.method == 'PUT') { //Update
                    newMovie.oldTitle = req.body.oldTitle;//For update, add an oldTitle to the request to find movie to update.

                    Movie.findOneAndUpdate({title: newMovie.oldTitle}, {
                        $set: {
                            title: newMovie.title, yearReleased: newMovie.yearReleased,
                            genre: newMovie.genre, actors: newMovie.actors, imageUrl: newMovie.imageUrl
                        }
                    }, (err, docs) => {

                        if (err) {
                            res.send({status: false, message: "Could not update movie."});
                        } else {
                            res.status(200).send({
                                message: "Movie Updated",
                                headers: req.headers,
                                query: req.query,
                                env: process.env.SECRET_KEY
                            });
                        }

                    });
                } else {
                    res.send("HTTP request not supported.");
                    res.end();
                }
            }
        }
    }
});

router.route('/postjwt')
    .post(authJwtController.isAuthenticated, function (req, res) {
            console.log(req.body);
            res = res.status(200);
            if (req.get('Content-Type')) {
                console.log("Content-Type: " + req.get('Content-Type'));
                res = res.type(req.get('Content-Type'));
            }
            res.send(req.body);
        }
    );

router.route('/users/:userId')
    .get(authJwtController.isAuthenticated, function (req, res) {
        var id = req.params.userId;
        User.findById(id, function(err, user) {
            if (err) res.send(err);

            var userJson = JSON.stringify(user);
            // return that user
            res.json(user);
        });
    });

router.route('/users')
    .get(authJwtController.isAuthenticated, function (req, res) {
        User.find(function (err, users) {
            if (err) res.send(err);
            // return the users
            res.json(users);
        });
    });

router.post('/signup', function(req, res) {
    if (!req.body.name || !req.body.username || !req.body.password) {
        res.json({success: false, message: 'Please pass name, username, and password.'});
    }
    else {
        var user = new User();
        user.name = req.body.name;
        user.username = req.body.username;
        user.password = req.body.password;
        // save the user
        user.save(function(err) {
            if (err) {
                // duplicate entry
                if (err.code == 11000)
                    return res.json({ success: false, message: 'A user with that username already exists. '});
                else
                    return res.send(err);
            }

            res.json({ success: true, message: 'User created!' });
        });
    }
});

router.post('/signin', function(req, res) {
    var userNew = new User();
    userNew.username = req.body.username;
    userNew.password = req.body.password;

    if (!userNew.username || !userNew.password){
        res.json({success: false, msg: 'Please pass username, and password.'});
    }
    else{

        User.findOne({ username: userNew.username }).select('namername password').exec(function(err, user) {
            if (err) res.send(err);

            user.comparePassword(userNew.password, function(isMatch){
                if (isMatch) {//Easy to find user with JWT token
                    var userToken = {id: user._id, username: user.username};
                    var token = jwt.sign(userToken, process.env.SECRET_KEY);
                    res.json({success: true, token: 'JWT ' + token});
                }
                else {
                    res.status(401).send({success: false, message: 'Authentication failed.'});
                }
            });


        });
    }

});

router.use('/*', function (req, res) {
    //No base URL requests allowed.
    res.status(401).send({message:"No base URL requests allowed", headers: req.headers, query: req.query});
});

app.use('/', router);
app.listen(process.env.PORT || 8080);
