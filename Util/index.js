const jwt      = require('jsonwebtoken');
const jConfig = require('../secretConfig.json');

exports.TokenGen = function(data) {
	var payload = {
		userIdx: data.userIdx,
		id: data.id,
		name: data.name,
		email: data.email,
		userType: data.userType
	};

	var secretKey = jConfig.jtokenSecretKey;
	var options = {
		algorithm : 'HS256',
		issuer: data.id,
		subject: 'accountInfo'
	};

	return	jwt.sign(payload, secretKey, options);
}