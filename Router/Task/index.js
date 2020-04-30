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
    const { title, content, courseIdx, expireDate, extendType, extendDate } = req.body;
    let con;
    try {
        con = await pool.getConnection();

        const query = "INSERT INTO task (title,content,courseIdx,expireDate,extendType,extendDate) values (?, ?, ?, ?, ?, ?)";

        if (extendType == 0) 
            extendDate = null;

        await pool.query(con, query, [title, content, courseIdx, expireDate, extendType, extendDate]);

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
                        ' where ic.userIdx = ?';

            result = await pool.query(con, query, [decode.userIdx]);
            
            for(var i = 0 ; i < result.length; i++) {
                const isSubmission = 'select count(evaluationIdx) as count from evaluation WHERE userIdx = ? and taskIdx = ?'
                const isSubmissionResult = await pool.query(con, isSubmission, [decode.userIdx, result[i].taskIdx]);

                result[i].isSubmission = isSubmissionResult[0].count == 0 ? false : true
            }
        }
		else {// 교수인경우
            query = "select t.taskIdx, t.title, t.content, t.expireDate, t.extendDate from task t left join course c on t.courseIdx = c.courseIdx where c.userIdx= ?";
            result = await pool.query(con, query, [decode.userIdx]);
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



module.exports = router;