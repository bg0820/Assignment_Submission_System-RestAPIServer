const router = require('express').Router();
const pool = require('../../DB');
const crypto = require('crypto');
const Util = require('../../Util');

// GET
// GET  req.query
// POST req.body

// 학생 게정 생성 코드
router.post('/register', async function (req, res) {
	const { id, pw, name, email } = req.body;

	// 비밀번호 sha256 방식으로 해시화
	var _pw_sha256_hash = crypto.createHash('sha256').update(pw).digest('hex');

	let con;
	try {
		con = await pool.getConnection();

		const query = "INSERT INTO user (id, pw, name, email, userType) values (?, ?, ?, ?, 0)";

		await pool.query(con, query, [id, _pw_sha256_hash, name, email]);

		res.send({ msg: '회원가입 성공' });

	} catch (error) {
		console.log('에러났을때 처리하는 부분', error);
		if (error.errno === 1062) {
			res.send({ msg: '이미 가입되어있는 아이디 입니다.' });
		} else
			res.send({ msg: '알수없는 에러 실패' });
	} finally {
		con.release();
	}
});

router.post('/login', async function (req, res) {
	const { id, pw } = req.body;

	// 비밀번호 sha256 방식으로 해시화
	var _pw_sha256_hash = crypto.createHash('sha256').update(pw).digest('hex');

	let con;
	try {
		con = await pool.getConnection();

		const query = "SELECT * FROM user WHERE id = ? and pw = ?";

		let result = await pool.query(con, query, [id, _pw_sha256_hash]);
		if (result.length === 1) {
			let token = Util.TokenGen({
				userIdx: result[0].userIdx,
				id: result[0].id,
				name: result[0].name,
				email: result[0].email,
				userType: result[0].userType
			});
			res.send({ msg: '로그인 성공', token: token });
		} else {
			res.send({ msg: '로그인 실패' });
		}

	} catch (error) {
		console.log('에러났을때 처리하는 부분', error);
		res.send({ msg: '알수없는 에러 실패' });
	} finally {
		con.release();
	}

});

router.post('/find/pw', async function (req, res) {
	const { id, email } = req.body;

	let con;
	try {
		con = await pool.getConnection();

		const findQuery = 'SELECT count(id) as count FROM user WHERE id = ? and email = ?';
		let result = await pool.query(con, findQuery, [id, email]);

		// 없음
		if (result[0].count === 0) {
			res.status(200).send({
				msg: '없는 사용자 입니다.'
			});
		} else {
			let alphabet = [];

			for (var i = 0; i <= 9; i++)
				alphabet.push(i.toString());

			for (var i = 65; i <= 90; i++)
				alphabet.push(String.fromCharCode(i));

			for (var i = 97; i <= 122; i++)
				alphabet.push(String.fromCharCode(i));

			let randomPw = '';
			for (var i = 0; i < 10; i++) {
				randomPw += alphabet[Math.floor(Math.random() * alphabet.length)]; // 0 ~ alphabet.length - 1
			}

			const updatePw = 'UPDATE user SET pw = ? WHERE id = ? and email = ?';

			// 비밀번호 sha256 방식으로 해시화
			var _pw_sha256_hash = crypto.createHash('sha256').update(randomPw).digest('hex');

			pool.query(con, updatePw, [_pw_sha256_hash, id, email]);

			let opts = {
				senderAddress: 'help@submission.co.kr',
				senderName: '관리자',
				title: '비밀번호 찾기 결과',
				body: '변경된 비밀번호는 "' + randomPw + '" 입니다.',
				receiverList: [{
					receiveMailAddr: email,
					receiveType: 'MRT0'
				}]
			}
			let resp = await axios({
				method: 'POST',
				url: 'https://api-mail.cloud.toast.com/email/v1.6/appKeys/JwAbGFzEzANYAUhd/sender/mail',
				data: opts
			});

			console.log(resp.data.body.data);
			if (resp.data.body.data.results[0].resultCode == 0) {
				res.send({
					msg: '메일 전송 성공'
				});
			} else {
				res.send({
					msg: '메일 전송 실패'
				});
			}
		}
	} catch (error) {
		console.log('에러났을때 처리하는 부분', error);
		res.send({ msg: '알수없는 에러 실패' });
	} finally {
		con.release();
	}
});

router.get('/info', async function (req, res) {
	let decode = req.decode;

	res.send({
		msg: '조회 성공', info: {
			id: decode.id,
			name: decode.name,
			userType: decode.userType,
			email: decode.email
		}
	})
});
module.exports = router;
