var express = require('express');
var fs = require('fs');
 
var app = express();

// New call to compress content
app.use(express.compress());
console.log('__dirname: ' + __dirname);
app.use(express.static(__dirname + '/../client'));
 
app.post('/upload', function(req, res) {
    
    //console.log(req);
    
    res.send({
		success: "ok"
    });
    
});

 
app.listen(3000);
console.log('Listening on port 3000...');