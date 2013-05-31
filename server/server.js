var express = require('express');
var fs = require('fs');
 
var app = express();

// New call to compress content
app.use(express.compress());
app.use(express.bodyParser());
console.log('__dirname: ' + __dirname);
app.use(express.static(__dirname + '/../client'));
 
app.post('/upload', function(req, res) {
    
    var fileName = __dirname + '/uploads/' + req.body.fileName;
    var data = req.body.data.substr(req.body.data.indexOf("base64,") + 7);
    
    fs.appendFile(fileName, new Buffer(data, "base64"), function(err) {
        if (err) {
            res.send({
                error: err.message
            });
        } else {
            res.send({
                success: "ok"
            });
        }
    });
    
    
    
});

 
app.listen(3000);
console.log('Listening on port 3000...');