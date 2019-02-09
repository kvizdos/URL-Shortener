var config = {};

config.mongourl = "mongodb://localhost:27017";
config.database = "shorty";
config.linksCollection = "links";
config.usersCollection = "users";

// Make sure to include final '/'!
config.urlbase = "https://kvizdos.com/";

module.exports = config;