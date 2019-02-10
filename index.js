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
// type 0 = path, 1 = subdomain
async function checkPath(p, type = 0) {
    return new Promise((resolve, reject) => {
        var col = type == 0 ? config.linksCollection : config.subCollection;
        MongoClient.connect(url, { useNewUrlParser: true }, function(err, db) {
            if (err) reject(err)
            var dbo = db.db(config.database);
            var myobj = { path: p };
            dbo.collection(col).findOne(myobj, function(err, res) {
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

async function findLinks(owner, type = 0) {
    return new Promise((resolve, reject) => {
        var col = type == 0 ? config.linksCollection : config.subCollection;

        MongoClient.connect(url, { useNewUrlParser: true }, function(err, db) {
            if (err) reject(err)
            var dbo = db.db(config.database);
            var myobj = { owner: owner };
            dbo.collection(col).find(myobj).toArray(function(err, res) {
                if (err) throw err;
                resolve(res);
                db.close();
            });
        });
    })
}

// type 0 = path, 1 = sub
async function createPath(newUrl, p, owner, type = 0) {
    return new Promise((resolve, reject) => {
        var col = type == 0 ? config.linksCollection : config.subCollection;

        MongoClient.connect(url, { useNewUrlParser: true }, function(err, db) {
            if (err) reject(err)
            var dbo = db.db(config.database);
            var myobj = { owner: owner, url: newUrl, path: p, clicks: [], referrals: [] };
            dbo.collection(col).insertOne(myobj, function(err, res) {
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

async function clickUrl(path, req = [], type = 0) {
    return new Promise((resolve, reject) => {
        var clickTime = new Date();
        var ref = req.get("Referer") !== undefined ? req.get("Referer") : "http://Unknown URL";
        var col = type == 0 ? config.linksCollection : config.subCollection;

        clickTime = clickTime.getFullYear() + "-" + clickTime.getDate() + "-" + (clickTime.getMonth() + 1);
        MongoClient.connect(url, { useNewUrlParser: true }, function(err, db) {
            if (err) reject(err)
            var dbo = db.db(config.database);
            var findobj = { path: path };
            dbo.collection(col).updateOne({path: path}, {$push: {clicks: clickTime, referrals: ref}}, function(err, res) {
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
                            res.json({token: newToken, base: config.urlbase});
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
    var owner = req.body['username']; // set user
    var type = req.body['type'];

    if(url !== undefined && url !== "") {
        // Handle New Path Redirects
        if(type == "0") {
            if(custom == "" || custom == undefined) {
                custom = makeid(6);
            }

            checkPath(custom).then((resp) => {
                if(resp == true) {
                    createPath(url, custom, owner).then((resp) => {
                        res.json({status: "complete", path: custom});
                    })
                } else {
                    res.json({status: "pathTaken"});
                }
            })
        }
        // Handle New Subdomain Redirects
        if(type == "1") {
            if(custom !== undefined && url !== undefined) {
                checkPath(url, 1).then((resp) => {
                    if(resp == true) {
                        createPath(custom, url, owner, 1).then((resp) => {
                            res.json({status: "complete", path: url});

                        });
                    } else {
                        res.json({status: "subTaken"}); 
                    }
                })            
            } else {
                res.json({status: "noArgs"});
            }
        }
    } else {
        res.status(406).send("invalidArgs");
    }

});

app.post('/api/click', (req, res) => {
    var url = req.body['url'].split("/")[req.body['url'].split("/").length - 1];
    res.json({status: "done"});

    clickUrl(url, req);
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

function getAllIndexes(arr, val) {
    var indexes = [], i = -1;
    while ((i = arr.indexOf(val, i+1)) != -1){
        indexes.push(i);
    }
    return indexes;
}

app.post('/api/list', (req, res) => {
    var owner = req.body['username'];
    var paths = [];
    var subs = [];
    findLinks(owner).then((resp) => {
        for(let i = 0; i < resp.length; i++) {
            var clicks = resp[i]['clicks'];
            var allrefs = resp[i]["referrals"];
            var clickCount = clicks.length;
            var detailedClicks = [];
            var refs = [];

            var setDates = [];
            var setRefs = [];

            var addPaths = [];

            detailedClicks = clicks.map((element) => {
                if(setDates.indexOf(element) == -1) {
                    setDates.push(element)
                    return {date: element, count: getAllIndexes(clicks, element).length};

                } else {
                    return false;
                }
            }).filter((element) => {
                if(element !== false) {
                    return element;
                } else {
                    return false;
                }
            });

            refs = allrefs.map((element) => {
                var fullUrl = element;
                var hostname = element.split('/')[2];

                if(setRefs.indexOf(hostname) == -1) {
                    setRefs.push(hostname)
                    return {url: hostname, count: getAllIndexes(allrefs, element).length, paths: [fullUrl]};

                } else {
                    return {hostname: hostname, fullUrl: fullUrl};
                }
            }).filter((element) => {
                if(element['hostname'] == undefined) {
                    return element;
                } else {
                    addPaths.push(element);
                    return false;
                }
            });

            for(var x = 0; x < addPaths.length; x++) {
                refs[setRefs.indexOf(addPaths[x]['hostname'])]['paths'].push(addPaths[x]['fullUrl']);
            }
            
            resp[i]['clicks'] = clicks.length;
            resp[i]['detailedClicks'] = detailedClicks;

            resp[i]["referrals"] = refs;
        }

        paths = resp;

        findLinks(owner, 1).then((resps) => {
            for(let i = 0; i < resps.length; i++) {
                var clicks = resps[i]['clicks'];
                var allrefs = resps[i]["referrals"];
                var clickCount = clicks.length;
                var detailedClicks = [];
                var refs = [];
    
                var setDates = [];
                var setRefs = [];
    
                var addPaths = [];
    
                detailedClicks = clicks.map((element) => {
                    if(setDates.indexOf(element) == -1) {
                        setDates.push(element)
                        return {date: element, count: getAllIndexes(clicks, element).length};
    
                    } else {
                        return false;
                    }
                }).filter((element) => {
                    if(element !== false) {
                        return element;
                    } else {
                        return false;
                    }
                });
    
                refs = allrefs.map((element) => {
                    var fullUrl = element;
                    var hostname = element.split('/')[2];
    
                    if(setRefs.indexOf(hostname) == -1) {
                        setRefs.push(hostname)
                        return {url: hostname, count: getAllIndexes(allrefs, element).length, paths: [fullUrl]};
    
                    } else {
                        return {hostname: hostname, fullUrl: fullUrl};
                    }
                }).filter((element) => {
                    if(element['hostname'] == undefined) {
                        return element;
                    } else {
                        addPaths.push(element);
                        return false;
                    }
                });
    
                for(var x = 0; x < addPaths.length; x++) {
                    refs[setRefs.indexOf(addPaths[x]['hostname'])]['paths'].push(addPaths[x]['fullUrl']);
                }
                
                resps[i]['clicks'] = clicks.length;
                resps[i]['detailedClicks'] = detailedClicks;
    
                resps[i]["referrals"] = refs;
            }
    
            subs = resps;

            res.json([paths, subs]);
        })
        
    })

});



app.get('/:path?', (req, res) => {
    var path = req.params.path;
    var domain = req.get('host').match(/\w+/); // e.g., host: "subdomain.website.com"

    if(domain[0] !== config.urlbase.split('/')[2]) {
        checkPath(domain[0], 1).then((resp) => {
            if(resp['url'] !== undefined) {
                clickUrl(domain[0], req, 1);
                res.redirect(resp['url']);
            } else {
                res.redirect('back');
            }
        })
    } else {
        if(path == 'undefined') {
            res.redirect('/login');
        }
        if(path == 'admin') {
            res.sendFile('public/index.html' , { root : __dirname});
        }
        if(path == 'login') {
            res.sendFile('public/login.html' , { root : __dirname});
        }
        if(path == 'test') {
            res.sendFile('public/test.html' , { root : __dirname});
        }
        if(path !== 'static' && path !== 'admin' && path !== 'login' && path !== "test" && path !== "") {
            checkPath(path).then((resp) => {
                if(resp['url'] !== undefined) {
                    clickUrl(path, req);
                    res.redirect(resp['url']);
                } else {
                    res.redirect('/login');
                }
            })
        }
    }
        
});

app.listen(config.port, '127.0.0.1')