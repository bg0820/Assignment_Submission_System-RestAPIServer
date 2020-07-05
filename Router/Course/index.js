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
			next();
		}
	});
});


// GET
// GET  req.query
// POST req.body

// TODO : 
/*
 강의 개설 [ 교수 ]
 강의 목록 [ 교수 ]
 강의 목록 [ 학생 ]

*/

router.get('/chat', async function(req, res) {
	const {courseIdx, type} = req.query;

	let con;
	try {
		con = await pool.getConnection();

		const query = "select u.userIdx, u.name as userName, sendTime as time, content as chat, cl.courseIdx from chatLog cl left join user u on cl.userIdx = u.userIdx where courseIdx = ? and chatType = ?";

		let chatLog = await pool.query(con, query, [courseIdx, type]);
		
		let chats = [];
		// 학생 초대
		for(var i = 0 ; i < chatLog.length; i++)  {
			if(type === '0') {
				chatLog[i].type  = 'notice';
			} else {
				chatLog[i].type = 'qna';
			}

		}

		res.status(200).send({msg: '조회 성공', chats: chatLog});
	} catch (error) {
		console.log('에러났을때 처리하는 부분', error);
		// if(error.errno === 1062) {
		// 	res.send({msg: '이미 개설된 강의 입니다.'});
		// } else
		res.status(404).send({msg: '알수없는 에러 실패'});
	} finally {
		con.release();
	}

})
router.post('/create', async function(req, res) {
	const {courseName, language, userIdxList} = req.body;
	let decode = req.decode;

	if(decode.userType !== 1) {
		res.status(404).send({msg: '교수 계정이 아닙니다.'});
		return;
	}

	let con;
	try {
		con = await pool.getConnection();

		const query = "INSERT INTO course (userIdx, courseName, language) values (?, ?, ?)";
		const inviteQuery = "INSERT INTO invited_course (courseIdx, userIdx) values (?, ?)";

		let courseResult = await pool.query(con, query, [decode.userIdx, courseName, language]);
		
		// 학생 초대
		for(var i = 0 ; i < userIdxList.length; i++) 
			await pool.query(con, inviteQuery, [courseResult.insertId, userIdxList[i]]);

		res.status(200).send({msg: '강의개설 성공'});
	} catch (error) {
		console.log('에러났을때 처리하는 부분', error);
		// if(error.errno === 1062) {
		// 	res.send({msg: '이미 개설된 강의 입니다.'});
		// } else
		res.status(404).send({msg: '알수없는 에러 실패'});
	} finally {
		con.release();
	}
});

router.get('/list', async function(req, res) {
    //const {userIdx} = req.body;
    //console.log("요청들어온 userIdx : ",userIdx);
	const decode = req.decode;

	let con;
	try {
		con = await pool.getConnection();

		let query = ''; 
		if(decode.userType === 0) {
			query =   	"SELECT ic.inviteCourseIdx, ic.courseIdx, c.courseName, c.language, proU.name as professorName, proU.email " +
						" FROM invited_course ic LEFT JOIN course c on ic.courseIdx = c.courseIdx LEFT JOIN user proU on c.userIdx = proU.userIdx " +
						" WHERE ic.userIdx = ?";
		} else {
			query = "select c.courseIdx, courseName, language, ic.count  from " + 
					"course c left  join (Select courseIdx, count(courseIdx) as count from invited_course group by courseIdx) " +
					" ic on c.courseIdx = ic.courseIdx where c.userIdx = ?";
		}

		const list = await pool.query(con, query, [decode.userIdx]);

		if(decode.userType === 1) {
			for(var i = 0 ; i < list.length; i++)
				list[i].count = list[i].count == null ? 0 : list[i].count;	
		} 
            
		res.status(200).send({
            msg: '조회 성공',
            list: list
        });

	} catch (error) {
		console.log('에러났을때 처리하는 부분', error);
		// if(error.errno === 1062) {
		// 	res.send({msg: '이미 개설된 강의 입니다.'});
		// } else
			res.status(404).send({msg: '알수없는 에러 실패'});
	} finally {
		con.release();
	}
});

router.get('/info', async function(req, res) {
	const {courseIdx} = req.query;

	const decode = req.decode;

	let con;
	try {
		con = await pool.getConnection();

		let query = ''; 
		if(decode.userType === 0) {
			query = "SELECT ic.inviteCourseIdx, ic.courseIdx, c.courseName, c.language, proU.name as professorName, proU.email " +
					" FROM invited_course ic LEFT JOIN course c on ic.courseIdx = c.courseIdx LEFT JOIN user proU on c.userIdx = proU.userIdx " +
					" WHERE ic.courseIdx = ?";
		} else {
			query = "select c.courseIdx, courseName, language, ic.count  from " + 
					"course c left  join (Select courseIdx, count(courseIdx) as count from invited_course group by courseIdx) " +
					" ic on c.courseIdx = ic.courseIdx where c.courseIdx = ?";
		}
		
		const list = await pool.query(con, query, [courseIdx]);
		
		if(decode.userType === 1) {
			for(var i = 0 ; i < list.length; i++)
				list[i].count = list[i].count == null ? 0 : list[i].count;	
		}

		res.status(200).send({
            msg: '조회 성공',
            info: list[0]
        });

	} catch (error) {
		console.log('에러났을때 처리하는 부분', error);
		// if(error.errno === 1062) {
		// 	res.send({msg: '이미 개설된 강의 입니다.'});
		// } else
			res.status(404).send({msg: '알수없는 에러 실패'});
	} finally {
		con.release();
	}
});

 
router.post('/delete', async function(req, res) {
	const {courseIdx} = req.body;
	const decode = req.decode;

	let con;
	try {
		con = await pool.getConnection();

		if(decode.userType === 0) {
			const query = "DELETE FROM invited_course WHERE courseIdx = ? and userIdx = ?";
			pool.query(con, query, [courseIdx, decode.userIdx]);
		} else {
			const query = "DELETE FROM course WHERE courseIdx = ?";
			pool.query(con, query, [courseIdx]);
		}
		
		res.status(200).send({
            msg: '삭제 성공'
        });

	} catch (error) {
		console.log('에러났을때 처리하는 부분', error);
		// if(error.errno === 1062) {
		// 	res.send({msg: '이미 개설된 강의 입니다.'});
		// } else
			res.status(404).send({msg: '알수없는 에러 실패'});
	} finally {
		con.release();
	}
});

module.exports = router;