var config = {};

config.port = 7777;

config.mongourl = "mongodb://localhost:27017";
config.database = "shorty";
config.linksCollection = "links";
config.subCollection = "subs";

config.usersCollection = "users";

// Make sure to include final '/'!
//config.urlbase = "https://kvizdos.com/";
config.urlbase = "http://localhost.com";

module.exports = config;