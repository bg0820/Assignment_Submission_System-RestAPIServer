const config = require('../secretConfig.json');
const dbconn = require('mariadb');

let pool;

module.exports = {
	init: function() {
		pool = dbconn.createPool({
			host: config.db_host,
			user: config.db_id,
			password: config.db_pw,
			database: config.db_scheme,
			connectionLimit: config.db_connectionLimit,
			timezone: config.timezone
	  	});

		console.log('DataBase Connection Module Initialize...');
	},

	getConnection: async function() {
		return await pool.getConnection();
	},

	query: async function(con, query, param) {
		return await con.query(query, param);
	},

	end: function(callback) {
		pool.end(callback);
	}
};
