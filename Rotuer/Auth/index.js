const router = require('express').Router();
const pool = require('../../DB');
const crypto = require('crypto');

// GET
// GET  req.query
// POST req.body

// 학생 게정 생성 코드
router.post('/register', async function(req, res) {
	
});

router.post('/login', async function(req, res) {
	const {id, pw} = req.body;

	// 비밀번호 sha256 방식으로 해시화
	var _pw_sha256_hash = crypto.createHash('sha256').update(pw).digest('hex');

	let con;
	try {
		con = await pool.getConnection();

		const query = "SELECT * FROM user WHERE id = ? and pw = ?";
		
		let result = await pool.query(con, query, [id, _pw_sha256_hash]);
		if(result.length === 1) {
			res.send({msg: '로그인 성공'});
		} else {
			res.send({msg: '로그인 실패'});
		}

	} catch (error) {
		console.log('에러났을때 처리하는 부분', error);
		res.send({msg: '알수없는 에러 실패'});
	} finally {
		con.release();
	}
});

module.exports = router;
