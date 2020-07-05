'use strict';

var fs = require('fs');
const pool = require('../../DB');
const child = require('child_process');

class Builder {
	constructor() {

	}

	/*
	* userDirectory = 학번 또는 교번
	* taskDirectory = 과제 아이디 이름의 폴더
	* fileName = 컴파일 할 파일 명
	* code = 실제 코드 내용
	*/
	studentInit = (userDirectory, taskDirectory, fileName, code) => {
		try {
			if(!fs.existsSync(userDirectory)) 
				fs.mkdirSync(userDirectory, {
					recursive: true,
					mode: 0o777
				});

			if(!fs.existsSync(taskDirectory)) 
				fs.mkdirSync(taskDirectory, {
					recursive: true,
					mode: 0o777
				});

			// Input.c, c++, java 존재하면 삭제
			if(fs.existsSync(taskDirectory+ '/' + fileName)) 
				fs.unlinkSync(taskDirectory + '/' + fileName);

			fs.writeFileSync(taskDirectory + '/' + fileName, code, {
				encoding: 'utf8',
				mode: 0o777,
				flag: 'w'
			});

			return taskDirectory + '/' + fileName;
		} catch(err) {
			console.log('파일 생성 에러', err);
		}

		return '';
	}

	java_compile = async (socket, directory) => {
		var spw = child.spawn('bin/jdk1.8.0_241/bin/javac', [
			directory
		]);
		
		return new Promise(function(resolve, reject) {
			spw.stdout.on('data', function(out) {
				console.log('compile out', out.toString('utf8'));
				socket.emit('code_exec', {type: 'compile_out', msg: out.toString('utf8')});
			});

			spw.stderr.on('data', function(err) {
				console.log('compile err', err.toString('utf8'));
				// console.log('err', err.toString('ascii'));
				socket.emit('code_exec', {type: 'compile_err', msg: err.toString('utf8')});
			});
			
			spw.on('exit', (code) => {
				console.log('Compile Success ' + code);
				resolve(code);
			});
		});
	}

	java_execute = (socket, execPath, className) => {
		var spw = child.spawn('bin/jdk1.8.0_241/bin/java', [
			'-cp',
			execPath,
			className
		]);

		return new Promise(function(resolve, reject) {
			let result = {
				code: -1,
				output: []
			}

			spw.stdout.on('data', function(out) {
				console.log('execute out', out.toString('utf8'));
				result.output.push({
					type:'out',
					data: out.toString('utf8')
				});
				
				socket.emit('code_exec', {type: 'out', msg: out.toString('utf8')});
			});
			spw.stderr.on('data', function(err) {
				console.log('execute err', err.toString('utf8')); //err.toString('ascii'));
				result.output.push({
					type:'err',
					data: err.toString('utf8')
				});
				socket.emit('code_exec', {type: 'err', msg: err.toString('utf8')});
			});
			spw.on('exit', (code) => {
				console.log('execute Success', code);
				result.code = code;
				resolve(result);
			});
		});
	}

	c_compile = async (socket, output, input) => {
		var spw = child.spawn('g++', [
			'-o',
			output,
			'-g',
			input,
			'-std=c++11'
		]);

		return new Promise(function(resolve, reject) {
			spw.stdout.on('data', function(out) {
				console.log('compile out', out.toString('utf8'));
				socket.emit('code_exec', {type: 'compile_out', msg: out.toString('utf8')});
			});

			spw.stderr.on('data', function(err) {
				// console.log('err', err);
				console.log('compile err', err.toString('utf8'));
				socket.emit('code_exec', {type: 'compile_err', msg: err.toString('utf8')});
			});
			
			spw.on('exit', (code) => {
				console.log('Compile Success ' + code);
				socket.emit('code_compile', {msg: '컴파일 완료'});
				resolve(code);
			});
		});
	}

	c_execute = (socket , execPath) => {
		var spw = child.spawn(execPath, []);

		return new Promise(function(resolve, reject) {
			let result = {
				code: -1,
				output: []
			}

			spw.stdout.on('data', function(out) {
				console.log('execute out', out.toString('utf8'));
				result.output.push({
					type:'out',
					data: out.toString('utf8')
				});

				console.log(out.toString('utf8'));
				socket.emit('code_exec', {type: 'out', msg: out.toString('utf8')});
			});
			spw.stderr.on('data', function(err) {
				console.log('execute err', err.toString('utf8')); //err.toString('ascii'));
				result.output.push({
					type:'err',
					data: err.toString('utf8')
				});

				console.log(err.toString('utf8'));
				socket.emit('code_exec', {type: 'err', msg: err.toString('utf8')});
			});
			spw.on('exit', (code) => {
				console.log('execute Success', code);
				socket.emit('code_exec', {type: 'exit', msg: code});

				result.code = code;
				resolve(result);
			});
		});
	}

