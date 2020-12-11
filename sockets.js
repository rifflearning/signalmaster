const socketIO = require('socket.io');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const twilio = require('twilio');


module.exports = function (server, config) {
    var io = socketIO.listen(server);

    let connectionsMade = 0;

    io.sockets.on('connection', function (client) {
        connectionsMade++;

        client.resources = {
            screen: false,
            video: true,
            audio: false
        };

        // pass a message to another id
        client.on('message', function (details) {
            if (!details) return;

            var otherClient = io.to(details.to);
            if (!otherClient) return;

            details.from = client.id;
            otherClient.emit('message', details);
        });

        client.on('shareScreen', function () {
            client.resources.screen = true;
        });

        client.on('unshareScreen', function (type) {
            client.resources.screen = false;
            removeFeed('screen');
        });

        client.on('join', join);

        function removeFeed(type) {
            if (client.room) {
                io.sockets.in(client.room).emit('remove', {
                    id: client.id,
                    type: type
                });
                if (!type) {
                    client.leave(client.room);
                    client.room = undefined;
                }
            }
        }

        function join(name, cb) {
            // sanity check
            if (typeof name !== 'string') return;
            // check if maximum number of clients reached
            maxClients = config.has('rooms.maxClients') ? config.get('rooms.maxClients') : 0;
            if (maxClients > 0 && clientsInRoom(name) >= maxClients) {
                safeCb(cb)('full');
                return;
            }
            // leave any existing rooms
            removeFeed();
            safeCb(cb)(null, describeRoom(name));
            client.join(name);
            client.room = name;
        }

        // we don't want to pass "leave" directly because the
        // event type string of "socket end" gets passed too.
        client.on('disconnect', function () {
            removeFeed();
        });
        client.on('leave', function () {
            removeFeed();
        });

        client.on('create', function (name, cb) {
            if (arguments.length == 2) {
                cb = (typeof cb == 'function') ? cb : function () {};
                name = name || uuidv4();
            } else {
                cb = name;
                name = uuidv4();
            }
            // check if exists
            var room = io.nsps['/'].adapter.rooms[name];
            if (room && room.length) {
                safeCb(cb)('taken');
            } else {
                join(name);
                safeCb(cb)(null, name);
            }
        });

        // support for logging full webrtc traces to stdout
        // useful for large-scale error monitoring
        client.on('trace', function (data) {
            console.log('trace', JSON.stringify(
            [data.type, data.session, data.prefix, data.peer, data.time, data.value]
            ));
        });


        // tell client about stun and turn servers and generate nonces
        if (config.get('server.stunTurnServers') === 'twilio') {
            setupTwilioStunTurnServers();
        } else {
            setupBasicStunTurnServers();
        }

        function setupTwilioStunTurnServers() {
            if (connectionsMade % 10 === 1) {
                console.log(`Using twilio stun/turn server config values (connection: ${connectionsMade})`);
            }

            // emit ICE config using twilio API keys
            let twilioClient = twilio(config.get('twilio.id'), config.get('twilio.token'));
            twilioClient.tokens.create({}, (err, res) => {
                //console.log('emitting stun & turn:', res);
                client.emit('stunservers', res.iceServers);
                client.emit('turnservers', res.iceServers);
            });
        }

        function setupBasicStunTurnServers() {
            if (connectionsMade % 10 === 1) {
                console.log(`Using basic stun/turn server config values (connection: ${connectionsMade})`);
            }

            // tell client about stun and turn servers and generate nonces
            client.emit('stunservers', config.get('stunservers') || []);

            // create shared secret nonces for TURN authentication
            // the process is described in draft-uberti-behave-turn-rest
            let credentials = [];
            // allow selectively vending turn credentials based on origin.
            let origin = client.handshake.headers.origin;
            let turnorigins = config.has('turnorigins') ? config.get('turnorigins') : null;
            if (!turnorigins || turnorigins.indexOf(origin) !== -1) {
                config.get('turnservers').forEach(function (server) {
                    let hmac = crypto.createHmac('sha1', server.secret);
                    // default to 86400 seconds timeout unless specified
                    let username = Math.floor(new Date().getTime() / 1000) + (parseInt(server.expiry || 86400, 10)) + "";
                    hmac.update(username);
                    credentials.push({
                        username: username,
                        credential: hmac.digest('base64'),
                        urls: server.urls || server.url
                    });
                });
            }
            client.emit('turnservers', credentials);
        }
    });


    function describeRoom(name) {
        var adapter = io.nsps['/'].adapter;
        var room = adapter.rooms[name] || {sockets: {}, length: 0};
        var result = {
            clients: {}
        };
        Object.keys(room.sockets).forEach(function (id) {
            result.clients[id] = adapter.nsp.connected[id].resources;
        });
        return result;
    }

    function clientsInRoom(name) {
        return io.sockets.clients(name).length;
    }

};

function safeCb(cb) {
    if (typeof cb === 'function') {
        return cb;
    } else {
        return function () {};
    }
}
