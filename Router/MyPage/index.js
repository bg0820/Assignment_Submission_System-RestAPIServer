const router = require('express').Router();
const pool = require('../../DB');
const crypto = require('crypto');
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

//-마이페이지에서 사용자가 변경할 정보(pw,email) 입력해서 넘겨주면 서버에서 처리
router.post('/change', async function (req, res) {
    const { pw, email } = req.body; // 변경할 비밀번호 / 이메일
    let decode = req.decode; // 현재 로그인한 사용자의 '현재' 정보 
    let con;
    var _pw_sha256_hash = crypto.createHash('sha256').update(pw).digest('hex');

    try {
        con = await pool.getConnection();

        const query = "UPDATE user SET pw=?, email=?"
            + "WHERE userIdx=?";

        let userResult = await pool.query(con, query, [_pw_sha256_hash, email, decode.userIdx]);

        res.status(200).send({ msg: '정보 변경 성공' });
    } catch (error) {
        console.log('에러났을때 처리하는 부분', error);
        // if(error.errno === 1062) {
        // 	res.send({msg: '이미 개설된 강의 입니다.'});
        // } else
        res.status(404).send({ msg: '알수없는 에러 실패' });
    } finally {
        con.release();
    }
});

module.exports = router;