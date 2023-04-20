import Router from 'koa-router';
import * as authCtrl from './auth.ctrl';
import * as googleCtrl from './google.ctrl';

const auth = new Router();

auth.post('/register', authCtrl.register);
auth.post('/login', authCtrl.login);
auth.get('/check', authCtrl.check);
auth.post('/logout', authCtrl.logout);

const google = new Router();
google.post('/login', googleCtrl.verifyGoogleToken, googleCtrl.check);

auth.use('/google', google.routes());

export default auth;