	execute = async (socket, studentId, taskIdx, code, language) => {
		let userDirectory = "Submission/" + studentId;
		let taskDirectory = userDirectory  + "/" + taskIdx;
		let output = null;

		try {
			if(language === 'c' || language === 'c++') {
				let outputPath = taskDirectory + '/c_output';
				this.studentInit(userDirectory, taskDirectory, "main.cpp", code);
				
				let compileOutput = await this.c_compile(socket, outputPath, taskDirectory + '/main.cpp');
				output = await this.c_execute(socket, outputPath);
			} else if(language === 'java') {
				// 자바의 경우 클래스 이름과 파일 이름이 같아야함
				let classNameRegexr = /(?<=class)(\s)*([a-zA-Z]).*(?=\{)/gi;
				let classNameRegex = code.match(classNameRegexr);

				if(classNameRegex == null || classNameRegex.length === 0) {
					socket.emit('code_exec', {type: 'error', msg: '코드 에러 실패'});
					return;
				}
				let className = classNameRegex[0].trim();
				let fileName = className + ".java"; 

				console.log(className, fileName);
				
				this.studentInit(userDirectory, taskDirectory, fileName, code);

				let compileOutput = await this.java_compile(socket, taskDirectory + '/' + fileName);
				output = await this.java_execute(socket, taskDirectory + '/', className);
			} else if(language === 'python') {
				// fileName = "main.py";
			}

		} catch(e) {
			console.log(e);
		}
	}

	submission = async (socket, userIdx, studentId, taskIdx, code, language) => {
		let userDirectory = "Submission/" + studentId;
		let taskDirectory = userDirectory  + "/" + taskIdx;
		let output = [];
		let outputLocation = '';
		let codeLocation = '';

		try {
			if(language === 'c' || language === 'c++') {
				let outputPath = taskDirectory + '/c_output';
				this.studentInit(userDirectory, taskDirectory, "main.cpp", code);
				
				codeLocation = taskDirectory + '/main.cpp';
				let compileOutput = await this.c_compile(socket, outputPath, taskDirectory + '/main.cpp');
				output = await this.c_execute(socket, outputPath);
			} else if(language === 'java') {

				// 자바의 경우 클래스 이름과 파일 이름이 같아야함
				let classNameRegexr = /(?<=class)(\s)*([a-zA-Z]).*(?=\{)/gi;
				let classNameRegex = code.match(classNameRegexr);

				if(classNameRegex == null || classNameRegex.length === 0) {
					socket.emit('code_submit', {type:'result', result: 'failed', msg: 'JAVA 메인 클래스 찾기 실패'});
					return;
				}

				let className = classNameRegex[0].trim();
				let fileName = className + ".java"; 

				codeLocation = taskDirectory + '/' + fileName;
				this.studentInit(userDirectory, taskDirectory, fileName, code);

				let compileOutput = await this.java_compile(socket, taskDirectory + '/' + fileName);
				output = await this.java_execute(socket, taskDirectory + '/', className);
			} else if(language === 'python') {
				// fileName = "main.py";
			} else if(language === 'html') {
				// fileName = "index.html";
				let outputPath = taskDirectory + '/index.html';
				this.studentInit(userDirectory, taskDirectory, "index.html", code);
				
				codeLocation = taskDirectory + '/index.html';
			}

			let outputStr;

			if(language === 'c' || language === 'java') {
				outputLocation = taskDirectory + '/output_' + language + '.txt';
				outputStr  = output.output.join('\n');
			} else if(language === 'html') {
				outputLocation = taskDirectory + '/index.html';
				outputStr = code;
			}

			fs.writeFileSync(outputLocation, outputStr.toString(), {
				encoding: 'utf8',
				mode: 0o777,
				flag: 'w'
			});
		} catch(e) {
			console.log(e);
		}

		let con;
		try {
			con = await pool.getConnection();
			const existQuery = 'SELECT * FROM evaluation WHERE taskIdx = ? and userIdx = ?';
			let existResult = await pool.query(con, existQuery, [taskIdx, userIdx]);
			
			const query = 'INSERT INTO evaluation (taskIdx, userIdx, outputLocation, codeLocation, score, language, submissionDate) values (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)';

			if(existResult.length == 0) {
				query = 'UPDATE evaluation SET submissionDate = CURRENT_TIMESTAMP WHERE taskIdx = ? and userIdx = ?';
				await pool.query(con, query, [taskIdx, userIdx]);
			} else {
				await pool.query(con, query, [taskIdx, userIdx, outputLocation,codeLocation, 100.0, language]);
			}
			
			socket.emit('code_submit', {type:'result', result: 'success', msg: '제출 완료'});
		} catch (error) {
			console.log('에러났을때 처리하는 부분', error);
			socket.emit('code_submit', {type:'result', result: 'failed', msg: '제출 실패', error: -1});
		} finally {
			con.release();
		}
	}

	
}

const builder = new Builder();

module.exports = builder;