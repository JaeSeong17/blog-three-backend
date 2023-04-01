const path = require('path');
const nodeExternals = require('webpack-node-externals');

module.exports = {
  mode: 'production',
  output: {
    filename: 'bundle.js', // 번들 파일 이름
    path: path.resolve(__dirname, 'dist') // 번들 파일 생성 경로
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: [
              ['@babel/preset-env', {
                useBuiltIns: 'usage',
                corejs: 3
              }]
            ]
          }
        }
      }
    ]
  },
  entry: ['@babel/polyfill', './src/index.js'],
  target: 'node',
  resolve: {
    alias: {
      'core-js/modules/es.array.slice': path.resolve(__dirname, 'node_modules/core-js/modules/es.array.slice.js')
    }
  },
  externals: [nodeExternals()],
};