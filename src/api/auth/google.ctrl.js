import User from '../../models/user';
const { OAuth2Client } = require('google-auth-library');

export const verifyGoogleToken = async (ctx, next) => {
  const { googleToken } = ctx.request.body;
  const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

  try {
    const ticket = await client.verifyIdToken({
      idToken: googleToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    console.log(payload.name, payload.email);
    ctx.state.payload = payload;
    return next();
    // 검증 성공, 사용자 정보 반환 등의 작업 수행
  } catch (error) {
    // 검증 실패, 에러 처리 등의 작업 수행
    console.log(error);
  }
};

export const check = async (ctx) => {
  const { username, email, sub } = {
    username: ctx.state.payload.name,
    email: ctx.state.payload.email,
    sub: ctx.state.payload.sub,
  };
  // 회원 정보 확인
  try {
    const exists = await User.findByEmail(email);
    const user = new User({
      username,
      email,
    });
    await user.setPassword(sub); // 패스워드 설정
    if (!exists) {
      // 회원 정보 없으면 새로 등록
      await user.save(); //데이터 베이스 저장
    }
    // 응답할 데이터에서 hashedPassword 필드 제거
    ctx.body = user.serialize();

    const token = user.generateToken();
    ctx.cookies.set('access_token', token, {
      maxAge: 1000 * 60 * 60 * 24 * 7, // 7일
      httpOnly: true,
    });
  } catch (e) {
    ctx.throw(500, e);
  }

  // AccessToken 발급
};
