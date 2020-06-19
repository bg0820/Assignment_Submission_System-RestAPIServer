
const jwt = require('jsonwebtoken');
const jConfig = require('../secretConfig.json');
const pool = require('../DB');
const Builder = require('../Models/Builder');

/*
{ 
   token: '',
   type: 'chat',
   data: {
      courseIdx: ,
      userIdx: ,
      chat: 
      type: 'qna/notice'
   }
}
*/

/*
{
   token: '',
   type: 'join/exit',
   data: {
      courseIdx: ''
   }      
}
*/

module.exports = function (http) {
   const io = require('socket.io')(http, {
      transports: ['polling', 'websocket']
   });

   io.on('connection', (socket) => {
      var socketId = socket.id;
      var clientIp = socket.request.connection.remoteAddress;
      console.log("[" + socketId + "] Conn " + clientIp);

      socket.on('message', async (msg) => {
         console.log(msg);
         jwt.verify(msg.token, jConfig.jtokenSecretKey, async function (err, decoded) {
            let tokenDecode = decoded;
			if(msg.type === 'code_exec') {
				// 코드 실행
				Builder.submission(socket, msg.data.studentId, msg.data.taskIdx, msg.data.code, msg.data.language);
			} else if(msg.type === 'code_submission') {
				// 코드 제출
			}
            else if (msg.type === 'join') {
               /*
                  3번강의 에 들어온사용자 있으면 
                  3_chat
               */
               socket.join(msg.data.courseIdx + '_chat');
            } else if (msg.type === 'chat') {
               let response = {
                  type: 'chat',
                  data: {
						userIdx: tokenDecode.userIdx,
						type: msg.data.type,
						userName: tokenDecode.name,
						time: new Date(),
						chat: msg.data.chat,
						courseIdx: msg.data.courseIdx
                  }
               };
               // TODO: 채팅 들어온내용 DB 에 저장
               try {
                  con = await pool.getConnection();
                  // 0 = notice. 1 = qma
                  const query = "INSERT INTO chatLog (courseIdx, userIdx, sendTime, content, chatType) values (?, ?, CURRENT_TIMESTAMP, ?, ?)";
                  await pool.query(con, query, [response.data.courseIdx, tokenDecode.userIdx, 
                     response.data.chat, response.data.type == 'notice' ? false : true]);
            
               } catch (error) {
                  console.log('에러났을때 처리하는 부분', error);
               } finally {
                  con.release();
               }

               io.to(msg.data.courseIdx + '_chat').emit(msg.data.courseIdx +'_chat_' + msg.data.type, response);
            } else if (msg.type === 'exit') {
               socket.leave(msg.data.courseIdx + '_chat');
            }

         });

         socket.on('disconnect', (reason) => {
            console.log("[" + socketId + "] DisConn " + clientIp + ', Reason : ' + reason);

            if (reason === 'io server disconnect') {
               socket.connect();
               console.log("[" + socketId + "] ReConn " + clientIp);
            }
         });

         socket.on("error", function (error) {
            console.log('error : ' + error);
         });
      });
   });
   return io;
}

