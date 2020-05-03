const router = require('express').Router();
const Builder = require('../../Models/Builder');


// POST
router.post('/submission', async function(req, res) {
	const {studentId, taskIdx, code, language} = req.body;

	// console.log(code);

	Builder.submission(studentId, taskIdx, code, language).then(function(result) {
		// console.log(result);

		res.send({msg: '성공', output: result});
	});

});

router.post('/excute', async function(req, res) {
	const {studentId, taskIdx, code, language} = req.body;

	// console.log(code);

	Builder.submission(studentId, taskIdx, code, language).then(function(result) {
		// console.log(result);

		res.send({result: 'success'});
	});

});


module.exports = router;
