const path = require('path');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

const ASSETS_DIR = path.join('..', '.assets');

module.exports = {
  context: path.resolve(__dirname, 'src'),
  entry: './index.ts',
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: 'ts-loader',
        exclude: /node_modules/
      },
      {
        test: /\.s?css$/,
        use: [{
          loader: 'lit-scss-loader',
          options: {
            minify: true, // defaults to false
          },
        }, 'extract-loader', 'css-loader', 'sass-loader'],
      },
    ],
  },
  mode: 'production',
  resolve: {
    extensions: ['.ts', '.scss'],
  },
  plugins: [
    new MiniCssExtractPlugin({
      filename: path.join(ASSETS_DIR, 'main.css'),
    }),
  ],
  output: {
    publicPath: '',
    filename: path.join(ASSETS_DIR, 'main.js'),
  },
};
