const checkLoggedIn = (ctx, next) => {
  if (!ctx.state.user) {
    ctx.status = 401;
    console.log('check login error');
    return;
  }
  return next();
};

export default checkLoggedIn;