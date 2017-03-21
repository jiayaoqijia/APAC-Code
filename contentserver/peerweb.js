var host = "localhost";
var port = "9999";
var peer = new Peer(null, {host: host, port: port, path: '/'});

//Get the geolocation of the current browser
navigator.geolocation.getCurrentPosition(geoSuccess, geoError);

peer.on('open', function(id) {
//console.log('My peer ID is: ' + id);
//window.onload = function (id){
    var p1 = document.createElement("p");
    p1.innerHTML = "Your ID is " + id; 
    document.getElementById("pid").appendChild(p1);

    var url = "http://" + host + ":" + port + "/peerjs";
    loadResource(url, "img1", "image", "464a1654fa85848684d56d48c6d5385b92f55e36791e9d55e09bf7f23281604e.png", id);
    loadResource(url, "img2", "image", "264ca980f97a4f91feecdfbb12486ed9d66f57190a0c4a302602500c589847f5.png", id);

}); 

peer.on('connection', function(conn) 
{   
    //console.log("Receive other peers");

    conn.on('open', function() {
                // Receive messages
                

                // Send messages
                //conn.send('Hello!');
            }); 
    conn.on('data', function(data) {
                    //console.log('Received', data);
                getDataFromDB(data, conn);

                }); 
});

function geoSuccess(position) {
    latitude  = position.coords.latitude;
    longitude = position.coords.longitude;
    console.log(latitude + " " + longitude);
    if (typeof(Storage) != "undefined") {
    // Store
    localStorage.setItem("latitude", latitude);    
    localStorage.setItem("longitude", longitude);
    // Retrieve
    //document.getElementById("result").innerHTML = localStorage.getItem("lastname");
} else {
    alert("Sorry, your browser does not support Web Storage...");
}

  };

  function geoError() {
    console.log("Unable to retrieve your location");
  };

// By Yaoqi: Load resources from peers or server
function loadResourceFromPeer (url, id, type, path, name, peerId)
{

    if (path.substring(0, 3) != "ID=")
    {
        var urlOri = location.origin + path + name; 
        var xmlhttp = new XMLHttpRequest();
        xmlhttp.open('get', urlOri, false);
        xmlhttp.onreadystatechange = function () 
        {
        if ((xmlhttp.status == 200) || (xmlhttp.status == 304))
        {
            var data = xmlhttp.responseText; 

            //Append resource and store in indexedDB
            appendResource(url, id, type, name, data, peerId, true);
            console.log("Successfully load resource from server");

        }
        }

        if (type == "image")
        {
            xmlhttp.overrideMimeType('text/plain; charset=x-user-defined');
        }
        xmlhttp.send();
    }
    else
    {
        var otherPeerId = path.substring(3, path.length); 
        console.log("Other id:" + otherPeerId);
        //peer2 = new Peer({ key: "lwjd5qra8257b9", debug: 3});
        var peerReq = new Peer(null, {host: host, port: 9999, path: '/'});

        var conn = peerReq.connect(otherPeerId);

        //console.log('Received');
        conn.on("open", function()
        {
            console.log("Open" + name);
            conn.send(name);
        });
        conn.on('data', function(data) {
        //console.log(data);
        if (data !== "no data")
        {
            //console.log(data);
            appendResource(url, id, type, name, data, peerId, false);
            console.log("Successfully load resource from Peer: " + otherPeerId);

        }

        });

        conn.on("error", function(err)
        {
            console.log("error " + err);
        });

    }
}


/** Load resource from the server via XHR. 
* Name is a hash value.
* */

function loadResource (url, id, type, name, peerId)
{
//prefixes of implementation that we want to test
window.indexedDB = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB;

//prefixes of window.IDB objects
window.IDBTransaction = window.IDBTransaction || window.webkitIDBTransaction || window.msIDBTransaction;
window.IDBKeyRange = window.IDBKeyRange || window.webkitIDBKeyRange || window.msIDBKeyRange

if (!window.indexedDB) {
    window.alert("Your browser doesn't support a stable version of IndexedDB.")
}

var db
var request = window.indexedDB.open("peerweb", 2);

request.onerror = function(event) {
    console.log("error: ");
};

request.onsuccess = function(event) {
    db = request.result;

var transaction = db.transaction(["resources"]);
var req = transaction.objectStore("resources").get(name);

transaction.oncomplete = function(event) {
  console.log("Successfully transaction.");
};

transaction.onerror = function(event) {
    console.log("Errors transaction.");

};
req.onsuccess = function(event) {
  if (typeof(event.target.result) !== "undefined")
  {
      console.log("Successfully retrieving data from DB.");
      appendResource(url, id, type, name, event.target.result.data, peerId, false);

}
else
{
      checkResource(url, id, type, name, peerId);
}
};

req.onerror = function(event) {
  console.log("Errors when retrieving new data.");

};   

};

request.onupgradeneeded = function(event) {
    var db = event.target.result;

    if(!db.objectStoreNames.contains("resources"))
    {
        var objectStore = db.createObjectStore("resources", {keyPath: "id"});
            checkResource(url, id, type, name, peerId);

    }

}
}

