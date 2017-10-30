# MongoScraper - BBC News Edition

This is a web app that lets users view, save, and leave comments on the latest BBC News articles. The articles are scraped from the BBC News web site. Articles and any associated comments are saved in a database. 

- Express is used to handle routing
- Cheerio and Request are used as scraping technologies
- MongoDB is used for storing articles and comments 
- Mongoose is used as the ODM to model the data
- The app runs on port 3000 locally

The app is [deployed on Heroku](https://sheltered-reaches-10198.herokuapp.com/) 


## Application Description
The app has 2 web pages: 

* On the home page, the user can:
  * scrape for new news articles and add them to the database (no duplicates are added)
  * view the headline and a short summary for each article
  * click on the headline to view the full article in a separate browser tab
  * save an article 
  * go to the "saved articles" page
* On the "saved articles" page, the user can:
  * go back to the home page  
  * view the headline and a short summary for each saved article
  * click on the headline to view the full text of a saved article in a separate browser tab
  * add a comment (note) for any saved article (the comment is saved in the database and associated with the article)
  * view the comments for each saved article 
  * delete a comment from a saved article
  * delete a saved article (which removes it from the database, along with all its associated comments)
  
  
## Database model  
The Mongoose model is as follows:
* Article has the following fields:
  * headline 
  * url (link to the full article)
  * summary
  * saved (a boolean to denote whether the article is saved or not - initially false)
  * notes (an array of Note objectID's)  
  
* Note has just one field:  
  * noteText (the text of the comment) 
  
  
## API Routes

The app implements the following routes:

   * `GET /api/fetch`: Scrape for new articles and add them to the database (making sure the headline, url, and summary are all non-empty, and checking for duplicates) 
   
   * `GET /api/headlines?saved=false` and `GET /api/headlines?saved=true`: Get all the non-saved articles (to display on the home page) or saved articles (to display on the "saved articles" page) from the database.  
   
   * `PUT /api/headlines`: Save an article (i.e. mark it as a "saved" article). The objectId of the article is passed in `req.body._id`.
   
   * `DELETE /api/headlines/:_id`: Delete an article (given its objectId) and all its associated notes from the database.
   
   * `GET /api/notes/:_id`: Get all notes (comments) associated with a specific Article, given the Article's objectId.
   
   * `POST /api/notes`: Add a note (comment) for an article. The note text and the associated article's objectId are passed in `req.body`. 
   
   * `DELETE /api/notes/:_id`: Delete a note (comment) from the database, given its objectId.
  
  
  