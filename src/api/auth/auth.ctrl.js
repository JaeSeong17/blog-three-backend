import Joi from '../../../node_modules/joi/lib/index';
import User from '../../models/user';
import TempUser from '../../models/tempUser';
import * as nodeMailer from 'nodemailer';
import ejs from 'ejs';
const path = require('path');

// Post /api/auth/register
// {
//     username: 'jason',
//     email: 'jason@gmail.com',
//     password: 'mypass123'
// }

export const register = async (ctx, next) => {
  // Request Body 검증
  const schema = Joi.object().keys({
    email: Joi.string().required(),
    username: Joi.string().alphanum().min(3).max(20).required(),
    password: Joi.string().required(),
  });
  const result = schema.validate(ctx.request.body);
  if (result.error) {
    ctx.status = 400;
    ctx.body = result.error;
    return;
  }

  const { email, username } = ctx.request.body;
  try {
    const emailExists = await User.findByEmail(email);
    if (emailExists) {
      ctx.body = { message: '이미 존재하는 메일입니다.' };
      ctx.status = 409;
      return;
    }
    const usernameExists = await User.findByUsername(username);
    if (usernameExists) {
      ctx.body = { message: '이미 존재하는 닉네임입니다.' };
      ctx.status = 409;
      return;
    }
    const tempExists = await TempUser.findByEmail(email);
    if (tempExists) {
      await TempUser.deleteOne({ email: tempExists.email });
    }
    return next();
  } catch (e) {
    ctx.throw(500, e);
  }
};

export const sendVerificationMail = async (ctx) => {
  // 인증번호 생성
  let code = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  for (let i = 0; i < 4; i++) {
    const randomIndex = Math.floor(Math.random() * possible.length);
    code += possible.charAt(randomIndex);
  }

  // 메일 생성
  const mailHTML = await ejs.renderFile(
    path.join(__dirname, '../../lib/verificationMail.ejs'),
    {
      verifyCode: code,
    },
  );

  const transporter = nodeMailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GOOGLE_SMTP_USER_ID,
      pass: process.env.GOOGLE_SMTP_APP_PW,
    },
  });
  const mailOptions = {
    to: ctx.request.body.email,
    subject: 'JSDB 가입 인증 메일',
    html: mailHTML,
  };
  try {
    await transporter.sendMail(mailOptions);
    const { email, username, password } = ctx.request.body;
    const tempUser = new TempUser({
      username,
      email,
      code,
    });
    await tempUser.setPassword(password); // 패스워드 설정
    await tempUser.save(); //데이터 베이스 저장

    ctx.body = tempUser.serialize();
    ctx.status = 201; // created
  } catch (e) {
    ctx.body = { message: '유효한 메일이 아닙니다.' };
    ctx.status = 500;
    console.log(e);
  }
};

export const verification = async (ctx) => {
  const { email, code: inputCode } = ctx.request.body;
  const exists = await TempUser.findByEmail(email);
  if (!exists) {
    ctx.body = { message: '메일을 찾을 수 없습니다.' };
    ctx.status = 404; // Not Found
    return;
  }

  const codeMatch = exists.checkCode(inputCode);
  if (!codeMatch) {
    ctx.body = { message: '코드가 일치하지 않습니다.' };
    ctx.status = 401; // Unauthorized 코드 불일치
    return;
  }
  try {
    const user = await User({
      username: exists.username,
      email: exists.email,
      hashedPassword: exists.hashedPassword,
    });
    await user;
    await user.save();
    await TempUser.deleteOne({ email: exists.email });
    ctx.body = user.serialize();
    ctx.status = 201; // 승인 완료 및 계정 생성 완료
  } catch (e) {
    ctx.body = { message: '계정생성에 실패했습니다.' };
    ctx.status = 401; // Unauthorized
  }
};

export const login = async (ctx) => {
  const { email, password } = ctx.request.body;

  //email, password가 없으면 에러 처리 -> 값이 제대로 전달 안됐을 때 체크
  if (!email || !password) {
    ctx.status = 401; // Unauthorized
    return;
  }

  try {
    const user = await User.findByEmail(email);

    // 계정이 존재하지 않으면 에러 처리  -> 해당 계정 정보가 없을 때 체크
    if (!user) {
      ctx.status = 401;
      ctx.body = { message: '존재하지 않는 계정입니다.' };
      return;
    }
    const valid = await user.checkPassword(password);

    // 잘못된 비밀번호
    if (!valid) {
      ctx.status = 401;
      ctx.body = { message: '잘못된 비밀번호입니다.' };
      return;
    }

    ctx.body = user.serialize();

    // const protocol = ctx.request.headers['x-forwarded-proto'] || ctx.protocol;
    // console.log(`Received ${protocol} request on ${ctx.method} ${ctx.url}`);
    const token = user.generateToken();
    ctx.cookies.set('jsdb_access_token', token, {
      maxAge: 1000 * 60 * 60 * 24 * 7, // 7일
      httpOnly: true,
      secure: true,
      sameSite: 'none',
    });
    // console.log(`${ctx.method} ${ctx.url} ${ctx.response.status}`);
  } catch (e) {
    ctx.throw(500, e);
  }
};

export const check = async (ctx) => {
  const { user } = ctx.state;
  if (!user) {
    //로그인 중이 아님
    ctx.status = 401; //Unauthorized
    return;
  }
  const today = new Date();
  console.log('< ' + user.username + ' > loggedin ' + today);
  ctx.body = user;
};

export const logout = async (ctx) => {
  ctx.cookies.set('jsdb_access_token');
  ctx.status = 204;
};
