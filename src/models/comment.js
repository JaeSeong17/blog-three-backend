import mongoose, { Schema } from 'mongoose'

const CommentSchema = new Schema({
  postId: mongoose.Types.ObjectId,
  user: {
    _id: mongoose.Types.ObjectId,
    username: String,
  },
  publishedDate: {
    type: Date,
    default: Date.now,
  },
  body: String,
});

const Comment = mongoose.model('Comment', CommentSchema);
export default Comment;
