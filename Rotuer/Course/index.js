const router = require('express').Router(); 
const pool = require('../../DB');


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
		
		await pool.query(con, query, [userIdx,courseName]);

		res.send({msg: '강의개설 성공'});

	} catch (error) {
		console.log('에러났을때 처리하는 부분', error);
		// if(error.errno === 1062) {
		// 	res.send({msg: '이미 개설된 강의 입니다.'});
		// } else
			res.send({msg: '알수없는 에러 실패'});
	} finally {
		con.release();
	}
});

router.get('/list/professor', async function(req, res) {
    const {userIdx} = req.body;
    console.log("요청들어온 userIdx : ",userIdx);

	let con;
	try {
		con = await pool.getConnection();

		const query = "select courseIdx, courseName, language from course where userIdx = ?";
        
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


	} catch (error) {
		console.log('에러났을때 처리하는 부분', error);
		// if(error.errno === 1062) {
		// 	res.send({msg: '이미 개설된 강의 입니다.'});
		// } else
	} finally {
		// con.release();
	}
});


module.exports = router;
