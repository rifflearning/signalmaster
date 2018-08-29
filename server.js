/*global console*/
var yetify = require('yetify'),
    config = require('config'),
    fs = require('fs'),
    sockets = require('./sockets'),
    port = parseInt(process.env.PORT || config.get('server.port'), 10),
    server_handler = function (req, res) {
        if (req.url === '/healthcheck') {
            console.log(Date.now(), 'healthcheck');
            res.writeHead(200);
            res.end();
            return;
        }
        res.writeHead(404);
        res.end();
    },
    server = null;

console.log('config: ', config);
// Create an http(s) server instance to that socket.io can listen to
if (config.get('server.secure')) {
    server = require('https').Server({
        key: fs.readFileSync(config.get('server.key')),
        cert: fs.readFileSync(config.get('server.cert')),
        passphrase: config.get('server.password')
    }, server_handler);
} else {
    server = require('http').Server(server_handler);
}
server.listen(port);

sockets(server, config);

if (config.has('uid')) process.setuid(config.get('uid'));

var httpUrl;
if (config.get('server.secure')) {
    httpUrl = "https://localhost:" + port;
} else {
    httpUrl = "http://localhost:" + port;
}
console.log(yetify.logo() + ' -- signal master is running at: ' + httpUrl);
