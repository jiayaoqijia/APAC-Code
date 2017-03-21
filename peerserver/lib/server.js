var util = require('./util');
var bodyParser = require('body-parser');
var WebSocketServer = require('ws').Server;
var url = require('url');
var cors = require('cors');
var fs = require("fs");
var btoa = require('btoa');
var atob = require('atob');
var node_cryptojs = require('node-cryptojs-aes');
var CryptoJS = node_cryptojs.CryptoJS;
var policy = "../bin/policy.txt";

//By Yaoqi: Peers map to resources and peers
var resourceMapToPeer = {};
//E.g.,
//resourceMapToPeer["264ca980f97a4f91feecdfbb12486ed9d66f57190a0c4a302602500c589847f5.png"] = {"peer1": {latitude: 1, longitude: 123}, "peer2": {latitude: 2, longitude: 122}};
//resourceMapToPeer["264ca980f97a4f91feecdfbb12486ed9d66f57190a0c4a302602500c589847f5.png"] = ["peer1", "peer2", "peer3"];

var peerMapToPeer = {};
peerMapToPeer["peer1"] = ["peer2", "peer3", "peer4"];
peerMapToPeer["peer2"] = ["peer1", "peer3"];
peerMapToPeer["peer3"] = ["peer1", "peer2"];
peerMapToPeer["peer4"] = ["peer1"];

var peerMapPass = {};

var resources = {};
resources["86a3968ad2a59e91404f26d89e21a8bdcf775afc27ed74575dfaa2256a17e523.png"] = {path: "/pw/image/", label: "public"};
resources["a7025f370a05cc5216a229bcca6885c11ddff3df3876f00b99a3b8fe6572714d.png"] = {path: "/pw/image/", label: "private" , peers: ["peer1", "peer2"]};

//Routing mode
var resourceRouting = {};
//resourceRouting["1111111111"] = {"86a3968ad2a59e91404f26d89e21a8bdcf775afc27ed74575dfaa2256a17e523.png": ["peer1", "peer2"]};
//The number of peers for routing
var routingN = 6;


//Import policy

fs.readFile(policy, "ascii", function(err, data)
{
    var lines = data.split("\r\n");
    for (var i in lines)
    {
        var line = lines[i].split(",");
        if (typeof(line[1]) != "undefined")
        {
        resources[line[0]] = {path:line[1], label:line[2]};
        console.log(line[0] + line[1] + line[2]);
    }
    }
})



var app = exports = module.exports = {};

/** Initialize WebSocket server. */
app._initializeWSS = function(server) {
    var self = this;

    if (this.mountpath instanceof Array) {
        throw new Error("This app can only be mounted on a single path");
    }

    var path = this.mountpath;
    var path = path + (path[path.length - 1] != '/' ? '/' : '') + 'peerjs';

    // Create WebSocket server as well.
    this._wss = new WebSocketServer({ path: path, server: server});

    this._wss.on('connection', function(socket) {
        var query = url.parse(socket.upgradeReq.url, true).query;
        var id = query.id;
        var token = query.token;
        var key = query.key;
        var ip = socket.upgradeReq.socket.remoteAddress;

        if (!id || !token || !key) {
            socket.send(JSON.stringify({ type: 'ERROR', payload: { msg: 'No id, token, or key supplied to websocket server' } }));
            socket.close();
            return;
        }

        if (!self._clients[key] || !self._clients[key][id]) {
            self._checkKey(key, ip, function(err) {
                if (!err) {
                    if (!self._clients[key][id]) {
                        self._clients[key][id] = { token: token, ip: ip };
                        self._ips[ip]++;
                        socket.send(JSON.stringify({ type: 'OPEN' }));
                    }
                    self._configureWS(socket, key, id, token);
                } else {
                    socket.send(JSON.stringify({ type: 'ERROR', payload: { msg: err } }));
                }
            });
        } else {
            self._configureWS(socket, key, id, token);
        }
    });
};

