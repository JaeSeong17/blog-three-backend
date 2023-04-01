import Post from '../../models/post';
import Comment from '../../models/comment';
import mongoose from 'mongoose';
import Joi from '../../../node_modules/joi/lib/index';
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

export const getPostById = async (ctx, next) => {
  const { id } = ctx.params;
  if (!ObjectId.isValid(id)) {
    ctx.status = 400; //Bad Request
    return;
  }

  try {
    const post = await Post.findById(id).populate('comments').exec();
    //포스트 없을 때
    if (!post) {
      ctx.status = 404; // not found
      return;
    }
    ctx.state.post = post;
    ctx.state.comments = post.comments;
    return next();
  } catch (e) {
    ctx.throw(500, e);
  }
};

export const write = async ctx => {
  // POST /api/posts
  // {
  //     title: '제목',
  //     body: '내용',
  //     tags: ['태그1', '태그2']
  // }
  const schema = Joi.object().keys({
    // 객체가 다음 필드를 가지고 있음을 검증
    title: Joi.string().required(), // required()가 있으면 필수 항목
    body: Joi.string().required(),
    tags: Joi.array()
      .items(Joi.string())
      .required(), // 문자열로 이루어진 배열
  });

  // 검증 후 실패 처리
  const result = schema.validate(ctx.request.body);
  if (result.error) {
    ctx.status = 400; // Bad Request
    ctx.body = result.error;
    return;
  }

  const { title, body, tags } = ctx.request.body;
  const post = new Post({
    title,
    body: sanitizeHtml(body, sanitizeOption),
    tags,
    user: ctx.state.user,
  });
  try {
    await post.save();
    ctx.body = post;
  } catch (e) {
    ctx.throw(500, e);
  }
};

// html을 없애고 내용이 너무 길면 200자로 제한한느 함수
const removeHtmlAndShorten = body => {
  const filtered = sanitizeHtml(body, {
    allowedTags: [],
  });
  return filtered.length < 200 ? filtered : `${filtered.slice(0, 200)}...`;
}

export const list = async ctx => {
  // GET /api/posts
  // query는 문자열이기 때문에 숫자로 변환 필요
  // 값이 주어지지 않았다면 1을 기본으로 사용합니다.
  const page = parseInt(ctx.query.page || '1', 10);
  if (page < 1) {
    ctx.status = 400;
    return;
  }

  const { tag, username } = ctx.query;
  // tags username이 유효하면 객체 안에 넣고 아니면 거르기
  const query = {
    ...(username ? { 'user.username': username } : {}),         //tag username이 없을 경우 {} 빈객체를 할당해주지 않으면 undefined로 해석하고 mongoose가 찾지 못함
    ...(tag ? { tags: tag } : {}),
  };

  try {
    const posts = await Post.find(query)
      .sort({ _id: -1 })
      .limit(5)
      .skip((page - 1) * 5)
      // .lean()  데이터를 처음부터 mongoose 인스턴스가 아닌 JSON 형태로 불러옴
      .exec();
    const postCount = await Post.countDocuments(query).exec();
    ctx.set('Last-Page', Math.ceil(postCount / 5));        //커스텀 헤더, 마지막 페이지 정보 저장
    ctx.body = posts
      .map(post => post.toJSON())         //find로 조회한 데이터는 mongoose 문서 인스턴스 형태이므로 데이터 바로 변형 불가능 -> JSON 형태로 변환한 뒤 조작
      .map(post => ({
        ...post,
        body: removeHtmlAndShorten(post.body),
      }));
  } catch (e) {
    ctx.throw(500, e);
  }
};

export const read = async (ctx) => {
  // GET /api/posts/:id
  ctx.body = {
    post: ctx.state.post,
    comments: ctx.state.comments,
  };
};

// export const readComments = async ctx => {
//   const { postId } = ctx.state.post;
//   try {
//     const comments = await Post.findById(postId).populate('comments').exec();
//     ctx.body = {
//       ...
//       comments,
//     };
//   } catch (e) {
//     ctx.throw(500, e);
//   }
// }

export const remove = async ctx => {
  // DELETE /api/posts/:id
  const { id } = ctx.params;
  try {
    await Post.findByIdAndRemove(id).exec();
    await Comment.deleteMany({ postId: id }).exec();
    ctx.status = 204; // No Content (성공했지만 응답할 데이터가 없음)
  } catch (e) {
    ctx.throw(500, e);
  }
};

export const update = async ctx => {
  // PATCH /api/posts/:id
  // {
  //     title: '수정',
  //     body: '수정 내용',
  //     tags: ['수정', '태그']
  // }
  const { id } = ctx.params;

  const schema = Joi.object().keys({
    title: Joi.string(),
    body: Joi.string(),
    tags: Joi.array().items(Joi.string()),
  });

  const result = schema.validate(ctx.request.body);
  if (result.error) {
    ctx.status = 400;
    ctx.body = result.error;
    return;
  }

  const nextData = { ...ctx.request.body };
  if (nextData.body) {
    nextData.body = sanitizeHtml(nextData.body, sanitizeOption)
  }
  try {
    const post = await Post.findByIdAndUpdate(id, nextData, {
      new: true, // 업데이트된 데이터를 반환할지 결정 하는 옵션
      // true: 업데이트 후 데이터 반환 / false: 업데이트 전 데이터 반환
    }).exec();
    if (!post) {
      ctx.status = 404;
      return;
    }
    ctx.body = post;
  } catch (e) {
    ctx.throw(500, e);
  }
};

export const checkOwnPost = (ctx, next) => {
  const { user, post } = ctx.state;
  if (post.user._id.toString() !== user._id) {     //MongoDB 조회 데이터는 반드시 toString 필요
    ctx.status = 403;
    return;
  }
  return next();
}

export const checkOwnComment = (ctx, next) => {
  const { user, comment } = ctx.state;
  if (comment.user._id.toString() !== user._id) {     //MongoDB 조회 데이터는 반드시 toString 필요
    ctx.status = 403;
    return;
  }
  return next();
}

export const searchPosts = async ctx => {
  // GET /api/posts/searchPosts
  const page = parseInt(ctx.query.page || '1', 10);
  if (page < 1) {
    ctx.status = 400;
    return;
  }

  const keyword = ctx.query.keyword;

  const query = { title: new RegExp(keyword) };

  try {
    const post = await Post.find(query)
      .sort({ _id: -1 })
      .limit(5)
      .skip((page - 1) * 5)
      .exec();
    const postCount = await Post.countDocuments(query).exec();
    ctx.set('Last-Page', Math.ceil(postCount / 5));
    ctx.body = post
      .map(post => post.toJSON())         //find로 조회한 데이터는 mongoose 문서 인스턴스 형태이므로 데이터 바로 변형 불가능 -> JSON 형태로 변환한 뒤 조작
      .map(post => ({
        ...post,
        body: removeHtmlAndShorten(post.body),
      }));
  } catch (e) {
    ctx.throw(500, e);
  }
};
