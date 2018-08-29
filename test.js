var tape = require('tape');
var config = require('config');
var server = require('./server');

var test = tape.createHarness();

var output = test.createStream();
output.pipe(process.stdout);
output.on('end', function () {
    console.log('Tests complete, killing server.');
    process.exit(0);
});

var io = require('socket.io-client');

var socketURL;
if (config.get('server.secure')) {
    socketURL = "https://localhost:" + config.get('server.port');
} else {
    socketURL = "http://localhost:" + config.get('server.port');
}

var socketOptions = {
    transports: ['websocket'],
    'force new connection': true,
    "secure": config.get('server.secure')
};

test('it should not crash when sent an empty message', function (t) {
    t.plan(1);
    var client = io.connect(socketURL, socketOptions);

    client.on('connect', function () {
        client.emit('message');
        t.ok(true);
    });
});
