import Router from 'koa-router';
import * as postsCtrl from './posts.ctrl';
import * as commentsCtrl from './comments.ctrl';
import checkLoggedIn from '../../lib/checkedLoggedIn';

const posts = new Router();

posts.get('/', postsCtrl.list);
posts.post('/', checkLoggedIn, postsCtrl.write);
posts.get('/searchPosts', postsCtrl.searchPosts);

// posts.get('/comment', postsCtrl.readComments);
posts.post('/comment', commentsCtrl.writeComment, commentsCtrl.readComments);
posts.delete('/comment/:id', commentsCtrl.removeComment, commentsCtrl.readComments);
posts.patch('/comment/:id', commentsCtrl.updateComment, commentsCtrl.readComments);

const post = new Router(); // /api/posts/:id 해당 경로를 위한 새로운 라우터를 만들어 사용하면 id 식별자를 따로 받지 않아도 된다.
post.get('/', postsCtrl.read);
post.delete('/', checkLoggedIn, postsCtrl.checkOwnPost, postsCtrl.remove);
post.patch('/', checkLoggedIn, postsCtrl.checkOwnPost, postsCtrl.update);

posts.use('/:id', postsCtrl.getPostById, post.routes());

export default posts;
