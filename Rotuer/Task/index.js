const router = require('express').Router();
const pool = require('../../DB');

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


module.exports = router;