module.exports = function(http) {
	const io = require('socket.io')(http, {
		transports: ['polling', 'websocket']
	});


	io.on('connection', (socket) => {
		var socketId = socket.id;
		var clientIp = socket.request.connection.remoteAddress;
		console.log("[" + socketId + "] Conn " + clientIp);

		socket.on('message', async (msg) => {
			
		});

		socket.on("close", function(message) {
			
		});

		socket.on("disconnect", function() {
			
		});

		socket.on("error", function(error) {
			
		});
	});

	return io;
}


