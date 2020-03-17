var express = require('express');
var bodyParser = require('body-parser');
var passport = require('passport');
var authJwtController = require('./auth_jwt');
var User = require('./Users');
var Movie = require('./Movie');
var jwt = require('jsonwebtoken');
var cors = require("cors");
var app = express();
module.exports = app; // for testing
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cors());
app.use(passport.initialize());

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

router.use('/movies', passport.authenticate('jwt', { //CRUD operations with jwt authentication.
    session: false
}), (req, res) => {

    var newMovie = new Movie();
    newMovie.title = req.body.title;
    newMovie.yearReleased = req.body.yearReleased;
    newMovie.genre = req.body.genre;
    newMovie.actors = req.body.actors;

    if (!newMovie.title || !newMovie.yearReleased || !newMovie.genre || !newMovie.actors){//Check request body.
        res.json({success: false, message: 'Please pass title, released year, genre, and a two-dimensional array of 3 actors with actor name, and character name.'});
    }

    else { //Go to http methods.

        if(newMovie.actors.length != 3){ //Check actors array size.
            res.json({success: false, message: 'Need to pass a two-dimensional array of 3 actors. ' +
                    'Each element needs an actor name, and a character name.' });
        }
        else {
            if (req.method == 'GET') { //Read

                res.status(200).send({
                    message: "GET Movies",
                    headers: req.headers,
                    query: req.query,
                    env: process.env.SECRET_KEY
                });
            } else if (req.method == 'POST') { //Create

                res.status(200).send({
                    message: "Movie Saved",
                    headers: req.headers,
                    query: req.query,
                    env: process.env.SECRET_KEY
                });

            } else if (req.method == 'DELETE') { //Delete

                res.status(200).send({message:"Movie Deleted", headers: req.headers, query: req.query, env: process.env.SECRET_KEY});

            } else if (req.method == 'PUT') { //Update
                res.status(200).send({ message:"Movie Updated", headers: req.headers, query: req.query, env: process.env.SECRET_KEY});

            } else {
                res.send("HTTP request not supported.");
                res.end();
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
    if (!req.body.username || !req.body.password) {
        res.json({success: false, message: 'Please pass username and password.'});
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

    if ( !userNew.name || !userNew.username || !userNew.password){
        res.json({success: false, msg: 'Please pass name, username, and password.'});
    }
    else{

        User.findOne({ username: userNew.username }).select('name username password').exec(function(err, user) {
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
