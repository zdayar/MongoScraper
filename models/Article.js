var mongoose = require("mongoose");

// Save a reference to the Schema constructor
var Schema = mongoose.Schema;

// Using the Schema constructor, create a new ArticleSchema object
// This is similar to a Sequelize model
var ArticleSchema = new Schema({
    // headline of the article
    headline: {
        type: String,
        required: true
    },
    // link to the full article
    url: {
        type: String,
        required: true
    },
    // short summary of article
    summary: {
        type: String,
        required: true
    },
    // whether the article is saved or not ... initially false
    saved: {
        type: Boolean,
        default: false
    },
    // `notes` is an array that stores ObjectIds
    // The ref property links these ObjectIds to the Note model
    // This allows us to populate the Article with any associated Notes
    notes: [
        {
            // Store ObjectIds in the array
            type: Schema.Types.ObjectId,
            // The ObjectIds will refer to the ids in the Note model
            ref: "Note"
        }
    ]
});

// This creates our model from the above schema, using mongoose's model method
var Article = mongoose.model("Article", ArticleSchema);

// Export the Article model
module.exports = Article;
