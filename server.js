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

/*
 * The following code for handling shutdown signals in a node app was modeled after code found on
 * https://medium.com/@becintec/building-graceful-node-applications-in-docker-4d2cd4d5d392
 * which it says came from https://medium.com/@gchudnov/trapping-signals-in-docker-containers-7a57fdda7d86
 */

// The signals we want to handle
// NOTE: although it is tempting, the SIGKILL signal (9) cannot be intercepted and handled
let signals = {
    'SIGHUP': 1,
    'SIGINT': 2,
    'SIGTERM': 15
};

// Do any necessary shutdown logic for our application here
function shutdown(signal, value) {
    console.log("shutdown!");
    server.close(() => {
        console.log(`${new Date().toUTCString()}: server stopped by ${signal} with value ${value}`);
        process.exit(128 + value);
    });
};

// Create a listener for each of the signals that we want to handle
Object.keys(signals).forEach((signal) => {
    process.on(signal, () => {
        console.log(`process received a ${signal} signal`);
        shutdown(signal, signals[signal]);
    });
});

console.log(`${new Date().toUTCString()}: ${yetify.logo()} -- signal master is running at: ${httpUrl}`);
