const router = require('express').Router();
const pool = require('../../DB');
const jwt      = require('jsonwebtoken');
const jConfig = require('../../secretConfig.json');
var fs = require('fs');


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


router.post('/edit', async function (req, res) {
    // 과제 제목, 과제 설명, 강의 고유번호, 연장기한 사용 여부, 연장기한
    const { taskIdx, title, content, courseIdx, expireDate, extendType, extendDate, exampleList } = req.body;
    let con;
    try {
        con = await pool.getConnection();

        const query = "UPDATE task SET title = ?, content =?, expireDate = ?,extendType = ?,extendDate = ? WHERE taskIdx = ?";
		const exampleQuery = "INSERT INTO task_example (taskIdx, num, input, output, isHidden) values (?, ?, ?, ?, ?)";
		const deleteQuery = "DELETE FROM task_example WHERE taskIdx = ?";

		let _extendDate = null;
        if (extendType) 
			_extendDate = extendDate;

        await pool.query(con, query, [
			title, 
			content,
			expireDate, 
			extendType == 1 ? true :  false, 
			_extendDate ,
			taskIdx
		]);

		// 기존 예제들 삭제
		await pool.query(con, deleteQuery, [taskIdx]);

		for(var i = 0 ; i < exampleList.length; i++) {
			if(exampleList[i].input == '' && exampleList[i].output == '')
				continue;

			await pool.query(con, exampleQuery, [
				taskIdx, 
				i + 1,
				exampleList[i].input,
				exampleList[i].output,
				exampleList[i].isHidden
			]);
		}

        res.send({ msg: '과제 수정 성공' });
    } catch (error) {
        console.log('에러났을때 처리하는 부분', error);
        res.send({ msg: '알수없는 에러 실패' });
    } finally {
        con.release();
    }

});

router.post('/create', async function (req, res) {
    // 과제 제목, 과제 설명, 강의 고유번호, 연장기한 사용 여부, 연장기한
    const { title, content, courseIdx, expireDate, extendType, extendDate, exampleList } = req.body;
    let con;
    try {
        con = await pool.getConnection();

        const query = "INSERT INTO task (title,content,courseIdx,expireDate,extendType,extendDate) values (?, ?, ?, ?, ?, ?)";
		const exampleQuery = "INSERT INTO task_example (taskIdx, num, input, output, isHidden) values (?, ?, ?, ?, ?)";

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
			if(exampleList[i].input == '' && exampleList[i].output == '')
				continue;

			await pool.query(con, exampleQuery, [
				taskInsertResult.insertId, 
				i + 1,
				exampleList[i].input,
				exampleList[i].output,
				exampleList[i].isHidden
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

router.get('/list/nonAssignment', async function(req, res) {
	const decode = req.decode;

	let con;
    try {
        con = await pool.getConnection();
    
		const query = 'SELECT distinct t.taskIdx, pu.name as professorName, c.courseName, t.title, t.content, c.language, t.expireDate, t.extendDate FROM invited_course ic ' +
						'LEFT JOIN course c on ic.courseIdx = c.courseIdx ' +
						'LEFT JOIN task t on c.courseIdx = t.courseIdx ' +
						'LEFT JOIN user pu on c.userIdx = pu.userIdx ' +
						'WHERE ic.userIdx = ?';
		
		let result = await pool.query(con, query, [decode.userIdx]);
		let userList = [];

		for(var i = 0 ; i < result.length; i++) {
			const evaluationCheckQuery = 'SELECT count(*) as cnt FROM evaluation WHERE userIdx = ? and taskIdx = ?';
			let evaluationCheckResult = await pool.query(con, evaluationCheckQuery, [decode.userIdx, result[i].taskIdx]);

			if(evaluationCheckResult[0].cnt == 0) {
				userList.push(result[i]);
			}
		}

		res.send({
            msg: '조회 성공',
            list: userList
        });
    } catch (error) {
		console.log('에러났을때 처리하는 부분', error);
		
    	res.send({msg: '알수없는 에러 실패'});
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
                const isSubmission = 'select count(evaluationIdx) as count, score from evaluation WHERE userIdx = ? and taskIdx = ?'
                const isSubmissionResult = await pool.query(con, isSubmission, [decode.userIdx, result[i].taskIdx]);

				result[i].isSubmission = isSubmissionResult[0].count == 0 ? false : true;
				result[i].score = isSubmissionResult[0].score;
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
		const query = 'SELECT t.title, t.content, t.expireDate, t.extendType, t.extendDate, c.language FROM task t left join course c on t.courseIdx = c.courseIdx WHERE t.taskIdx = ?';
		let code = '';
		
		let exampleQuery;
		if(decode.userType === 0) {
			// 학생인경우
			exampleQuery = "SELECT num, input, output FROM task_example WHERE taskIdx = ? and isHidden = 0";
			
			let codeResult = await pool.query(
				con, 
				'select codeLocation from evaluation where userIdx = ? and taskIdx = ?',
				[decode.userIdx, taskIdx]
			);

			if(codeResult.length > 0) {
				code = fs.readFileSync(codeResult[0].codeLocation, {
					encoding: 'utf8',
					flag: 'r'
				});
			}
		} else
			exampleQuery = "SELECT num, input, output, isHidden FROM task_example WHERE taskIdx = ?";
		
		let result = await pool.query(con, query, [taskIdx]);
		let exampleResult = await pool.query(con, exampleQuery, [taskIdx]);
		
		result[0].code = code;
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

// 학생 과제 목록
router.get('/list/apply', async function(req, res) {
	const {taskIdx} = req.query;

	let con;
    try {
		con = await pool.getConnection();
		const query = 'SELECT u.name as studentName, u.id, e.taskIdx, e.language, e.evaluationIdx, e.score, e.outputLocation, e.codeLocation, e.submissionDate FROM evaluation e left join user u on e.userIdx = u.userIdx WHERE taskIdx = ?';
		let result = await pool.query(con, query, [taskIdx]);
		let data = null;

		if(result.length != 0) {
			data = {
				language: result[0].language,
				users: []
			};

			for(var i = 0 ; i  < result.length; i++) {
				let output = fs.readFileSync(result[i].outputLocation, {
					encoding: 'utf8',
					flag: 'r'
				});

				let code = fs.readFileSync(result[i].codeLocation, {
					encoding: 'utf8',
					flag: 'r'
				});

				console.log(output);
				data.users.push({
					studentName: result[i].studentName,
					id: result[i].id,
					evaluationIdx: result[i].evaluationIdx,
					score: result[i].score,
					submissionDate: result[i].submissionDate,
					output: output,
					code: code
				});
			}
		}

		res.status(200).send({
			msg: '조회 완료',
			data: data
		});
	} catch (error) {
		console.log('에러났을때 처리하는 부분', error);
		res.status(400).send({msg: '알수없는 에러 실패'});
	} finally {
		con.release();
	}
});

router.post('/delete', async function(req, res) {
	const {taskIdx} = req.body;

	let con;
	try {
		con = await pool.getConnection();
		const query = 'DELETE FROM task WHERE taskIdx = ?';

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


router.get('/list/grade', async function(req, res) {
	const {courseIdx, studentIdx} = req.query;
 
	let con;
	try {
	   con = await pool.getConnection();
	   const query = 'select t.taskIdx, t.title, t.content, e.score ' + 
		  'from task t left join evaluation e on t.taskIdx = e.taskIdx ' +
		  'left join user u on (e.userIdx = u.userIdx) ' +
		  'where u.userIdx = ? and t.courseIdx = ?';
 
	   let result = await pool.query(con, query, [studentIdx, courseIdx]);
 
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