app._configureWS = function(socket, key, id, token) {

    var self = this;
    var client = this._clients[key][id];

    if (token === client.token) {
        // res 'close' event will delete client.res for us
        client.socket = socket;
        // Client already exists
        if (client.res) {
            client.res.end();
        }
    } else {
        // ID-taken, invalid token
        socket.send(JSON.stringify({ type: 'ID-TAKEN', payload: { msg: 'ID is taken' } }));
        socket.close();
        return;
    }

    this._processOutstanding(key, id);

    // Cleanup after a socket closes.
    socket.on('close', function() {
        self._log('Socket closed:', id);
        if (client.socket == socket) {
            self._removePeer(key, id);
        }
    });

    // Handle messages from peers.
    socket.on('message', function(data) {
        try {
            var message = JSON.parse(data);

            if (['LEAVE', 'CANDIDATE', 'OFFER', 'ANSWER'].indexOf(message.type) !== -1) {
                self._handleTransmission(key, {
                    type: message.type,
                    src: id,
                    dst: message.dst,
                    payload: message.payload
                });
            } else {
                util.prettyError('Message unrecognized');
            }
        } catch(e) {
            self._log('Invalid message', data);
            throw e;
        }
    });

    // We're going to emit here, because for XHR we don't *know* when someone
    // disconnects.
    this.emit('connection', id);
};

app._checkAllowsDiscovery = function(key, cb) {
    cb(this._options.allow_discovery);
};

app._checkKey = function(key, ip, cb) {
    if (key == this._options.key) {
        if (!this._clients[key]) {
            this._clients[key] = {};
        }
        if (!this._outstanding[key]) {
            this._outstanding[key] = {};
        }
        if (!this._ips[ip]) {
            this._ips[ip] = 0;
        }
        // Check concurrent limit
        if (Object.keys(this._clients[key]).length >= this._options.concurrent_limit) {
            cb('Server has reached its concurrent user limit');
            return;
        }
        if (this._ips[ip] >= this._options.ip_limit) {
            cb(ip + ' has reached its concurrent user limit');
            return;
        }
        cb(null);
    } else {
        cb('Invalid key provided');
    }
};

