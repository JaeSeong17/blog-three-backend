require('dotenv').config();
import Koa from 'koa';
import Router from 'koa-router';
import bodyParser from 'koa-bodyparser';
import mongoose from 'mongoose'

import api from './api';
import jwtMiddleware from './lib/jwtMiddleware';
const cors = require('@koa/cors');

// 비구조화 할당을 통해 process.env 내부 값에 대한 레퍼런스 만들기
const { PORT, MONGO_URI } = process.env;

mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log('Connected to MongoDB');
  })
  .catch(e => {
    console.error(e);
  });


const app = new Koa();
const router = new Router();

//라우터 설정
router.use('/api', api.routes()); //api 라우트 적용

// 미들웨어 붙이기
// 라우터 적용 전에 bodyparser 적용
// ( http 요청 Request body 에 JSON 객체를 담아 서버에 보내면 자동적으로 서버에서 해당 JSON 객체 파싱 작업 진행)
app.use(cors({
  origin: '*',
  credentials: true, // 쿠키 사용 여부
}));
app.use(bodyParser());
app.use(jwtMiddleware);

// app 인스턴스에 라우터 적용
app.use(router.routes()).use(router.allowedMethods());

// const buildDirectory = path.resolve(__dirname, '../../blog-frontend/build');
// app.use(serve(buildDirectory));
// app.use(async ctx => {
//   // Not Found이고, 주소가 /api 로 시작하지 않는 경우
//   if (ctx.status === 404 && ctx.path.indexOf('/api') !== 0) {
//     // index.html 내용을 반환
//     await send(ctx, 'index.html', { root: buildDirectory });
//   }
// });

const port = PORT || 4000;
app.listen(port, () => {
  console.log('Listening to port %d', port);
});