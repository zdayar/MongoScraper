var express = require("express");
var bodyParser = require("body-parser");
var mongoose = require("mongoose");

// Our scraping tools
var cheerio = require("cheerio");
var request = require("request");

// Require all models
var db = require("./models");

var PORT = process.env.PORT || 3000;

// Initialize Express
var app = express();

// Use body-parser for handling form submissions
app.use(bodyParser.urlencoded({extended: false}));

// Use express.static to serve the public folder as a static directory
app.use(express.static("public"));

// Set mongoose to leverage built in JavaScript ES6 Promises
// Connect to the Mongo DB
mongoose.Promise = Promise;
var localDatabaseUri = "mongodb://localhost/BBCNewsScrape";

if (process.env.MONGODB_URI) {
    mongoose.connect(process.env.MONGODB_URI);
}
else {
    mongoose.connect(localDatabaseUri, {useMongoClient: true});
}

///////////////////////////////////////////////////////////////
// ROUTES
///////////////////////////////////////////////////////////////
// GET route for scraping the BBC News website
app.get("/api/fetch", function (req, res) {
    // count of new articles we find in this scrape
    var addedCount = 0;

    // default message to send back at the end of scraping if no new articles
    var message = "No new articles today. Check back tomorrow!";

    // Make a request call to grab the HTML body from the BBC News site
    request("http://www.bbc.com", function (error, response, html) {
        // Load the HTML into cheerio and save it to a variable
        var $ = cheerio.load(html);

        // Select each article in the HTML body from which we want information.
        $("div.media__content").each(function (i, element) {
            // create an empty result object
            var result = {};

            // find url and headline first
            var $title = $(element).find("h3.media__title a");

            // find the url. If it already includes "http", save as is;
            // otherwise prepend "http://www.bbc.com"
            var url = $title.attr("href");
            if (url.indexOf("http") !== -1) {
                result.url = url;
            }
            else {
                result.url = "http://www.bbc.com" + url;
            }
            // find the headline
            result.headline = $title.text().replace(/^\s+|\s+$/g, '');   // get rid of whitespace and \n, \r

            // next, find the summary text for the article
            var $summary = $(element).find("p.media__summary");
            result.summary = $summary.text().replace(/^\s+|\s+$/g, '');  // get rid of whitespace and \n, \r

            // before proceeding, make sure headline, url, and summary are all non-empty
            // if one or more is empty, we will skip this article
            if (result.url !== "" && result.headline !== "" && result.summary !== "") {
                // next, see if the article already exists in our db
                db.Article
                .findOne({headline: result.headline})
                .then(function (dbArticle) {
                    // if it doesn't exist in the database, then we can add it
                    if (dbArticle === null) {
                        // article doesn't exist in the db
                        // create a new Article using the `result` object built from scraping
                        db.Article
                        .create(result)
                        .then(function (dbArticle) {
                            // for each article we add to db, increment counter.
                            addedCount++;
                        })
                        .catch(function (err) {
                            // If an error occurred, send it to the client
                            res.json(err);
                        });
                    }
                })
                .catch(function (err) {
                    // If an error occurs, send it to the client
                    res.json(err);
                });

            }
        });

        // This is a hack .... sorry.
        setTimeout(function () {
            // see if any new articles added; if so, adjust message to send back
            if (addedCount > 0) {
                message = addedCount + " new article(s) just added!";
            }

            // send message back
            res.json({message: message});
        }, 1500);

    });
});

//////////////////////////////////////////////////////////////////////
// GET route for getting all saved or not-saved Articles from the db
// based on the query parameter ?saved=true or ?saved=false
app.get("/api/headlines", function (req, res) {
    db.Article
    .find({saved: req.query.saved})
    .then(function (dbArticle) {
        res.json(dbArticle);
    })
    .catch(function (err) {
        // If an error occurs, send the error back to the client
        res.json(err);
    });
});

////////////////////////////////////////////////////////////////////
// PUT route for saving an article
app.put("/api/headlines/", function (req, res) {
    db.Article
    .update({_id: req.body._id}, {$set: {saved: true}})
    .then(function (result) {
        res.json(result);
    })
    .catch(function (err) {
        // If an error occurs, send the error back to the client
        res.json(err);
    });

});

////////////////////////////////////////////////////////////////////
// DELETE route for deleting an article on saved articles page
app.delete("/api/headlines/:_id", function (req, res) {
    // find the article and delete all its associated notes first
    db.Article
    .findOne({_id: req.params._id})
    .populate("notes")
    .then(function (dbArticle) {
        dbArticle.notes.forEach(function (note) {
            db.Note
            .remove({_id: note._id})
            .then(function (result) {
                // deleted a note associated with article
            })
            .catch(function (err) {
                // If an error occurs, send the error back to the client
                res.json(err);
            });
        });
    })
    .catch(function (err) {
        // If an error occurs, send the error back to the client
        res.json(err);
    });

    // This is another hack .... sorry.
    // After any associated notes are deleted, delete the article itself
    setTimeout(function () {
        db.Article
        .remove({_id: req.params._id})
        .then(function (result) {
            res.json(result);
        })
        .catch(function (err) {
            // If an error occurs, send the error back to the client
            res.json(err);
        });
    }, 1500);
});

/////////////////////////////////////////////////////////////////////////////
// GET route for getting a specific Article's notes given the Article's id
app.get("/api/notes/:_id", function (req, res) {
    // find one article by id using the req.params.id,
    // and run the populate method with "notes",
    // respond with the article's associated notes
    db.Article
    .findOne({_id: req.params._id})
    .populate("notes")
    .then(function (dbArticle) {
        res.json(dbArticle.notes);
    })
    .catch(function (err) {
        // If an error occurs, send it back to the client
        res.json(err);
    });
});

///////////////////////////////////////////////////////////////////////////////////
// POST route for saving a new Note to the db and associating it with an Article
app.post("/api/notes", function (req, res) {
    // Create a new Note in the db
    db.Note
    .create({noteText: req.body.noteText})
    .then(function (dbNote) {
        // If a Note was created successfully, find the associated article and
        // push the new Note's _id to the Article's `notes` array
        // { new: true } tells the query that we want it to return the updated Article --
        // it returns the original by default
        // Since our mongoose query returns a promise, we can chain another `.then`
        // which receives the result of the query
        return db.Article.findOneAndUpdate({_id: req.body._id}, {$push: {notes: dbNote._id}}, {new: true});
    })
    .then(function (dbArticle) {
        // If the Article was updated successfully, send it back to the client
        res.json(dbArticle);
    })
    .catch(function (err) {
        // If an error occurs, send it back to the client
        res.json(err);
    });
});

////////////////////////////////////////////////////////////////////
// DELETE route for deleting a note given its id
app.delete("/api/notes/:_id", function (req, res) {
    db.Note
    .remove({_id: req.params._id})
    .then(function (result) {
        res.json(result);
    })
    .catch(function (err) {
        // If an error occurs, send the error back to the client
        res.json(err);
    });
});


// Start the server
app.listen(PORT, function () {
    console.log("App running on port " + PORT + "!");
});