/** Initialize HTTP server routes. */
app._initializeHTTP = function() {
    var self = this;

    this.use(cors());

    this.get('/', function(req, res, next) {
        res.send(require('../app.json'));
    });

    // Retrieve guaranteed random ID.
    this.get('/:key/id', function(req, res, next) {
        res.contentType = 'text/html';
        var hostReq = req.get("Host").split(":")[0];
        var originReq = req.get("Origin").split("//")[1];
        console.log(hostReq + " : " + originReq);
        if (hostReq == originReq)
        {
        res.send(self._generateClientId(req.params.key));
    }
    else
    {
        res.send(null);
    }
    });

    // Server sets up HTTP streaming when you get post an ID.
    this.post('/:key/:id/:token/id', function(req, res, next) {
        var id = req.params.id;
        var token = req.params.token;
        var key = req.params.key;
        var ip = req.connection.remoteAddress;

        if (!self._clients[key] || !self._clients[key][id]) {
            self._checkKey(key, ip, function(err) {
                if (!err && !self._clients[key][id]) {
                    self._clients[key][id] = { token: token, ip: ip };
                    self._ips[ip]++;
                    console.log(-1);
                    self._startStreaming(res, key, id, token, true);
                } else {
                    console.log(-2);
                    res.send(JSON.stringify({ type: 'HTTP-ERROR' }));
                }
            });
        } else {
            console.log(-3);
            self._startStreaming(res, key, id, token);
        }
    });

    // Get a list of all peers for a key, enabled by the `allowDiscovery` flag.
    this.get('/:key/peers', function(req, res, next) {
        var key = req.params.key;
        if (self._clients[key]) {
            self._checkAllowsDiscovery(key, function(isAllowed) {
                if (isAllowed) {
                    res.send(Object.keys(self._clients[key]));
                } else {
                    res.sendStatus(401);
                }
            });
        } else {
            res.sendStatus(404);
        }
    });


    // By Yaoqi: Request with the data's name 

    //Routing mode
    this.get('/:key/resourceRouting', function(req, res, next) {
        var name = req.query.name;
        var peerId = req.query.peerId;
        //var tokenId = req.query.tokenId;
        //var fromId = req.query.fromId;
        var data;
        var peerIdRes;
        var latitude = req.query.latitude;
        var longitude = req.query.longitude;
        var updateFlag = false;
        if (typeof(resources[name].path) != "undefined")
        {
        if (typeof(resourceMapToPeer[name]) != "undefined")
        {
        console.log("Resource path: " + resources[name].path + "Map peer name: " + Object.keys(resourceMapToPeer[name]));
        

        var peerObj = resourceMapToPeer[name];
        var minDis = 10000000000;
        peerIdRes = Object.keys(peerObj)[0];

        console.log("Object.keys(peerObj) " + Object.keys(peerObj));
        if (Object.keys(peerObj).length < routingN)
        {
        for (var p in peerObj)
        {
            var tmpDis = getDistanceFromLatLonInKm(latitude, longitude, peerObj[p].latitude, peerObj[p].longitude);
            if (tmpDis < minDis)
            {
                minDis = tmpDis;
                peerIdRes = p;
            }
            console.log("minDis: " + minDis + " peerIdRes: " + p);
        }
        
        data = resources[name].path;    

        
    }
    else
    {
        var destPeer = Object.keys(peerObj).slice();
        var key = randomString(32);
        var timestamp = Math.floor(new Date() / 1000);
        var nounce = randomString(Math.floor((Math.random() * 10) + 1 ) * 32);
        var finalData = "name=" + name + ";key=" + key + ";ts=" + timestamp + ";nounce=" + nounce;
        for (i = routingN; i >= 0;i --)
        {
            if (i - 1 < 0)
            {
                finalData = (CryptoJS.AES.encrypt(finalData + ";key=" + key, peerMapPass[peerId]).toString()); 
                console.log("Firstlayer: " + finalData);
                console.log("First pass: " + peerMapPass[peerId]);
                break;
            }
            finalData = CryptoJS.AES.encrypt(finalData, peerMapPass[destPeer[i - 1]]).toString() + ";peerId=" + destPeer[i - 1];
            console.log(finalData);
        }
        
        data = "data=" + finalData;
        updateFlag = true;
    }

    }
        else
    {
        data = resources[name].path; 
    }
    console.log("Send data: " + data);
    res.contentType = 'text/plain';
    res.status(200);
    res.send(data);
    if (updateFlag)
    {
    if (updatePeerMap(peerId, peerIdRes))
        {
            console.log("Adding new peer pairs" + peerMapToPeer[peerId] + "\r\n" + peerMapToPeer[peerIdRes]);
        }
        else
        {
            console.log("Peer paris are already in.");
        }
    }

    }
        else {
            res.sendStatus(404);
        }
    });

//Respond the requesting pass
this.get('/:key/requestPass', function(req, res, next) {
    var peerId = req.query.peerId;
    var pass = randomString(32);
    peerMapPass[peerId] = pass;
    console.log(peerId + "'s pass: " + pass);
    res.contentType = 'text/html';
    res.status(200);
    res.send(pass);
    

});

    //Normal mode
    this.get('/:key/resource', function(req, res, next) {
        var name = req.query.name;
        var peerId = req.query.peerId;
        var data;
        var peerIdRes;
        var latitude = req.query.latitude;
        var longitude = req.query.longitude;
        var updateFlag = false;
        if (typeof(resources[name].path) != "undefined")
    {
        if (typeof(resourceMapToPeer[name]) != "undefined")
    {
        console.log("Resource path: " + resources[name].path + "Map peer name: " + Object.keys(resourceMapToPeer[name]));
        var peerObj = resourceMapToPeer[name];
        var minDis = 10000000000;
        peerIdRes = Object.keys(peerObj)[0];
        for (var p in peerObj)
        {
            var tmpDis = getDistanceFromLatLonInKm(latitude, longitude, peerObj[p].latitude, peerObj[p].longitude);
            if (tmpDis < minDis)
            {
                minDis = tmpDis;
                peerIdRes = p;
            }
            console.log("minDis: " + minDis + " peerIdRes: " + p);
        }        

        data = "ID=" + peerIdRes;
        updateFlag = true;

    }
        else
    {
        data = resources[name].path; 
    }
    console.log("data " + data);
    res.contentType = 'text/html';
    res.status(200);
    res.send(data);
    if (updateFlag)
    {
    if (updatePeerMap(peerId, peerIdRes))
        {
            console.log("Adding new peer pairs" + peerMapToPeer[peerId] + "\r\n" + peerMapToPeer[peerIdRes]);
        }
        else
        {
            console.log("Peer paris are already in.");
        }
    }

    }
        else {
            res.sendStatus(404);
        }
    });


function randomString(length) {
    return Math.round((Math.pow(36, length + 1) - Math.random() * Math.pow(36, length))).toString(36).slice(1);
}

this.get('/:key/resourceMapToPeer', function(req, res, next) {
    var resource = req.query.resource;
    var peer = req.query.peer;
    var latitude = req.query.latitude;
    var longitude = req.query.longitude;
    var deleteFlag = false;

        if(resource && peer)
        {
            if (typeof(resourceMapToPeer[resource]) == "undefined")
            {
                resourceMapToPeer[resource] = {};
                resourceMapToPeer[resource][peer] = {"latitude": latitude, "longitude": longitude};
                console.log("1) Resource mapping: " + resource + " : " + peer);

        }
        else 
        {
            resourceMapToPeer[resource][peer] = {"latitude": latitude, "longitude": longitude};
            console.log("2) Resource mapping: " + resource + " : " + peer);

        }
        deleteFlag = true;
        res.sendStatus(200);
    }
    else {
        res.sendStatus(404);
    }
    if (deleteFlag)
    {
        console.log("Delete dead peers in tables.");
        deletePeerFromMap();
    }

});

function deletePeerFromMap ()
{
    var activePeers = self._clients["peerjs"];
    //Remove dead peers in peerMapToPeer table.
    for (var pId in peerMapToPeer)
    {
        if (typeof(activePeers[pId]) == "undefined")
        {
            for (var p in peerMapToPeer[pId])
            {
                console.log("peerMapToPeer removes " + peerMapToPeer[pId][p] + " and " + pId);
                arrayRemove(peerMapToPeer[peerMapToPeer[pId][p]], pId);
            }
            delete peerMapToPeer[pId];
        }
        console.log("peerMapToPeer current status: " + pId + " maps to " + peerMapToPeer[pId]);
    }
    //Remove dead peers in resourceMapToPeer table.
    
    for (var res in resourceMapToPeer)
    {
        var peerToRemove = {};
        for (var pId in resourceMapToPeer[res])
        {
            if (typeof(activePeers[pId]) == "undefined")
            {
                peerToRemove[pId] = resourceMapToPeer[res][pId];
                
            }
            
}
for (var i in peerToRemove)
{
    console.log("resourceMapToPeer previous status: " + res + " : " + Object.keys(resourceMapToPeer[res]));
    console.log("resourceMapToPeer removes peer " + i);
    delete resourceMapToPeer[res][i];
    console.log("resourceMapToPeer current status: " + res + " : " + Object.keys(resourceMapToPeer[res]));
}
}

}

function updatePeerMap (peer1, peer2)
{
    if (typeof(peerMapToPeer[peer1]) == "undefined")
    {
        peerMapToPeer[peer1] = [peer2];
        console.log("peer1 is undefined." );
        if (typeof(peerMapToPeer[peer2]) == "undefined")
        {
            console.log("peer2 is undefined." );
            peerMapToPeer[peer2] = [peer1];
    }
    else 
    {
        console.log("peer2 pushes peer1." );
        peerMapToPeer[peer2].push(peer1);
    }
    return true;
    }
    else if (peerMapToPeer[peer1].indexOf(peer2) == -1) 
        {
            peerMapToPeer[peer1].push(peer2);
            console.log("peer1 pushes peer2." );
            if (typeof(peerMapToPeer[peer2]) == "undefined")
        {
            console.log("peer2 is undefined." );
            peerMapToPeer[peer2] = [peer1];
    }
    else 
    {
        console.log("peer2 pushes peer1." );
        peerMapToPeer[peer2].push(peer1);   
    }
    return true;
        }
        else 
        {
            deletePeerFromMap();
            console.log("peer1 & peer2 are in." );
            return false;
        }

}

// Array removes a specific element.
function arrayRemove(arr, item) {
    // For all browsers
  for(var i = arr.length; i--;) {
      if(arr[i] === item) {
          arr.splice(i, 1);
      }
  } 
  // Chrome, IE9+, Safari, Firefox; for global arrays.
  /*
   var i;
   while((i = arr.indexOf(item)) !== -1) {
     arr.splice(i, 1);
   }
  //return arr;
  */
}

// Function to calculate distance based on latitude & longitude
function getDistanceFromLatLonInKm(lat1,lon1,lat2,lon2) {
    
    function deg2rad(deg) {
        return deg * (Math.PI/180)
    }

    var R = 6371; // Radius of the earth in km
    var dLat = deg2rad(lat2-lat1);  // deg2rad below
    var dLon = deg2rad(lon2-lon1); 
    var a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
        Math.sin(dLon/2) * Math.sin(dLon/2);

    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
    var d = R * c; // Distance in km
    return d;
}

    var handle = function(req, res, next) {
        var key = req.params.key;
        var id = req.params.id;

        var client;
        if (!self._clients[key] || !(client = self._clients[key][id])) {
            if (req.params.retry) {
                res.sendStatus(401);
            } else {
                // Retry this request
                req.params.retry = true;
                setTimeout(handle, 25, req, res);
                return;
            }
        }

        // Auth the req
        if (req.params.token !== client.token) {
            res.sendStatus(401);
            return;
        } else {
            self._handleTransmission(key, {
                type: req.body.type,
                src: id,
                dst: req.body.dst,
                payload: req.body.payload
            });
            res.sendStatus(200);
        }
    };

    var jsonParser = bodyParser.json();

    this.post('/:key/:id/:token/offer', jsonParser, handle);

    this.post('/:key/:id/:token/candidate', jsonParser, handle);

    this.post('/:key/:id/:token/answer', jsonParser, handle);

    this.post('/:key/:id/:token/leave', jsonParser, handle);
};


