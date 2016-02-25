var express = require('express');
var app = express();
var http = require('http').Server(app);
app.use(express.static('content'));
var bodyParser = require('body-parser');
var fs = require('fs');
app.use(bodyParser.urlencoded({
  extended: true
}));

app.get('/', function(req, res) {
  res.sendFile(__dirname + '/content/dayview.html');
});

app.get('/extract', function(req, res) {
  var jsonData = fs.readFileSync(__dirname + '/content/data/extract.json');
  jsonData = JSON.parse(jsonData);
  res.send(jsonData);
});

app.get('/appCategories', function(req, res) {
  var jsonData = fs.readFileSync(__dirname + '/content/data/appCategories.json');
  jsonData = JSON.parse(jsonData);
  res.send(jsonData);
});

app.post('/appCategories', function(req, res) {
  var jsonData = fs.readFileSync(__dirname + '/content/data/appCategories.json');
  jsonData = JSON.parse(jsonData);
  jsonData["Applications"][req.body.app] = req.body.cat;
  if(jsonData["Categories"].indexOf(req.body.cat) == -1) {
    jsonData["Categories"].push(req.body.cat)
  }
  fs.writeFileSync(__dirname + '/content/data/appCategories.json', JSON.stringify(jsonData));
  res.send(jsonData);
});

http.listen(process.env.PORT || 8888, function(){
  console.log('socket listening on *:8888');
});
