import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default {
  mode: 'development',
  entry: './src/index.ts',
  output: {
    filename: 'index.js',
    path: path.resolve(__dirname, 'build'),
    library: {
      type: 'commonjs2'
    }
  },
  resolve: {
    extensions: ['.ts', '.js']
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: [
          {
            loader: 'ts-loader',
            options: {
              transpileOnly: true,
              compilerOptions: {
                noEmit: false,
                skipLibCheck: true,
                allowSyntheticDefaultImports: true,
              },
            },
          },
          'angular2-template-loader',
        ],
        exclude: /node_modules/,
      },
      {
        test: /\.pug$/,
        use: ['raw-loader', 'pug-plain-loader'],
      },
      {
        test: /\.html$/,
        use: 'raw-loader',
      },
      {
        test: /\.scss$/,
        use: [
          'to-string-loader',
          'css-loader',
          'sass-loader',
        ],
      },
      {
        test: /\.css$/,
        use: ['raw-loader'],
      },
    ],
  },
  externals: {
    '@angular/core': 'commonjs2 @angular/core',
    '@angular/common': 'commonjs2 @angular/common',
    '@angular/forms': 'commonjs2 @angular/forms',
    '@angular/animations': 'commonjs2 @angular/animations',
    '@ng-bootstrap/ng-bootstrap': 'commonjs2 @ng-bootstrap/ng-bootstrap',
    'tabby-core': 'commonjs2 tabby-core',
    'tabby-settings': 'commonjs2 tabby-settings',
    'tabby-terminal': 'commonjs2 tabby-terminal',
    rxjs: 'commonjs2 rxjs',
    'rxjs/operators': 'commonjs2 rxjs/operators',
    vscode: 'commonjs2 vscode',
  },
  devtool: 'source-map',
  target: 'node'
};
