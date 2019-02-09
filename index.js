// Install body-parser and Express
const express = require('express')
const app = express()

const config = require('./config');

var bodyParser = require('body-parser')
var MongoClient = require('mongodb').MongoClient;
var url = config.mongourl;
var crypto = require('crypto');

function makeid(len) {
  var text = "";
  var possible = "abcdefghijklmnopqrstuvwxyz0123456789";

  for (var i = 0; i < len; i++)
    text += possible.charAt(Math.floor(Math.random() * possible.length));

  return text;
}

async function checkPath(p) {
    return new Promise((resolve, reject) => {
        MongoClient.connect(url, { useNewUrlParser: true }, function(err, db) {
            if (err) reject(err)
            var dbo = db.db(config.database);
            var myobj = { path: p };
            dbo.collection(config.linksCollection).findOne(myobj, function(err, res) {
                if (err) throw err;
                if(res !== null) {
                    resolve({url: res['url']})
                    //return true;
                } else {
                    resolve(true);
                    //return false;
                }
                db.close();
            });
        });
    })
}

async function findLinks(p) {
    return new Promise((resolve, reject) => {
        MongoClient.connect(url, { useNewUrlParser: true }, function(err, db) {
            if (err) reject(err)
            var dbo = db.db(config.database);
            var myobj = { };
            dbo.collection(config.linksCollection).find({}).toArray(function(err, res) {
                if (err) throw err;
                resolve(res);
                db.close();
            });
        });
    })
}

async function createPath(newUrl, p) {
    return new Promise((resolve, reject) => {
        MongoClient.connect(url, { useNewUrlParser: true }, function(err, db) {
            if (err) reject(err)
            var dbo = db.db(config.database);
            var myobj = { url: newUrl, path: p, clicks: 0 };
            dbo.collection(config.linksCollection).insertOne(myobj, function(err, res) {
                if (err) {
                    throw err;
                } else {
                    resolve(true)
                }
                db.close();
            });
        });
    });
}

async function clickUrl(path) {
    return new Promise((resolve, reject) => {
        MongoClient.connect(url, { useNewUrlParser: true }, function(err, db) {
            if (err) reject(err)
            var dbo = db.db(config.database);
            var findobj = { path: path };
            dbo.collection(config.linksCollection).updateOne(findobj, {$inc: {clicks: 1}}, function(err, res) {
                if (err) {
                    throw err;
                } else {
                    resolve(true)
                }
                db.close();
            });
        });
    });
}

var verifiedTokens = [];
var verifiedUsers = [];

async function verifyUser(username, token) {
    return new Promise((resolve, reject) => {
        if(verifiedTokens.indexOf(token) >= 0) {
            if(verifiedUsers[verifiedTokens.indexOf(token)] == username) {
                resolve({status: "verified"});
            } else {
                MongoClient.connect(url, { useNewUrlParser: true }, function(err, db) {
                    if (err) reject(err)
                    var dbo = db.db(config.database);
                    var myobj = { username: username, token: token };
                    dbo.collection(config.usersCollection).findOne(myobj, function(err, resp) {
                        if (err) throw err;
                        if(resp !== null) {
                            verifiedUsers.push(username);
                            verifiedTokens.push(token);
                            resolve({status: "verified"});
                        } else {
                            resolve({status: "incorrectUsernameOrToken"});
                            //return false;
                        }
                        db.close();
                    });
                });
            }
        } else {
            MongoClient.connect(url, { useNewUrlParser: true }, function(err, db) {
                if (err) reject(err)
                var dbo = db.db(config.database);
                var myobj = { username: username, token: token };
                dbo.collection(config.usersCollection).findOne(myobj, function(err, resp) {
                    if (err) throw err;
                    if(resp !== null) {
                        verifiedUsers.push(username);
                        verifiedTokens.push(token);
                        resolve({status: "verified"});
                    } else {
                        resolve({status: "incorrectUsernameOrToken"});
                        //return false;
                    }
                    db.close();
                });
            });
        }
    })
}

// Use req.query to read values!!
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

var preverify = function(req, res, next) {
    path = req.originalUrl.split('/');
    going = path.splice(2, 1)[0];
    path = path.splice(1, 1)[0];
    if(path == "api" && going !== "list") {
        if(typeof req.headers['authorization'] == 'undefined') {
            res.status(401).send("No credentials sent!");
        } else {
            req.headers.authoriation = JSON.parse(req.headers['authorization']);
            var username = req.headers.authoriation['username'];
            var token = req.headers.authoriation['token'];
            verifyUser(username, token).then((verification) => {
                if(verification['status'] == "verified") {
                    next();
                } else {
                    res.status(401).send("Tough luck buddy");
                }
            })
        }
    } else {
        next();
    }
}

