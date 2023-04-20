import jwt from 'jsonwebtoken';
// import User from '../models/user';

const jwtMiddleware = async (ctx, next) => {
  const token = ctx.cookies.get('access_token');
  if (!token) return next(); // 토큰이 없음
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    ctx.state.user = {
      _id: decoded._id,
      username: decoded.username,
    };

    //토큰의 남은 기간이 3일 이하일 경우 새 토큰 발행
    // const now = Math.floor(Date.now() / 1000);
    // if (decoded.exp - now < 60 * 60 * 24 * 3.5) {
    //   console.log('reissue token')
    //   const user = await User.findById(decoded._id);
    //   const token = user.generateToken();
    //   ctx.cookies.set('access_token', token, {
    //     maxAge: 1000 * 60 * 60 * 24 * 7, // 7일
    //     httpOnly: true,
    //     secure: true,
    //     sameSite: 'none'
    //   });
    // }
    return next();
  } catch (e) {
    //토큰 검증 실패
    console.log('fail to check token');
    return next();
  }
};

export default jwtMiddleware;
