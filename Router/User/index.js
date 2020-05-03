const router = require('express').Router();
const pool = require('../../DB');
const jwt      = require('jsonwebtoken');
const jConfig = require('../../secretConfig.json');

// 미들웨어 헤더 검사
router.use(function(req, res, next){
    let token = req.headers['authorization'];

    if(!token) {
		res.status(400).send({result: 'failed', msg: '토큰을 입력해주세요.'});
        return;
    }

    if(token.startsWith('Bearer ')) 
		token = token.slice(7, token.length);
	

	jwt.verify(token, jConfig.jtokenSecretKey, function(err, decoded) {
		if(err) 
			res.status(400).send({result: 'failed', msg: '유효하지 않은 토큰 입니다.'});
		else {
			req.decode = decoded;
			console.log(req.decode);
			next();
		}
	});
});

// GET
// GET  req.query
// POST req.body

// TODO : 
/*

*/

router.get('/list', async function (req, res) {
	if(req.decode.userType !== 1) {// 교수가 아닌경우
		res.status(404).send({msg: '교수가 아닙니다.'});
		return;
	}

    let con;
    try {
        con = await pool.getConnection();

		const query = "SELECT userIdx, id, name FROM user";
		
        let userResult = await pool.query(con, query, []);

        res.send({ msg: '조회 성공', list: userResult });
    } catch (error) {
        console.log('에러났을때 처리하는 부분', error);
        res.send({ msg: '알수없는 에러 실패' });
    } finally {
        con.release();
    }
});

module.exports = router;