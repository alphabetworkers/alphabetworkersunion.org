const path = require('path');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const HtmlWebPackPlugin = require("html-webpack-plugin");

const ASSETS_DIR = path.join('..', '.assets');

module.exports = {
  context: path.resolve(__dirname, 'src'),
  entry: './index.ts',
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
      {
        test: /\.s?css$/,
        use: [
          {
            loader: 'lit-scss-loader',
            options: {
              minify: true, // defaults to false
            },
          },
          'extract-loader',
          'css-loader',
          'sass-loader',
        ],
      },
    ],
  },
  devServer: {
    compress: true,
    port: 8000,
    historyApiFallback: true,
  },
  entry: {
    'script': './signup.ts',
    'style': './signup.scss',
  },
  mode: 'production',
  resolve: {
    extensions: ['.ts', '.scss', '.js'],
  },
  performance: {
    hints: false,
  },
  plugins: [
    new MiniCssExtractPlugin({
      filename: path.join(ASSETS_DIR, 'main.css'),
    }),
    new HtmlWebPackPlugin({
      template: "./index.html",
      filename: "./index.html",
    }),
  ],
  output: {
    path: path.join(__dirname, 'dist'),
    filename: '[name].js'
  },
};
