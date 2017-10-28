var express = require("express");
var bodyParser = require("body-parser");
var mongoose = require("mongoose");

// Our scraping tools
var cheerio = require("cheerio");
var request = require("request");

// Require all models
var db = require("./models");

var PORT = 3000;

// Initialize Express
var app = express();

// Configure middleware

// Use body-parser for handling form submissions
app.use(bodyParser.urlencoded({extended: false}));
// Use express.static to serve the public folder as a static directory
app.use(express.static("public"));

// Set mongoose to leverage built in JavaScript ES6 Promises
// Connect to the Mongo DB
mongoose.Promise = Promise;
mongoose.connect("mongodb://localhost/BBCNewsScrape", {
    useMongoClient: true
});

// Routes
///////////////////////////////////////////////////////////////
// A GET route for scraping the BBC News website
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

            // find the headline and url of the article
            var $title = $(element).find("h3.media__title a");
            result.url = "http://www.bbc.com" + $title.attr("href");
            result.headline = $title.text().replace(/^\s+|\s+$/g, '');   // get rid of whitespace and \n, \r

            // find the summary text for the article
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

            res.json({message: message});
        }, 1500);

    });
});

///////////////////////////////////////////////////////////////////
// Route for getting all saved or not-saved Articles from the db
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
// Route for saving an article
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
// Route for deleting an article on saved articles page
app.delete("/api/headlines/:_id", function (req, res) {
    db.Article
    .remove({_id: req.params._id})
    .then(function (result) {
        res.json(result);
    })
    .catch(function (err) {
        // If an error occurs, send the error back to the client
        res.json(err);
    });

});

/*
// Route for grabbing a specific Article by id, populate it with it's note
app.get("/articles/:id", function (req, res) {
  // TODO
  // ====
  // Finish the route so it finds one article using the req.params.id,
  // and run the populate method with "note",
  // then responds with the article with the note included
  db.Article
      .findOne({_id: req.params.id})
      .populate("note")
      .then(function (dbArticle) {
        res.json(dbArticle);
      })
      .catch(function (err) {
        // If an error occurs, send it back to the client
        res.json(err);
      });
});

// Route for saving/updating an Article's associated Note
app.post("/articles/:id", function (req, res) {
  // TODO
  // ====
  // save the new note that gets posted to the Notes collection
  // then find an article from the req.params.id
  // and update it's "note" property with the _id of the new note
  db.Note
      .create(req.body)
      .then(function (dbNote) {
        // If a Note was created successfully, find the article by its id and set it's note field to the new Note's _id
        // { new: true } tells the query that we want it to return the updated User -- it returns the original by default
        // Since our mongoose query returns a promise, we can chain another `.then` which receives the result of the query
        return db.Article.findOneAndUpdate({_id: req.params.id}, {$set: {note: dbNote._id}}, {new: true});
      })
      .then(function (dbArticle) {
        // If the Article was updated successfully, send it back to the client
        res.json(dbArticle);
      })
      .catch(function (err) {
        // If an error occurs, send it back to the client
        res.json(err);
      });
});*/

// Start the server
app.listen(PORT, function () {
    console.log("App running on port " + PORT + "!");
});
