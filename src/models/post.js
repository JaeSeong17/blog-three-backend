import mongoose, { Schema } from 'mongoose';

const PostSchema = new Schema({
  title: String,
  body: String,
  tags: [String], // 문자열로 이루어진 배열
  publishedDate: {
    type: Date,
    default: Date.now, // 현재 날짜를 기본값으로 설정
  },
  user: {
    _id: mongoose.Types.ObjectId,
    username: String,
  },
});

PostSchema.index({ title: 'text' });

PostSchema.virtual('comments', {
  ref: 'Comment',
  localField: '_id',
  foreignField: 'postId'
});

// 모델 생성 model(schema name, schema object)
const Post = mongoose.model('Post', PostSchema);
export default Post;
