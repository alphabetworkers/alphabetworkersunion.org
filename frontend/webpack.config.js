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
        exclude: /node_modules/,
      },
      {
        test: /\.s?css$/,
        exclude: /element\//,
        use: [
          MiniCssExtractPlugin.loader,
          'css-loader',
          'resolve-url-loader',
          'sass-loader',
        ],
      },
      {
        test: /element\/.*\.scss$/,
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
      {
        test: /\.(woff|woff2|eot|ttf|otf|svg)$/i,
        exclude: /img/,
        type: 'asset/resource',
        generator: {
          filename: path.join('fonts', '[hash][ext][query]'),
        },
      },
      {
        include: path.resolve(__dirname, 'src', 'img'),
        exclude: [/selfies/, /img\/meet-the-union/, /static/],
        type: 'asset/resource',
        generator: {
          filename: path.join(ASSETS_DIR, '[file]'),
        },
      },
      {
        include: path.resolve(__dirname, 'src', 'img', 'static'),
        type: 'asset/resource',
        generator: {
          filename: '[file]',
        },
      },
      {
        include: path.resolve(__dirname, 'src', 'docs'),
        type: 'asset/resource',
        generator: {
          filename: '[file]',
        },
      },
      {
        test: /img\/meet-the-union\/.+\.(png|jpe?g)$/i,
        use: [
          {
            loader: 'file-loader',
            options: { name: '[path][name].[ext]' },
          },
          {
            loader: 'webpack-image-resize-loader',
            options: { width: 400 },
          },
        ],
      },
      {
        test: /selfies\/.+\.(png|jpe?g)$/i,
        use: [
          {
            loader: 'file-loader',
            options: { name: path.join(ASSETS_DIR, '[path][name].[ext]') },
          },
          {
            loader: 'webpack-image-resize-loader',
            options: {
              width: 200,
              format: 'jpeg',
            },
          },
        ],
      },
      {
        test: /favicon\.ico/i,
        type: 'asset/resource',
        generator: {
          filename: '[file]',
        },
      },
    ],
  },
  mode: 'production',
  resolve: {
    extensions: ['.ts'],
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
