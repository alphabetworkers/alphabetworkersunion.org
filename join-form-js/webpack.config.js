const path = require('path');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

const STATIC_DIR = '.static';
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
        test: /\.module\.s?css$/,
        use: [
          'style-loader',
          {
            loader: 'css-loader',
            options: {
              modules: true
            },
          },
          'sass-loader',
        ],
      },
      {
        test: /\.s?css$/,
        exclude: /\.module\.s?css$/,
        use: [
          'style-loader',
          'css-loader',
          'sass-loader',
        ],
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
    path: path.resolve(__dirname, STATIC_DIR),
  },
};
