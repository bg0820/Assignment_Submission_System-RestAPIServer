'use strict';

var fs = require('fs');
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

	java_compile = async (directory) => {
		var spw = child.spawn('bin/jdk1.8.0_241/bin/javac', [
			directory
		]);
		
		return new Promise(function(resolve, reject) {
			spw.stdout.on('data', function(out) {
				console.log('compile out', out.toString('utf8'));
			});

			spw.stderr.on('data', function(err) {
				console.log('compile err', err.toString('utf8'));
				// console.log('err', err.toString('ascii'));
			});
			
			spw.on('exit', (code) => {
				console.log('Compile Success ' + code);
				resolve(code);
			});
		});
	}

	java_excute = (execPath, className) => {
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
				console.log('excute out', out.toString('utf8'));
				result.output.push({
					type:'out',
					data: out.toString('utf8')
				});
			});
			spw.stderr.on('data', function(err) {
				console.log('excute err', err.toString('utf8')); //err.toString('ascii'));
				result.output.push({
					type:'err',
					data: err.toString('utf8')
				});
			});
			spw.on('exit', (code) => {
				console.log('Excute Success', code);
				result.code = code;
				resolve(result);
			});
		});
	}

	c_compile = async (output, input) => {
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
			});

			spw.stderr.on('data', function(err) {
				// console.log('err', err);
				console.log('compile err', err.toString('utf8'));
			});
			
			spw.on('exit', (code) => {
				console.log('Compile Success ' + code);
				resolve(code);
			});
		});
	}

	c_excute = (execPath) => {
		var spw = child.spawn(execPath, []);

		return new Promise(function(resolve, reject) {
			let result = {
				code: -1,
				output: []
			}

			spw.stdout.on('data', function(out) {
				console.log('excute out', out.toString('utf8'));
				result.output.push({
					type:'out',
					data: out.toString('utf8')
				});
			});
			spw.stderr.on('data', function(err) {
				console.log('excute err', err.toString('utf8')); //err.toString('ascii'));
				result.output.push({
					type:'err',
					data: err.toString('utf8')
				});
			});
			spw.on('exit', (code) => {
				console.log('Excute Success', code);
				result.code = code;
				resolve(result);
			});
		});
	}


	excute = async (studentId, taskIdx, code, language) => {

	}

	submission = async (studentId, taskIdx, code, language) => {
		let userDirectory = "Submission/" + studentId;
		let taskDirectory = userDirectory  + "/" + taskIdx;
		let output = null;

		if(language === 'c' || language === 'c++') {
			let outputPath = taskDirectory + '/c_output';
			this.studentInit(userDirectory, taskDirectory, "main.cpp", code);
			
			let compileOutput = await this.c_compile(outputPath, taskDirectory + '/main.cpp');
			output = await this.c_excute(outputPath);
		} else if(language === 'java') {
			// 자바의 경우 클래스 이름과 파일 이름이 같아야함
			let classNameRegex = /(?<=class)(\s)*([a-zA-Z]).*(?=\{)/gi;
			let className = code.match(classNameRegex)[0].trim();
			let fileName = className + ".java"; 

			console.log(className, fileName);
			
			this.studentInit(userDirectory, taskDirectory, fileName, code);

			let compileOutput = await this.java_compile(taskDirectory + '/' + fileName);
			output = await this.java_excute(taskDirectory + '/', className);
		} else if(language === 'python') {
			// fileName = "main.py";
		} else if(language === 'html') {
			// fileName = "index.html";
		}
		
		return output;
	}

	
}

const builder = new Builder();

module.exports = builder;