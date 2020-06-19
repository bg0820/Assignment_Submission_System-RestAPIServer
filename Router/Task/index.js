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
 과제 생성 [ 교수 ]
 과제 목록 [ 교수 ]
 과제 목록 [ 학생 ]

*/

router.post('/create', async function (req, res) {
    // 과제 제목, 과제 설명, 강의 고유번호, 연장기한 사용 여부, 연장기한
    const { title, content, courseIdx, expireDate, extendType, extendDate, exampleList } = req.body;
    let con;
    try {
        con = await pool.getConnection();

        const query = "INSERT INTO task (title,content,courseIdx,expireDate,extendType,extendDate) values (?, ?, ?, ?, ?, ?)";
		const exampleQuery = "INSERT INTO task_example (taskIdx, num, input, output) values (?, ?, ?, ?)";

		let _extendDate = null;
        if (extendType) 
			_extendDate = extendDate;

        let taskInsertResult = await pool.query(con, query, [
			title, 
			content, 
			courseIdx, 
			expireDate, 
			extendType, 
			_extendDate
		]);

		for(var i = 0 ; i < exampleList.length; i++) {
			await pool.query(con, exampleQuery, [
				taskInsertResult.insertId, 
				i + 1,
				exampleList[i].input,
				exampleList[i].output
			]);
		}

        res.send({ msg: '과제 생성 성공' });
    } catch (error) {
        console.log('에러났을때 처리하는 부분', error);
        res.send({ msg: '알수없는 에러 실패' });
    } finally {
        con.release();
    }

});

router.get('/list', async function(req, res) {
	const decode = req.decode;
	const {courseIdx} = req.query;
    
    let con;
    try {
        con = await pool.getConnection();
    
        let result;
		let query = '';
		if(req.decode.userType === 0) {// 학생인경우
			query =   'SELECT t.taskIdx, professorUser.name  as professorName, c.courseName,  t.title, t.content, c.language, t.expireDate, t.extendDate ' +
                        ' FROM (invited_course ic LEFT JOIN course c on ic.courseIdx = c.courseIdx ' +
                        ' LEFT JOIN user professorUser on c.userIdx = professorUser.userIdx) ' +
                        ' RIGHT JOIN task t on t.courseIdx = ic.courseIdx ' +
                        ' where ic.userIdx = ? and ic.courseIdx = ?';

            result = await pool.query(con, query, [decode.userIdx, courseIdx]);
            
            for(var i = 0 ; i < result.length; i++) {
                const isSubmission = 'select count(evaluationIdx) as count from evaluation WHERE userIdx = ? and taskIdx = ?'
                const isSubmissionResult = await pool.query(con, isSubmission, [decode.userIdx, result[i].taskIdx]);

                result[i].isSubmission = isSubmissionResult[0].count == 0 ? false : true
            }
        }
		else {// 교수인경우
            query = "select t.taskIdx, t.title, t.content, t.expireDate, t.extendDate from task t left join course c on t.courseIdx = c.courseIdx where c.userIdx= ? and t.courseIdx = ?";
            result = await pool.query(con, query, [decode.userIdx, courseIdx]);
        }
            
        res.send({
            msg: '조회 성공',
            list: result
        });
    
    } catch (error) {
		console.log('에러났을때 처리하는 부분', error);
		
    	res.send({msg: '알수없는 에러 실패'});
    } finally {
        con.release();
    }
});

router.get('/detail', async function(req, res) {
	const {taskIdx} = req.query;
    const decode = req.decode; 
    console.log(taskIdx)

	let con;
    try {
		con = await pool.getConnection();
		const query = 'SELECT t.title, t.content, c.language FROM task t left join course c on t.courseIdx = c.courseIdx WHERE t.taskIdx = ?';
		const exampleQuery = "SELECT num, input, output FROM task_example WHERE taskIdx = ?";

		let result = await pool.query(con, query, [taskIdx]);
		let exampleResult = await pool.query(con, exampleQuery, [taskIdx]);
		result[0].example = exampleResult;

		res.send({
            msg: '조회 성공',
            info: result[0]
        });
	} catch (error) {
		console.log('에러났을때 처리하는 부분', error);
    	res.send({msg: '알수없는 에러 실패'});
    } finally {
        con.release();
    }

});

router.put('/evaluate', async function(req, res) {
	const {evaluationIdx, score} = req.body;
	
	let con;
    try {
		con = await pool.getConnection();
		const query = 'UPDATE evaluation SET score = ? WHERE evaluationIdx = ?';
		await pool.query(con, query, [score, evaluationIdx]);

		res.status(200).send({
			msg: '반영 완료'
		});
	} catch (error) {
		console.log('에러났을때 처리하는 부분', error);
		res.status(400).send({msg: '알수없는 에러 실패'});
	} finally {
		con.release();
	}

});

router.get('/list/apply', async function(req, res) {
	const {taskIdx} = req.query;

	let con;
    try {
		con = await pool.getConnection();
		const query = 'SELECT u.name as studentName, u.id, e.language, e.evaluationIdx, e.score FROM evaluation e left join user u on e.userIdx = u.userIdx WHERE taskIdx = ?';
		let result = await pool.query(con, query, [taskIdx]);

		res.status(200).send({
			msg: '조회 완료',
			list: result
		});
	} catch (error) {
		console.log('에러났을때 처리하는 부분', error);
		res.status(400).send({msg: '알수없는 에러 실패'});
	} finally {
		con.release();
	}
});

module.exports = router;