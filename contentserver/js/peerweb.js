//var host = "localhost";
var host = "104.131.65.132";
var port = "9999";
var peer = new Peer(null, {host: host, port: port, path: '/'});
var myId = "0";
var pass = "";
//Get the geolocation of the current browser
navigator.geolocation.getCurrentPosition(geoSuccess, geoError);

peer.on('open', function(id) {
//console.log('My peer ID is: ' + id);
//window.onload = function (id){
  var p1 = document.createElement("p");
  p1.innerHTML = "Your ID is " + id; 
  myId = id;
  document.getElementById("pid").appendChild(p1);

  var url = "http://" + host + ":" + port + "/peerjs";

//Fetch the list of content
  var fetchUrl = "image/fetch.txt";
  var counter = 0;
  var xmlhttp = new XMLHttpRequest();
  xmlhttp.open('get', fetchUrl, false);
  xmlhttp.onreadystatechange = function () 
  {
    if ((xmlhttp.status == 200) || (xmlhttp.status == 304))
    {
      var file = xmlhttp.responseText; 
      var lines = file.split("\r\n");
      
      for (var i in lines)
      {
        var line = lines[i].split(".");
        console.log("lines: " + lines[i]);
        var objId;
        var objType;
        //Currently PeerWeb supports js, css, image, audio, video
        if (typeof(line[1]) != "undefined")
        {
          if (line[1] == "png" ||line[1] == "jpg" || line[1] == "gif")
              { //Image
                objId = "image";
                objType = "img"; 
              }
              else if (line[1] == "mp3" || line[1] == "ogg")
              { //Audio
                objId = "audio";
                objType = "audio";  
              }
              else if (line[1] == "mp4" || line[1] == "ogg")
              { //Video
                objId = "video";
                objType = "video";  
              }
              /*
              else if (line[1] == "swf")
              { //Flash
                objId = "flash";
                objType = "object";  
              }
              */
              else if (line[1] == "js")
              { //Javascript
                objId = "javascript";
                objType = "script";  
              }
              else if (line[1] == "css")
              { //CSS
                objId = "css";
                objType = "link";  
              }
              else
              {
                alert("Resouces are not supported.");
              }
              var obj = document.getElementById(objId);
              var objChild = document.createElement(objType);
              objChild.id = counter;
              obj.appendChild(objChild);
              loadResource(url, counter, objId, lines[i], id);
              console.log("loadResource: " + counter);
              //console.log(url + counter + objId + lines[i] + id);
              counter++;
            }
    //loadResource(url, "img1", "image", "464a1654fa85848684d56d48c6d5385b92f55e36791e9d55e09bf7f23281604e.png", id);
    //loadResource(url, "img2", "image", "264ca980f97a4f91feecdfbb12486ed9d66f57190a0c4a302602500c589847f5.png", id);
    //loadResource(url, "img1", "image", "86a3968ad2a59e91404f26d89e21a8bdcf775afc27ed74575dfaa2256a17e523.png", id);
    //loadResource(url, "img2", "image", "a7025f370a05cc5216a229bcca6885c11ddff3df3876f00b99a3b8fe6572714d.png", id);
  }

}
}
xmlhttp.send();

//Get pass from the peer server
var urlPass = url + "/requestPass?peerId=" + id;
var xmlPass = new XMLHttpRequest();
  xmlPass.open('get', urlPass, false);
  xmlPass.onreadystatechange = function () 
  {
    if ((xmlPass.status == 200) || (xmlPass.status == 304))
    {
        pass = xmlPass.responseText;
        console.log("Pass: " + pass);
    }
  }
  xmlPass.send();
}); 
var peerInter = new Peer(null, {host: host, port: 9999, path: '/'});
peer.on('connection', function(conn) 
{   
    //console.log("Receive other peers");

    conn.on('open', function() {
                // Receive messages
                

                // Send messages
                //conn.send('Hello!');
              }); 
    conn.on('data', function(data) {
                    //console.log("Received: ", data);
                    //console.log("intermediate pass: " + pass);
                    //var intermediateLayerData = atob(data);
                    var tmp = CryptoJS.AES.decrypt(data, pass);
                    var intermediateLayerData = tmp.toString(CryptoJS.enc.Utf8);
                    console.log("intermediateLayerData: " + intermediateLayerData);
                    if (intermediateLayerData.split(";")[1].substring(0, 6) != "peerId")
                    {
                      //It's the last peer.
                      var dataName = intermediateLayerData.split(";")[0].split("=")[1];
                      var key = intermediateLayerData.split(";")[1].split("=")[1];
                      var ts = intermediateLayerData.split(";")[2].split("=")[1];
                      var nounce = intermediateLayerData.split(";")[3].split("=")[1];
                      getDataFromDB(dataName, conn, key, ts);
                    }
                    else
                    {
                      //It's the intermediate peer.
                      var data = intermediateLayerData.split(";")[0];
                      var nextId = intermediateLayerData.split(";")[1].split("=")[1];
                      console.log("It's the intermediate peer, next peer id:" + nextId);
        //peer2 = new Peer({ key: "lwjd5qra8257b9", debug: 3});

        var connInter = peerInter.connect(nextId);
        //var start = new Date().getTime();

        //console.log('Received');
        connInter.on("open", function()
        {
          //console.log("Open " + name);
          //start = new Date().getTime();
          //var data = "name=" + name + "&tokenId=" + tokenId;
          connInter.send(data);

          
        });
        connInter.on('data', function(data) {
        //console.log(data);
        conn.send(data);

        });

        connInter.on("error", function(err)
        {
          console.log("error " + err);
        });
                    }

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
var peerReq = new Peer(null, {host: host, port: 9999, path: '/'});
//var previousPeerId = "0";
//var conn;

function loadResourceFromPeer (url, id, type, path, name, peerId)
{

//console.log("name " + name + " Peer " + peerId);

//If it's not a peer ID; no peers contain the requesting resources
//Routing mode
if (path.substring(0, 5) == "data=")
  //nextId=12222&tokenId=00099999
{
  //It's the first peer.
          //var firstLayerData = atob(path.split("=")[1]);
          //console.log("Received: " + path.split("=")[1]);
          //console.log("Pass: " + pass);
          var tmp = CryptoJS.AES.decrypt(path.split("=")[1], pass);
          var firstLayerData = tmp.toString(CryptoJS.enc.Utf8);
          console.log("firstLayerData: " + firstLayerData);
          var data = firstLayerData.split(";")[0];
          var nextId = firstLayerData.split(";")[1].split("=")[1];
          var key = firstLayerData.split(";")[2].split("=")[1];
          
        console.log("data: " + data + " ; nextId: " + nextId + " ; key: " + key);
        console.log("It's the first peer. Next peer id:" + nextId);
        //peer2 = new Peer({ key: "lwjd5qra8257b9", debug: 3});

        var connReq = peerReq.connect(nextId);
        var start = new Date().getTime();

        //console.log('Received');
        connReq.on("open", function()
        {
          //console.log("Open " + name);
          start = new Date().getTime();
          //var data = "name=" + name + "&tokenId=" + tokenId;
          connReq.send(data);

          
        });
        connReq.on('data', function(data) {
        //console.log(data);
        if (data !== "no data")
        {
            //console.log(data);
            var end = new Date().getTime();
            console.log("Interval: " + (end - start));
            //console.log("Received: " + data);
            var nextData = CryptoJS.AES.decrypt(data, key).toString(CryptoJS.enc.Utf8);
            //console.log("Decrypted data: " + nextData);
            appendResource(url, id, type, name, nextData, peerId, false, false);
            console.log("Successfully load resource from Peer: " + nextId);

          }

        });

        connReq.on("error", function(err)
        {
          console.log("error " + err);
        });
}

//Normal mode

//else if (path.substring(0, 3) != "ID=")
else
{
  var urlOri = path + name;
  //var urlOri = location.origin + path + name; 
  //var urlOri = "http://" + host + path + name; 
  var xmlhttp = new XMLHttpRequest();
  var start = new Date().getTime();
  xmlhttp.open('get', urlOri, false);
  xmlhttp.onreadystatechange = function () 
  {
        //console.log("status" + xmlhttp.status);
        if ((xmlhttp.status == 200) || (xmlhttp.status == 304))
        {
          var data = xmlhttp.responseText; 
          var end = new Date().getTime();
          console.log("Fetching resources from server interval: " + (end - start));
            //console.log("hihi" + data);

            //Append resource and store in indexedDB
            appendResource(url, id, type, name, data, peerId, true, false);
            console.log("Successfully load resource from server");

          }
        }
        //To-do: implement server-side handler. Done

        //To-do: for other types, e.g., video
        if (type == "image" || type == "audio" || type == "video")
        //if (type == "image")
        {
          xmlhttp.overrideMimeType('text/plain; charset=x-user-defined');
            //xmlhttp.responseType = 'arraybuffer';
          }
          xmlhttp.send();
        }/*
        //The other peers contain the requesting resources
        else
        {
          var otherPeerId = path.substring(3, path.length);

          console.log("Other id:" + otherPeerId);
        //peer2 = new Peer({ key: "lwjd5qra8257b9", debug: 3});

        var conn = peerReq.connect(otherPeerId);
        var start = new Date().getTime();

        //console.log('Received');
        conn.on("open", function()
        {
          //console.log("Open " + name);
          start = new Date().getTime();
          conn.send(name);

          
        });
        conn.on('data', function(data) {
        //console.log(data);
        if (data !== "no data")
        {
            //console.log(data);
            var end = new Date().getTime();
            console.log("Interval: " + (end - start));
            appendResource(url, id, type, name, data, peerId, false, false);
            console.log("Successfully load resource from Peer: " + otherPeerId);

          }

        });

        conn.on("error", function(err)
        {
          console.log("error " + err);
        });

      }*/
      
    }


/** Load resource from the server via XHR. 
* Name is a hash value.
* */

function loadResource (url, id, type, name, peerId)
{
// Check whether the requesting resources 

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
//console.log("name: "+ name);
var transaction = db.transaction(["resources"]);
var req = transaction.objectStore("resources").get(name);

//var request = db.transaction(["resources"], "readwrite")
//       .objectStore("resources")
//       .add(newData); 
transaction.oncomplete = function(event) {
  console.log("Successfully transaction.");
};

transaction.onerror = function(event) {
  // Don't forget to handle errors!
  console.log("Errors transaction.");

};
//console.log(req);
req.onsuccess = function(event) {
  //console.log(event.target.result.data);
  if (typeof(event.target.result) !== "undefined")
  {
    console.log("Successfully retrieving data from DB.");
    appendResource(url, id, type, name, event.target.result.data, peerId, false, true);

  }
  else
  {
      //console.log("Check resources.");
      checkResource(url, id, type, name, peerId);
    }
  };

  req.onerror = function(event) {
  // Don't forget to handle errors!
  console.log("Errors when retrieving new data.");

};   

};

request.onupgradeneeded = function(event) {
  var db = event.target.result;
//To-do: set up database first.
  if(!db.objectStoreNames.contains("resources"))
  {
    var objectStore = db.createObjectStore("resources", {keyPath: "id"});
    //checkResource(url, id, type, name, peerId);

  }

}
}

function checkResource(url, id, type, name, peerId) 
{
  var xmlhttp = new XMLHttpRequest();
//var protocol = this.options.secure ? 'https://' : 'http://';
//var url = protocol + this.options.host + ':' + this.options.port
//+ this.options.path + this.options.key;

//Get latitude and longituede from local storage.
var latitude = localStorage.getItem("latitude");
var longitude = localStorage.getItem("longitude");
//Normal mode
//var queryString = '/resource?name=' + name + "&peerId=" + peerId + "&latitude=" + latitude + "&longitude=" + longitude;

//Routing mode
var queryString = '/resourceRouting?name=' + name + "&peerId=" + peerId + "&latitude=" + latitude + "&longitude=" + longitude;
var urlRes = url + queryString;

xmlhttp.open('get', urlRes, false);
//console.log("hihi");
xmlhttp.onreadystatechange = function () {
/*
   if (xmlhttp.readyState !== 4) {
   return -1;
   }
   */
//console.log(xmlhttp.readState + " " + xmlhttp.status);
if ((xmlhttp.status == 200) || (xmlhttp.status == 304)) 
{
    //console.log("hi" + xmlhttp.responseText);
    loadResourceFromPeer(url, id, type, xmlhttp.responseText, name, peerId);
        //Update R in the current peer. 
      }
    }
    xmlhttp.overrideMimeType('text/plain; charset=x-user-defined');
    xmlhttp.send();
  }
// Append resource
function appendResource (url, id, type, name, data, peerId, encode, inDB)
{
//console.log(data + target);
var encodedData = data;
var target = document.getElementById(id);
console.log("Type: " + type + " id: " + id);

//Get latitude and longituede from local storage.
var latitude = localStorage.getItem("latitude");
var longitude = localStorage.getItem("longitude");
//Send request to update the mapping status.
var urlResMap = url + "/resourceMapToPeer?resource=" + name + "&peer=" + peerId + "&latitude=" + latitude + "&longitude=" + longitude;
getRequest(urlResMap);

if (type == "image")
{
  //console.log("Name: " + name);
  //console.log("Hash value: " + CryptoJS.SHA256(data));
  if (encode)
  {
    encodedData = dataToImage(data);
  }
    //console.log("Image data: " + name + " : " + data);
    //console.log("id " + id);
    var realHash = CryptoJS.SHA256(encodedData);
    if (realHash == name.split(".")[0])
    {
      //console.log("Name: " + name);
      //console.log("Encode Hash value: " + CryptoJS.SHA256(encodedData));
      console.log("Pass integrity check.");
      target.src = "data:image;base64," + encodedData;
      target.height = 300;
      //target.width = 300;
      //If not cached in DB
      if (!inDB)
      addDataToDB(url, name, encodedData, peerId);
      return true;
    }
  }
  /*
    else if (type == "flash")
    {
      if (encode)
  {
    encodedData = dataToImage(data);
  }
    console.log("Flash data: " + name + " : " + data);
    //console.log("id " + id);
    var realHash = CryptoJS.SHA256(encodedData);
    if (realHash == name.split(".")[0])
    {
      //console.log("Name: " + name);
      //console.log("Encode Hash value: " + CryptoJS.SHA256(encodedData));
      console.log("Matching.");
      target.data = "data:," + encodedData;
      target.height = 300;
      //target.width = 300;
      addDataToDB(url, name, encodedData, peerId);
      return true;
    }
  }
  */
  else if (type == "javascript")
    {
      //encode = false;
      if (encode)
  {
    encodedData = dataToImage(data);
  }
    //console.log("Audio data: " + name + " : " + data);
    //console.log("id " + id);
    var realHash = CryptoJS.SHA256(encodedData);
    //console.log("Hash: " + name + " VS: " + realHash);
    if (realHash == name.split(".")[0])
    {
      //console.log("Name: " + name);
      //console.log("Encode Hash value: " + CryptoJS.SHA256(encodedData));
      console.log("Matching.");
      //target.src = "data:audio;base64," + encodedData;
      target.controls = true;
      target.src = "data:text/" + type + ";base64," + encodedData;
      //target.height = 300;
      //target.width = 300;
      if (!inDB)
      addDataToDB(url, name, encodedData, peerId);
      return true;
    }
  }
  else if (type == "css")
    {
      //encode = false;
      if (encode)
  {
    encodedData = dataToImage(data);
  }
    //console.log("Audio data: " + name + " : " + data);
    //console.log("id " + id);
    var realHash = CryptoJS.SHA256(encodedData);
    //console.log("Hash: " + name + " VS: " + realHash);
    if (realHash == name.split(".")[0])
    {
      //console.log("Name: " + name);
      //console.log("Encode Hash value: " + CryptoJS.SHA256(encodedData));
      console.log("Matching.");
      //target.src = "data:audio;base64," + encodedData;
      target.controls = true;
      target.href = "data:text/" + type + ";base64," + encodedData;
      //target.height = 300;
      //target.width = 300;
      if (!inDB)
      addDataToDB(url, name, encodedData, peerId);
      return true;
    }
  }
  else if (type == "audio")
    {
      //encode = false;
      if (encode)
  {
    encodedData = dataToImage(data);
  }
    //console.log("Audio data: " + name + " : " + data);
    //console.log("id " + id);
    var realHash = CryptoJS.SHA256(encodedData);
    //console.log("Hash: " + name + " VS: " + realHash);
    if (realHash == name.split(".")[0])
    {
      //console.log("Name: " + name);
      //console.log("Encode Hash value: " + CryptoJS.SHA256(encodedData));
      console.log("Matching.");
      //target.src = "data:audio;base64," + encodedData;
      target.controls = true;
      target.src = "data:audio/" + name.split(".")[1] + ";base64," + encodedData;
      //target.height = 300;
      //target.width = 300;
      if (!inDB)
      addDataToDB(url, name, encodedData, peerId);
      return true;
    }
  }
    else if (type == "video")
    {
      //encode = false;
      if (encode)
  {
    encodedData = dataToImage(data);
  }
    //console.log("Audio data: " + name + " : " + data);
    //console.log("id " + id);
    var realHash = CryptoJS.SHA256(encodedData);
    //console.log("Hash: " + name + " VS: " + realHash);
    if (realHash == name.split(".")[0])
    {
      //console.log("Name: " + name);
      //console.log("Encode Hash value: " + CryptoJS.SHA256(encodedData));
      console.log("Matching.");
      //target.src = "data:audio;base64," + encodedData;
      target.controls = true;
      target.src = "data:video/" + name.split(".")[1] + ";base64," + encodedData;
      //target.height = 300;
      //target.width = 300;
      if (!inDB)
      addDataToDB(url, name, encodedData, peerId);
      return true;
    }
  }
  return false;
}

function dataToImage(data)
{

  var img = "";
  for (var i = 0, text = data, l = text.length; i < l; i++) {
    img += String.fromCharCode(text.charCodeAt(i) & 0xff);
  }
//var img = customBase64Encode(data);
//console.log(img);
//target.src = "data:image/png;base64," + window.btoa(img); 
//console.log(window.btoa(img));
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
//console.log("success: "+ db);
var transaction = db.transaction(["resources"], "readwrite");
transaction.objectStore("resources").add(newData);



//var request = db.transaction(["resources"], "readwrite")
//       .objectStore("resources")
//       .add(newData);
transaction.oncomplete = function(event) {
  console.log("Successfully add new data.");
};

transaction.onerror = function(event) {
  // Don't forget to handle errors!
  console.log("Errors when adding new data.");
  //console.log("Data are already in.");


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
function getDataFromDB(name, conn, key, ts)
{
var tsNow = Math.floor(new Date() / 1000);
if ((tsNow - ts) > 600)
{
  conn.send("Time out.");
  return;
}
 
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
//console.log("name: "+ name);
var transaction = db.transaction(["resources"]);
var req = transaction.objectStore("resources").get(name);

//var request = db.transaction(["resources"], "readwrite")
//       .objectStore("resources")
//       .add(newData); 
req.onsuccess = function(event) {
  console.log("Successfully retrieving data.");
  //console.log(event.target.result.data);
  var tmp = event.target.result.data;
  var outData = CryptoJS.AES.encrypt(tmp, key).toString();
  conn.send(outData);
};

req.onerror = function(event) {
  // Don't forget to handle errors!
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
/*
   if (xmlhttp.readyState !== 4) {
   return -1;
   }
   */
   if ((xmlhttp.status == 200) || (xmlhttp.status == 304)) 
   {
    return true;
  }
  return false;
}
//xmlhttp.setRequestHeader("Content-type","application/x-www-form-urlencoded");
xmlhttp.send(data);
}

function getRequest(url)
{
  var xmlhttp = new XMLHttpRequest();
  xmlhttp.open("get", url, false);
  xmlhttp.onreadystatechange = function () {
/*
   if (xmlhttp.readyState !== 4) {
   return -1;
   }
   */
   if ((xmlhttp.status == 200) || (xmlhttp.status == 304)) 
   {
    return true;
  }
  return false;
}
xmlhttp.send();
}
