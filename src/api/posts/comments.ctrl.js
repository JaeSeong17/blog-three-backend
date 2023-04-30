import Comment from '../../models/comment';
import Joi from '../../../node_modules/joi/lib/index';
import mongoose from 'mongoose';
import sanitizeHtml from 'sanitize-html';

const { ObjectId } = mongoose.Types;
const sanitizeOption = {
  allowedTags: [
    'h1',
    'h2',
    'b',
    'i',
    'u',
    's',
    'p',
    'ul',
    'ol',
    'il',
    'blockquote',
    'a',
    'img',
  ],
  allowedAttributes: {
    a: ['href', 'name', 'target'],
    img: ['src'],
    li: ['class'],
  },
  allowedSchema: ['data', 'http'],
};

export const readComments = async (ctx) => {
  // update와 remove 작업 이후 Comment 리스트를 새로 보내주기 위한 api
  try {
    ctx.body = await Comment.find({ postId: ctx.state.postId }).exec();
    // find 메서드는 Mongoose 쿼리를 반환하므로 클라이언트에 전달하려고 할때 JSON.stringify()가 발생
    // 따라서 exec로 실행하여 프로미스로 반환하도록 하자.
  } catch (e) {
    ctx.throw(500, e);
  }
};

export const writeComment = async (ctx, next) => {
  // POST /api/posts/comment
  // {
  //      postId: 댓글이 달릴 포스트 넘버
  //      body: '내용',
  // }
  const schema = Joi.object().keys({
    // 객체가 다음 필드를 가지고 있음을 검증
    postId: Joi.string().required(),
    body: Joi.string().required(),
  });

  // 검증 후 실패 처리
  const result = schema.validate(ctx.request.body);
  if (result.error) {
    ctx.status = 400; // Bad Request
    ctx.body = result.error;
    console.log(`Validation error: ${result.error}`);
    return;
  }

  const { postId, body } = ctx.request.body;
  const comment = new Comment({
    postId: ObjectId(postId),
    body: sanitizeHtml(body, sanitizeOption),
    user: ctx.state.user,
  });
  try {
    await comment.save();
    ctx.state.postId = postId;
    return next();
  } catch (e) {
    ctx.throw(500, e);
  }
};

export const removeComment = async (ctx, next) => {
  // DELETE /api/posts/comment/:id
  const { id } = ctx.params;
  try {
    let postId = null;
    await Comment.findById(id).then((comment) => {
      postId = comment.postId;
      return Comment.findByIdAndDelete(id);
    });
    // await Comment.findByIdAndRemove(id).exec();
    ctx.state.postId = postId;
    return next();
  } catch (e) {
    ctx.throw(500, e);
  }
};

export const updateComment = async (ctx, next) => {
  // PATCH /api/posts/comment/:id
  // {
  //     id: 댓글 아이디,
  //     body: '수정 내용',
  // }
  const { id } = ctx.params;

  const schema = Joi.object().keys({
    body: Joi.string(),
  });

  const result = schema.validate(ctx.request.body);
  if (result.error) {
    ctx.status = 400;
    ctx.body = result.error;
    return;
  }

  const nextData = { ...ctx.request.body };
  if (nextData.body) {
    nextData.body = sanitizeHtml(nextData.body, sanitizeOption);
  }
  try {
    const comment = await Comment.findByIdAndUpdate(id, nextData, {
      new: true, // 업데이트된 데이터를 반환할지 결정 하는 옵션
      // true: 업데이트 후 데이터 반환 / false: 업데이트 전 데이터 반환
    }).exec();
    if (!comment) {
      ctx.status = 404;
      return;
    }
    ctx.state.postId = comment.postId;
    return next();
  } catch (e) {
    ctx.throw(500, e);
  }
};
