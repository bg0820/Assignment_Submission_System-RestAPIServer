'use strict';

var fs = require('fs');
const pool = require('../../DB');
const child = require('child_process');
const perform = require('perf_hooks');
const { fail } = require('assert');

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

				
			if(!fs.existsSync(userDirectory + '/Temp')) 
				fs.mkdirSync(userDirectory + '/Temp', {
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

	executeCLI = (socket, type, path, options, pipeInput) => {
		let startTime = perform.performance.now();

		var childProcess = child.spawn(path, options, {
			stdio: ['pipe' ]
		});

		childProcess.stdin.setEncoding('utf-8');
		

		return new Promise(function(resolve, reject) {
			let result = {
				code: -1,
				output: [],
				failed: []
			}

			let checkTimeout = setInterval(() => {
				// 실행한지 1초 경과
				if(perform.performance.now() - startTime > 3000.0) {
					result.failed.push("실행 실패 - 시간 3초 경과");
					clearInterval(checkTimeout);
					resolve(result);
				}
			}, 30);
			
			try {
				if(pipeInput) {
					console.log('pipe', pipeInput);
					for(var i = 0 ; i < pipeInput.length; i++)
						childProcess.stdin.write(pipeInput[i] + '\n');
				}
			} catch(e) {
				if(e.code === 'ERR_STREAM_DESTROYED') {
					result.failed.push("값을 입력할 수 없습니다.");
					clearInterval(checkTimeout);
					resolve(result);
				}
			}

			childProcess.stdout.on('data', function(out) {
				result.output.push({
					type:'out',
					data: out.toString('utf8')
				});
				socket.emit('code_output', {type: 'out', msg: out.toString('utf8')});
			});
				
			childProcess.stderr.on('data', function(err) {
				result.output.push({
					type:'err',
					data: err.toString('utf8')
				});
				socket.emit('code_output', {type: 'err', msg: err.toString('utf8')});
			});
			
			childProcess.on('close', (err, data) => {
				clearInterval(checkTimeout);

				if (err) {
					if(type === 'compile')
						socket.emit('code_output', {type: 'close', msg: '컴파일 실패\r\n===========================', code: err});
					else if(type === 'exec')
						socket.emit('code_output', {type: 'close', msg: '실행 실패', code: err});
					
					reject(err);
				} else {
					if(data == null) {
						if(type === 'compile')
							socket.emit('code_output', {type: 'close', msg: '컴파일 완료\r\n===========================', code: data});
					} else {
						result.code = data;
	
						let msg = '';
						switch(data) {
							case 'SIGHUP':
								msg = 'hangup';
								break;
							case 'SIGINT':
								msg = 'interrupt';
								break;
							case 'SIGQUIT':
								msg = 'quit';
								break;
							case 'SIGILL':
								msg = 'illegal instruction (not reset when caught)';
								break;
							case 'SIGTRAP':
								msg = 'trace trap (not reset when caught)';
								break;
							case 'SIGABRT':
								msg = 'abort()';
								break;
							case 'SIGPOLL':
								msg = 'pollable event ([XSR] generated, not supported)';
								break;
							case 'SIGIOT':
								msg = 'compatibility';
								break;
							case 'SIGABRT':
								msg = 'compatibility';
								break;
							case 'SIGEMT':
								msg = 'EMT instruction';
								break;
							case 'SIGFPE':
								msg = 'floating point exception';
								break;
							case 'SIGKILL':
								msg = 'kill (cannot be caught or ignored)';
								break;
							case 'SIGBUS':
								msg = 'bus error';
								break;
							case 'SIGSEGV':
								msg = 'segmentation violation';
								break;
							case 'SIGSYS':
								msg = 'bad argument to system call';
								break;
							case 'SIGPIPE':
								msg = 'write on a pipe with no one to read it';
								break;
							case 'SIGALRM':
								msg = 'alarm clock';
								break;
							case 'SIGTERM':
								msg = 'software termination signal from kill';
								break;
							case 'SIGURG':
								msg = 'urgent condition on IO channel';
								break;
							case 'SIGSTOP':
								msg = 'sendable stop signal not from tty';
								break;
							case 'SIGTSTP':
								msg = 'stop signal from tty';
								break;
							case 'SIGCONT':
								msg = 'continue a stopped process';
								break;
							case 'SIGCHLD':
								msg = 'to parent on child stop or exit';
								break;
							case 'SIGTTIN':
								msg = 'to readers pgrp upon background tty read';
								break;
							case 'SIGTTOU':
								msg = 'like TTIN for output if (tp->t_local&LTOSTOP)';
								break;
							case 'SIGIO':
								msg = 'input/output possible signal';
								break;
							case 'SIGXCPU':
								msg = 'exceeded CPU time limit';
								break;
							case 'SIGXFSZ':
								msg = 'exceeded file size limit';
								break;
						}
						result.failed.push(type + " 실패 " + msg);
					}
					resolve(result);
				}
			});


		});
	}

	GetJavaFindName = (code) => {
		// 자바의 경우 클래스 이름과 파일 이름이 같아야함
		console.log(code);
		let classNameRegexr = /(?<=class)(\s)*([a-zA-Z]).*(?=\{)/gi;
		let classNameRegex = code.match(classNameRegexr);

		if(classNameRegex == null || classNameRegex.length === 0) {
			socket.emit('code_exec', {type: 'error', msg: '코드 에러 실패'});
			return;
		}

		return classNameRegex[0].trim();
	}

	execute = async (socket, studentId, code, language, examples) => {
		let userDirectory = "Submission/" + studentId;
		let taskDirectory = userDirectory  + "/Temp";

		try {
			if(language === 'c' || language === 'c++') {
				let outputPath = taskDirectory + '/c_output';
				let inputPath = taskDirectory + '/main.cpp';
				this.studentInit(userDirectory, taskDirectory, "main.cpp", code);
				
				// compile
				await this.executeCLI(socket, 'compile', 'g++', [
					'-o',
					outputPath,
					'-g',
					inputPath,
					'-std=c++11'
				]);

				// execute
				for(var i = 0 ; i  < examples.length; i++) {
					let example = examples[i];
					let inputs = example.input.split('\n');
					let outputs = example.output.split('\n');
					var result = await this.executeCLI(socket, 'exec', outputPath, [], inputs);
					var failed = false;

					// 실행 실패 원인
					for(var j = 0; j < result.failed.length; j++) {
						socket.emit('code_output', {type: 'result_failed', msg:  result.failed[i]});
						failed = true;
						return;
					}

					for(var j = 0 ; j < result.output.length; j++) {
						let item = result.output[j];
	
						if(outputs[j] == undefined)
							break;
							
						// n번째 출 출력과, 예제에서의 출력이 다름
						if(outputs[j].trim() != item.data.trim())
							failed = true;
					}
					
					if(!failed)
						socket.emit('code_output', {type: 'result_success', msg: '예제 ' + (i + 1) + "번 정답\n"});
					else
						socket.emit('code_output', {type: 'result_failed', msg: '예제 ' + (i + 1) + "번 오답\n"});
				}
			} else if(language === 'java') {
				let javaClass = this.GetJavaFindName(code);

				this.studentInit(userDirectory, taskDirectory, javaClass + '.java', code);

				// compile
				await this.executeCLI(socket, 'compile', 'bin/jdk1.8.0_241/bin/javac', [
					taskDirectory + '/' + javaClass + '.java'
				]);
				
				// execute
				for(var i = 0 ; i  < examples.length; i++) {
					let example = examples[i];
					let inputs = example.input.split('\n');
					let outputs = example.output.split('\n');

					var result = await this.executeCLI(socket, 'exec', 'bin/jdk1.8.0_241/bin/java', [
						'-cp',
						taskDirectory + '/', javaClass,
						javaClass
					], inputs);
					var failed = false;

					// 실행 실패 원인
					for(var j = 0; j < result.failed.length; j++) {
						socket.emit('code_output', {type: 'result_failed', msg: result.failed[i]});
						failed = true;
						return;
					}			

					for(var j = 0 ; j < result.output.length; j++) {
						let item = result.output[j];

						if(outputs[j] == undefined)
							break;

						// n번째 출 출력과, 예제에서의 출력이 다름
						if(outputs[j].trim() != item.data.trim())
							failed = true;
					}
					
					if(!failed) {
						socket.emit('code_output', {type: 'result_success', msg: '예제 ' + (i + 1) + "번 정답"});
						socket.emit('code_output', {type: 'blank', msg: '\n'});
					} 
					else {
						socket.emit('code_output', {type: 'result_failed', msg: '예제 ' + (i + 1) + "번 오답"});
						socket.emit('code_output', {type: 'blank', msg: '\n'});
					}
				}
			} else if(language === 'python') {
				// fileName = "main.py";
			}
		} catch(e) {
			console.log(e);
		}
	}
	GetExamples = async (taskIdx) => {
		let con;
		try {
			con = await pool.getConnection();
		
			let exampleResult = await pool.query(con, "SELECT num, input, output FROM task_example WHERE taskIdx = ?", [taskIdx]);
			return exampleResult;
		} catch (error) {
			console.log('에러났을때 처리하는 부분', error);
		} finally {
			con.release();
		}
	}

	submission_execute = async (socket, excutePath, excuteArgs, examples) => {
		let score = 100.0;
		let oneExampleScroe = score/ examples.length;

		// execute
		for(var i = 0 ; i  < examples.length; i++) {
			let example = examples[i];
			let inputs = example.input.split('\n');
			let outputs = example.output.split('\n');
			var result = await this.executeCLI(socket, 'exec', excutePath, excuteArgs, inputs);
			var failed = false;

			// 실행 실패 원인
			for(var j = 0; j < result.failed.length; j++) {
				score -= oneExampleScroe;
				socket.emit('code_output', {type: 'result_failed', msg: result.failed[i]});
				failed = true;
				return;
			}

			let oneOutputScore = oneExampleScroe / result.output.length;
			for(var j = 0 ; j < result.output.length; j++) {
				let item = result.output[j];

				if(outputs[j] == undefined)
					break;

				// n번째 출 출력과, 예제에서의 출력이 다름
				if(outputs[j].trim() != item.data.trim()) {
					score -= oneOutputScore;
					failed = true;
				}
			}
			
			if(!failed) {
				socket.emit('code_output', {type: 'result_success', msg: '예제 ' + (i + 1) + "번 정답"});
				socket.emit('code_output', {type: 'blank', msg: '\n'});
			}
			else {
				socket.emit('code_output', {type: 'result_failed', msg: '예제 ' + (i + 1) + "번 오답"});
				socket.emit('code_output', {type: 'blank', msg: '\n'});
			}
		}

		return score;
	}

	submission = async (socket, userIdx, studentId, taskIdx, code, language) => {
		let examples = await this.GetExamples(taskIdx);
		let userDirectory = "Submission/" + studentId;
		let taskDirectory = userDirectory  + "/" + taskIdx;
		
		let outputLocation = '';
		let codeLocation = '';

		let score = 100;

		try {
			if(language === 'c' || language === 'c++') {
				outputLocation = taskDirectory + '/c_output';
				codeLocation = taskDirectory + '/main.cpp';

				this.studentInit(userDirectory, taskDirectory, "main.cpp", code);

				// compile
				await this.executeCLI(socket, 'compile', 'g++', [
					'-o',
					outputLocation,
					'-g',
					codeLocation,
					'-std=c++11'
				]);

				score = await this.submission_execute(socket, outputLocation, [], examples);
			} else if(language === 'java') {
				let javaClass = this.GetJavaFindName(code);				
				this.studentInit(userDirectory, taskDirectory, javaClass + '.java', code);

				// compile
				await this.executeCLI(socket, 'compile', 'bin/jdk1.8.0_241/bin/javac', [
					taskDirectory + '/' + fileName+ '.java'
				]);

				score = await this.submission_execute(socket, 'bin/jdk1.8.0_241/bin/java', [
					'-cp',
					taskDirectory + '/', javaClass,
					javaClass
				], examples);
			} else if(language === 'python') {
				// fileName = "main.py";
			} else if(language === 'html') {
				// fileName = "index.html";
				outputLocation = taskDirectory + '/index.html';
				codeLocation = taskDirectory + '/index.html';
				this.studentInit(userDirectory, taskDirectory, "index.html", code);

				fs.writeFileSync(outputLocation, code.toString(), {
					encoding: 'utf8',
					mode: 0o777,
					flag: 'w'
				});
			}
		} catch(e) {
			console.log('exec failed ', e);
			score = 0;
		}

		let con;
		try {
			con = await pool.getConnection();
			const existQuery = 'SELECT * FROM evaluation WHERE taskIdx = ? and userIdx = ?';
			let existResult = await pool.query(con, existQuery, [taskIdx, userIdx]);
			
			score = Math.ceil(score);

			if(existResult.length == 0) {
				const query = 'INSERT INTO evaluation (taskIdx, userIdx, outputLocation, codeLocation, score, language, submissionDate) values (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)';
				await pool.query(con, query, [taskIdx, userIdx, outputLocation, codeLocation, score, language]);
			} else {
				const query = 'UPDATE evaluation SET score = ?, submissionDate = CURRENT_TIMESTAMP WHERE taskIdx = ? and userIdx = ?';
				await pool.query(con, query, [score, taskIdx, userIdx]);
			}
			
			socket.emit('code_output', {type:'submit_success', result: 'success', msg: '제출 완료 - 점수 ' + score + '점'});
		} catch (error) {
			console.log('에러났을때 처리하는 부분', error);
			socket.emit('code_submit', {type:'submit_failed', result: 'failed', msg: '제출 실패', error: -1});
		} finally {
			con.release();
		}
	}

	
}

const builder = new Builder();

module.exports = builder;