/** Saves a streaming response and takes care of timeouts and headers. */
app._startStreaming = function(res, key, id, token, open) {
    var self = this;

    res.writeHead(200, {'Content-Type': 'application/octet-stream'});

    var pad = '00';
    for (var i = 0; i < 10; i++) {
        pad += pad;
    }
    res.write(pad + '\n');
    //console.log("open " + open);
    if (open) {
        res.write(JSON.stringify({ type: 'OPEN' }) + '\n');
    }

    var client = this._clients[key][id];

    if (token === client.token) {
        // Client already exists
        res.on('close', function() {
            if (client.res === res) {
                if (!client.socket) {
                    // No new request yet, peer dead
                    console.log("peer dead");

                    self._removePeer(key, id);
                    return;
                }
                delete client.res;
            }
        });
        client.res = res;
        console.log("client");
        this._processOutstanding(key, id);
        // By Yaoqi, fix 
        //res.end(JSON.stringify({ type: 'OPEN' }) + "\n");
        res.end();

    } else {
        // ID-taken, invalid token
                console.log("error");

        res.end(JSON.stringify({ type: 'HTTP-ERROR' }));
    }
};

app._pruneOutstanding = function() {
    var keys = Object.keys(this._outstanding);
    for (var k = 0, kk = keys.length; k < kk; k += 1) {
        var key = keys[k];
        var dsts = Object.keys(this._outstanding[key]);
        for (var i = 0, ii = dsts.length; i < ii; i += 1) {
            var offers = this._outstanding[key][dsts[i]];
            var seen = {};
            for (var j = 0, jj = offers.length; j < jj; j += 1) {
                var message = offers[j];
                if (!seen[message.src]) {
                    this._handleTransmission(key, { type: 'EXPIRE', src: message.dst, dst: message.src });
                    seen[message.src] = true;
                }
            }
        }
        this._outstanding[key] = {};
    }
};

