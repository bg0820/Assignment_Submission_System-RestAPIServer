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
router.post('/create', async function(req, res) {
	const {userIdx,courseName} = req.body;
	let con;
	try {
		con = await pool.getConnection();

		const query = "INSERT INTO course (userIdx, courseName) values (?, ?)";
		
		await pool.query(con, query, [userIdx, courseName]);

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
	console.log(decode);

	let con;
	try {
		con = await pool.getConnection();

		let query = '';
		if(decode.userType === 0) {
			query =   	"SELECT ic.inviteCourseIdx, ic.courseIdx, c.courseName, c.language, c.courseIdx, proU.name, proU.email " +
						" FROM invited_course ic LEFT JOIN course c on ic.courseIdx = c.courseIdx LEFT JOIN user proU on c.userIdx = proU.userIdx " +
						" WHERE ic.userIdx = ?";
		} else {
			query = "select courseIdx, courseName, language from course where userIdx = ?";
		}

        const list = await pool.query(con, query, [decode.userIdx]);
            
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
		// con.release();
	}
});


/*

router.get('/list/student', async function(req, res) {
    const {userIdx} = req.body;
    console.log("요청들어온 userIdx : ",userIdx);

	let con;
	try {
		con = await pool.getConnection();

		const query =   "select distinct ic.inviteCourseIdx, ic.courseIdx, ic.userIdx, c.courseName, c.language " +
                        "From invited_course ic left join course c on ic.courseIdx = c.courseIdx " +
                        "WHERE ic.userIdx = ?";
        
        const list = await pool.query(con, query, [userIdx]);

		res.send({
            msg: '조회 성공',
            list: list
        });

	} catch (error) {
		console.log('에러났을때 처리하는 부분', error);
		// if(error.errno === 1062) {
		// 	res.send({msg: '이미 개설된 강의 입니다.'});
		// } else
			res.send({msg: '알수없는 에러 실패'});
	} finally {
		// con.release();
	}
});
*/

module.exports = router;
