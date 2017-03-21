var host = "localhost";
window.onload = function() {
//console.log('My peer ID is: ' + id);
//window.onload = function (id){
//var loadTime = window.performance.timing.domContentLoadedEventEnd-window.performance.timing.navigationStart; 
//console.log('Page load time is '+ loadTime);
var id = "normal";
  var p1 = document.createElement("p");
  p1.innerHTML = "Your ID is " + id; 
  document.getElementById("pid").appendChild(p1);

  var url = "http://" + host + "/pw/resources/";
  var fetchUrl = "image/fetch.txt";
  var xmlhttp = new XMLHttpRequest();
  xmlhttp.open('get', fetchUrl, false);
  xmlhttp.onreadystatechange = function () 
  {
    if ((xmlhttp.status == 200) || (xmlhttp.status == 304))
    {
      var file = xmlhttp.responseText; 
      var lines = file.split("\r\n");
      var counter = 0;
      for (var i in lines)
      {
        var line = lines[i].split(".")
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
              //console.log(url + counter + objId + lines[i] + id);
              counter++;
            }
  }

}
}
xmlhttp.send();
} 

function loadResource (url, id, type, name, peerId)
{
// Check whether the requesting resources 

      checkResource(url, id, type, name, peerId);

};

function checkResource(url, id, type, name, peerId)
{
    
  var xmlhttp = new XMLHttpRequest();
  xmlhttp.open('get', url + name, false);
  xmlhttp.onreadystatechange = function () 
  {
        //console.log("status" + xmlhttp.status);
        if ((xmlhttp.status == 200) || (xmlhttp.status == 304))
        {
          var data = xmlhttp.responseText; 
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
}
// Append resource
function appendResource (url, id, type, name, data, peerId, encode, inDB)
{
//console.log(data + target);
var encodedData = data;
var target = document.getElementById(id);
console.log("Type: " + type + " id: " + id);
if (type == "image")
{
  //console.log("Name: " + name);
  //console.log("Hash value: " + CryptoJS.SHA256(data));
  if (encode)
  {
    encodedData = dataToImage(data);
  }
      target.src = "data:image;base64," + encodedData;
      target.height = 300;
      return true;
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
      if (encode)
  {
    encodedData = dataToImage(data);
  }
      target.controls = true;
      target.src = "data:text/" + type + ";base64," + encodedData;
      //target.width = 300;
      return true;
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
      target.controls = true;
      target.href = "data:text/" + type + ";base64," + encodedData;
      return true;
  }
  else if (type == "audio")
    {
      //encode = false;
      if (encode)
  {
    encodedData = dataToImage(data);
  }
      target.controls = true;
      target.src = "data:audio/" + name.split(".")[1] + ";base64," + encodedData;
      return true;
  }
    else if (type == "video")
    {
      //encode = false;
      if (encode)
  {
    encodedData = dataToImage(data);
  }
      target.controls = true;
      target.src = "data:video/" + name.split(".")[1] + ";base64," + encodedData;
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
//var img = customBase64Encode(data);
//console.log(img);
//target.src = "data:image/png;base64," + window.btoa(img); 
//console.log(window.btoa(img));
return window.btoa(img);
}


