// main Require
const express = require('express');
const app = express();
const http = require('http').Server(app);

const socketIO = require('./SocketIO')(http);

const cors = require('cors');
const bodyParser = require('body-parser');
const config = require('./secretConfig.json');

const DB = require('./DB');

DB.init();

// CORS 설정 Cross Origin 문제 해결 XHR
app.use(cors({
	origin: '*',
	optionsSuccessStatus: 200,
}));
 
// Body-parser
app.use(bodyParser.urlencoded({ extended: true, limit: '5mb' }));
app.use(bodyParser.json({limit: '5mb'}));

app.use(function(req, res, next) {
	console.log('[' + req.method + '] ' + req.url);
	next();
});

app.use('/auth', require('./Router/Auth'));
app.use('/test', require('./Router/Test'));
app.use('/course', require('./Router/Course'));
app.use('/task', require('./Router/Task'));
app.use('/user', require('./Router/User'));

http.listen(3000, function(){
	console.log('rest api server on 3000'); 
});