app.use(preverify);


app.get('/admin', (req, res) => res.sendFile('public/index.html' , { root : __dirname}));
app.post('/admin/auth', (req, res) => {
    var username = req.body['username'];
    var password = req.body['password'];

    MongoClient.connect(url, { useNewUrlParser: true }, function(err, db) {
        if (err) reject(err)
        var dbo = db.db(config.database);
        var myobj = { username: username };
        dbo.collection(config.usersCollection).findOne(myobj, function(err, resp) {
            if (err) throw err;
            if(resp !== null) {
                password = crypto.createHash('sha256').update(password + resp['salt']).digest('base64');

                if(resp['password'] == password) {
                    var newToken = makeid(60);
                    dbo.collection(config.usersCollection).updateOne({username: username}, {$set: {token: newToken}}, function(err, resp) {
                        if (err) {
                            throw err;
                        } else {
                            res.json({token: newToken});
                        }
                        db.close();
                    });
                } else {
                    res.json({status: "incorrectPassword"})
                }
                //return true;
            } else {
                res.json({status: "incorrectUsername"});
                //return false;
            }
            db.close();
        });
    });
});

app.post('/admin/verify', (req, res) => {
    var username = req.body['username'];
    var token = req.body['token'];

    verifyUser(username, token).then((resp) => {
        res.json(resp);
    })
})

app.use('/static', express.static('scripts'))

app.post('/api/create', (req, res) => {
    var url = req.body['url']; // Full URL to shorten
    var custom = req.body['custom']; // custom path



    if(custom == undefined) {
        custom = makeid(6);
    }

    checkPath(custom).then((resp) => {
        if(resp == true) {
            res.end(JSON.stringify({status: "complete", path: custom}))
            createPath(url, custom).then((res) => {
                console.log("Created Link: " + custom);
            })
        } else {
            res.end(JSON.stringify({status: "pathTaken"}));
        }
    })

});

app.post('/api/click', (req, res) => {
    var url = req.body['url'].split("/")[req.body['url'].split("/").length - 1];
    res.end(JSON.stringify({status: "done"}));
    
    clickUrl(url)
})


app.post('/api/delete', (req, res) => {
    var path = req.body['path'];
    checkPath(path).then((response) => {
        if(response['url'] !== undefined) {
            MongoClient.connect(url, { useNewUrlParser: true }, function(err, db) {
                if (err) reject(err)
                var dbo = db.db(config.database);
                var myobj = { path: path };
                dbo.collection(config.linksCollection).deleteOne(myobj, function(err, resp) {
                    if (err) throw err;
                    res.json({status: "success"});
                    db.close();
                });
            });
        } else {
            res.json({status: "noPath"})
        }
    });
})

app.post('/api/update', (req, res) => {
    var path = req.body['path'];
    var change = req.body['change'];
    checkPath(path).then((response) => {
        if(response['url'] !== undefined) {
            MongoClient.connect(url, { useNewUrlParser: true }, function(err, db) {
                if (err) reject(err)
                var dbo = db.db(config.database);
                var myobj = { path: path };
                dbo.collection(config.linksCollection).updateOne({path: path}, {$set: {url: change}}, function(err, resp) {
                    if (err) throw err;
                    res.json({status: "success"});
                    db.close();
                });
            });
        } else {
            res.json({status: "noPath"})
        }
    });
})

app.get('/api/list', (req, res) => {
    findLinks().then((resp) => {
        res.json(resp);
    })
});



app.get('/:path?', (req, res) => {
    var path = req.params.path;
    if(path == 'undefined') {
        res.redirect('/login');
    }
    if(path == 'admin') {
        res.sendFile('public/index.html' , { root : __dirname});
    }
    if(path == 'login') {
        res.sendFile('public/login.html' , { root : __dirname});
    }
    if(path !== 'static' && path !== 'admin' && path !== 'login' && path !== "") {
        checkPath(path).then((resp) => {
            if(resp['url'] !== undefined) {
                clickUrl(path);
                res.redirect(resp['url']);
            } else {
                res.redirect('/login');
            }
        })
    }
        
});

app.listen(3030, () => console.log('Example app listening on port 3030!'))