function checkResource(url, id, type, name, peerId) 
{
    var xmlhttp = new XMLHttpRequest();

//Get latitude and longituede from local storage.
var latitude = localStorage.getItem("latitude");
var longitude = localStorage.getItem("longitude");
var queryString = '/resource?name=' + name + "&peerId=" + peerId + "&latitude=" + latitude + "&longitude=" + longitude;
var urlRes = url + queryString;

xmlhttp.open('get', urlRes, false);
xmlhttp.onreadystatechange = function () {

if ((xmlhttp.status == 200) || (xmlhttp.status == 304)) 
{
        loadResourceFromPeer(url, id, type, xmlhttp.responseText, name, peerId);
        //Update R in the current peer. 
    }
}
xmlhttp.send();
}
// Append resource
function appendResource (url, id, type, name, data, peerId, encode)
{
var target = document.getElementById(id);
if (type == "image")
{
    if (encode)
    {
    data = dataToImage(data);
}

    target.src = "data:image;base64," + data;
    addDataToDB(url, name, data, peerId);
    return true;
}
return false;
}

function dataToImage(data)
{

    var img = "";
    for (var i = 0, text = data, l = text.length; i < l; i++) {
        img += String.fromCharCode(text.charCodeAt(i) & 0xff);
    }

return window.btoa(img);
}



function addDataToDB(url, name, data, peerId)
{
//prefixes of implementation that we want to test
window.indexedDB = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB;

//prefixes of window.IDB objects
window.IDBTransaction = window.IDBTransaction || window.webkitIDBTransaction || window.msIDBTransaction;
window.IDBKeyRange = window.IDBKeyRange || window.webkitIDBKeyRange || window.msIDBKeyRange

if (!window.indexedDB) {
    window.alert("Your browser doesn't support a stable version of IndexedDB.")
}

const newData = { "id": name, "data": data};
var db;
var request = window.indexedDB.open("peerweb", 2);

request.onerror = function(event) {
    console.log("error: ");
};

request.onsuccess = function(event) {
    db = request.result;
var transaction = db.transaction(["resources"], "readwrite");
transaction.objectStore("resources").add(newData);

//Get latitude and longituede from local storage.
var latitude = localStorage.getItem("latitude");
var longitude = localStorage.getItem("longitude");
//Send request to update the mappting status.
var urlResMap = url + "/resourceMapToPeer?resource=" + name + "&peer=" + peerId + "&latitude=" + latitude + "&longitude=" + longitude;
getRequest(urlResMap);

transaction.oncomplete = function(event) {
  console.log("Successfully add new data.");
};

transaction.onerror = function(event) {
    console.log("Errors when adding new data.");

};


};

request.onupgradeneeded = function(event) {
    var db = event.target.result;

    if(!db.objectStoreNames.contains("resources"))
    {
        var objectStore = db.createObjectStore("resources", {keyPath: "id"});
        objectStore.add(newData);

    }

}
}
function getDataFromDB(name, conn)
{
//prefixes of implementation that we want to test
window.indexedDB = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB;

//prefixes of window.IDB objects
window.IDBTransaction = window.IDBTransaction || window.webkitIDBTransaction || window.msIDBTransaction;
window.IDBKeyRange = window.IDBKeyRange || window.webkitIDBKeyRange || window.msIDBKeyRange

if (!window.indexedDB) {
    window.alert("Your browser doesn't support a stable version of IndexedDB.")
}

var db;
var request = window.indexedDB.open("peerweb", 2);

request.onerror = function(event) {
    console.log("error: ");
};

request.onsuccess = function(event) {
    db = request.result;
var transaction = db.transaction(["resources"]);
var req = transaction.objectStore("resources").get(name);

req.onsuccess = function(event) {
  console.log("Successfully retrieving data.");
  //console.log(event.target.result.data);
  conn.send(event.target.result.data);
};

req.onerror = function(event) {
  console.log("Errors when retrieving new data.");
  conn.send("no data");
};   

};
}
//Cannot return responseText, as it's asynchonous.
function postRequest(url, data)
{
    var xmlhttp = new XMLHttpRequest();
    xmlhttp.open("post", url, false);
    xmlhttp.onreadystatechange = function () {

   if ((xmlhttp.status == 200) || (xmlhttp.status == 304)) 
   {
    return true;
}
return false;
}
xmlhttp.send(data);
}

function getRequest(url)
{
    var xmlhttp = new XMLHttpRequest();
    xmlhttp.open("get", url, false);
    xmlhttp.onreadystatechange = function () {

   if ((xmlhttp.status == 200) || (xmlhttp.status == 304)) 
   {
    return true;
}
return false;
}
xmlhttp.send();
}
