function init ()
{
    var peer = new Peer(null, {host: 'localhost', port: 9999, path: '/'});
    peer.on('open', function(id) {
        console.log('My peer ID is: ' + id);
        //window.onload = function (id){
        var p1 = document.createElement("p");
        p1.innerHTML = "Your ID is " + id;
        document.getElementById("pid").appendChild(p1);
/*
        var url = "http://localhost:9999/peerjs";
        loadResource(url, "img1", "image", "464a1654fa85848684d56d48c6d5385b92f55e36791e9d55e09bf7f23281604e.png", id);
        */
        //    }
    });
    //var data = peer.loadResource("464a1654fa85848684d56d48c6d5385b92f55e36791e9d55e09bf7f23281604e.png");
    //console.log("Response: " + data);
    /*
    peer.on('connection', function(conn) 
            { 
                conn.on('open', function() {
                    // Receive messages
                    conn.on('data', function(data) {
                        console.log('Received', data);
                    });

                    // Send messages
                    conn.send('Hello!');
                });
            });
            */
}
window.onload = function()
{

init();
}

function locate (name)
{

}

function load (name, id)
{
}