/** Cleanup */
app._setCleanupIntervals = function() {
    var self = this;

    // Clean up ips every 10 minutes
    setInterval(function() {
        var keys = Object.keys(self._ips);
        for (var i = 0, ii = keys.length; i < ii; i += 1) {
            var key = keys[i];
            if (self._ips[key] === 0) {
                delete self._ips[key];
            }
        }
    }, 600000);

    // Clean up outstanding messages every 5 seconds
    setInterval(function() {
        self._pruneOutstanding();
    }, 5000);
};

/** Process outstanding peer offers. */
app._processOutstanding = function(key, id) {
    var offers = this._outstanding[key][id];
    if (!offers) {
        //console.log("return");
        return;
    }
    for (var j = 0, jj = offers.length; j < jj; j += 1) {
        console.log("handle");
        this._handleTransmission(key, offers[j]);
    }
    delete this._outstanding[key][id];
};

app._removePeer = function(key, id) {
    if (this._clients[key] && this._clients[key][id]) {
        this._ips[this._clients[key][id].ip]--;
        delete this._clients[key][id];
        this.emit('disconnect', id);
    }
};

/** Handles passing on a message. */
app._handleTransmission = function(key, message) {
    var type = message.type;
    var src = message.src;
    var dst = message.dst;
    var data = JSON.stringify(message);

    var destination = this._clients[key][dst];

    // User is connected!
    if (destination) {
        try {
            this._log(type, 'from', src, 'to', dst);
            if (destination.socket) {
                destination.socket.send(data);
            } else if (destination.res) {
                data += '\n';
                destination.res.write(data);
            } else {
                // Neither socket no res available. Peer dead?
                throw "Peer dead";
            }
        } catch (e) {
            // This happens when a peer disconnects without closing connections and
            // the associated WebSocket has not closed.
            // Tell other side to stop trying.
            this._removePeer(key, dst);
            this._handleTransmission(key, {
                type: 'LEAVE',
                src: dst,
                dst: src
            });
        }
    } else {
        // Wait for this client to connect/reconnect (XHR) for important
        // messages.
        if (type !== 'LEAVE' && type !== 'EXPIRE' && dst) {
            var self = this;
            if (!this._outstanding[key][dst]) {
                this._outstanding[key][dst] = [];
            }
            this._outstanding[key][dst].push(message);
        } else if (type === 'LEAVE' && !dst) {
            this._removePeer(key, src);
        } else {
            // Unavailable destination specified with message LEAVE or EXPIRE
            // Ignore
        }
    }
};

app._generateClientId = function(key) {
    var clientId = util.randomId();
    if (!this._clients[key]) {
        return clientId;
    }
    while (!!this._clients[key][clientId]) {
        clientId = util.randomId();
    }
    return clientId;
};

app._log = function() {
    if (this._options.debug) {
        console.log.apply(console, arguments);
    }
};
