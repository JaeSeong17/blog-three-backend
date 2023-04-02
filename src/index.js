// 이 파일에서만 no-global-assign ESLint 옵션을 비활성화
/* eslint-disable no-global-assign */

console.log('hello, this is three-blog server');
require = require('esm')(module /*, options */);
module.exports = require('./main.js');