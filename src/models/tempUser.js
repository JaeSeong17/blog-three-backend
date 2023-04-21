import mongoose, { Schema } from 'mongoose';
import bcrypt from 'bcrypt';

const TempUserSchema = new Schema({
  username: String,
  hashedPassword: String,
  email: String,
  code: String,
});

// 인스턴스 메서드
TempUserSchema.methods.setPassword = async function (password) {
  const hash = await bcrypt.hash(password, 10);
  this.hashedPassword = hash;
};

TempUserSchema.methods.checkPassword = async function (password) {
  const result = await bcrypt.compare(password, this.hashedPassword);
  return result; // true / false
};

TempUserSchema.methods.serialize = function () {
  const data = this.toJSON();
  delete data.hashedPassword;
  delete data.code;
  return data;
};

TempUserSchema.methods.checkCode = function (input) {
  return this.code === input;
};

// 스태틱 메서드
TempUserSchema.statics.findByEmail = function (email) {
  return this.findOne({ email });
};

const User = mongoose.model('TempUser', TempUserSchema);
export default User;
