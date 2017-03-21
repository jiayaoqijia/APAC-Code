var fs = require("fs");
var crypto = require('crypto');
var sys = require('sys')
var exec = require('child_process').exec;
var sourceDir = "../resourceOrig/";
var destDir = "../resources/";
var path = "/pw/resources/";
var label = "public";
var destFile = "./policy.txt";
var fetchFile = "./fetch.txt";
var files;

function puts(error, stdout, stderr) { sys.puts(stdout) }

files = fs.readdirSync(sourceDir);

var content = "";
var fetch = "";
var cmd = "";
for (var file in files)
{
    var filename = files[file];
    var data = fs.readFileSync(sourceDir + filename);
    console.log(filename);
    //var dataText = dataToImage(data);
    var base64Image = data.toString('base64');
    //var decodedImage = new Buffer(base64Image, 'base64');
    var hash = crypto.createHash('sha256').update(base64Image).digest('hex');
    var fileS = filename.split(".");
    //var content = content + filename + "\r\n" + hash + "." + fileS[fileS.length - 1] + "\r\n\r\n";
    content = content + hash + "." + fileS[fileS.length - 1] + "," + path + "," + label + "\r\n";
    fetch = fetch + hash + "." + fileS[fileS.length - 1] + "\r\n";
    cmd = cmd + "cp '" + sourceDir + filename + "' " + destDir + hash + "." + fileS[fileS.length - 1] + ";";
    //console.log(cmd);
}
fs.writeFileSync(destFile, content);
fs.writeFileSync(fetchFile, fetch);
exec(cmd, puts);
