// main Require
const express = require('express');
const app = express();
const http = require('http').Server(app);

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

app.use('/auth', require('./Rotuer/Auth'));
app.use('/course', require('./Rotuer/Course'));
app.use('/task', require('./Rotuer/Task'));

http.listen(3000, function(){
	console.log('rest api server on 3000'); 
});

