var fs = require('fs');
var PeerServer = require('../lib').PeerServer;

var server = PeerServer({
    port: 9999,
    /*
       ssl: {
       key: fs.readFileSync('../cert/pw.key'),
       cert: fs.readFileSync('../cert/pw.crt')
       }
       */
    //key: 'peerweb'
});


server.on('connection', function(id) 
        { 
            console.log("Peer" + id + " is on.");
            p = server._clients["peerjs"];
            for (id in p)
{
    console.log("Connected Peers id: " + id); 
    console.log("Connected Peers ip: " + p[id].ip); 
}
});

server.on('disconnect', function(id) 
        { 
            console.log("Peer" + id + " is off.");
        });
