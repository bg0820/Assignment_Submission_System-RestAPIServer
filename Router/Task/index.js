const router = require('express').Router();
const pool = require('../../DB');


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
 과제 생성 [ 교수 ]
 과제 목록 [ 교수 ]
 과제 목록 [ 학생 ]

*/

router.post('/create', async function (req, res) {
    let { title, content, courseIdx, expireDate, extendType, extendDate } = req.body;
    let con;
    try {
        con = await pool.getConnection();

        const query = "INSERT INTO task (title,content,courseIdx,expireDate,extendType,extendDate) values (?, ?, ?, ?, ?, ?)";

        if (extendType == 0) {
            extendDate = "";
        } else {
            console.log('extendDate : ',extendDate);
            if (!extendDate) {
                console.log('연장일 입력안함')
                res.send({ msg: '연장일을 입력해주세요' });
                return;
            } else {

            }
        }
        await pool.query(con, query, [title, content, courseIdx, expireDate, extendType, extendDate]);

        res.send({ msg: '과제 생성 성공' });

    } catch (error) {
        console.log('에러났을때 처리하는 부분', error);
        // if(error.errno === 1062) {
        // 	res.send({msg: '이미 개설된 강의 입니다.'});
        // } else
        res.send({ msg: '알수없는 에러 실패' });
    } finally {
        con.release();
    }

});

router.get('/list', async function(req, res) {
    const decode = req.decode; // {courseIdx} = req.body;
    console.log(decode);
    
    let con;
    try {
        con = await pool.getConnection();
	
		let query = '';
		if(req.decode.userType === 0) 
			query =   'select taskIdx,directory,score,language,submissionDate from evaluation where userIdx = ?';
		else
        	query = "select title,content,courseIdx,expireDate,extendDate from task where userIdx = ?";
		
        const list = await pool.query(con, query, [decode.userIdx]);
            
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

/*

router.get('/list/student', async function(req, res) {
    const {userIdx} = req.body;
    console.log("요청들어온 userIdx : ",userIdx);

	let con;
	try {
		con = await pool.getConnection();

		
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
});*/




module.exports = router;