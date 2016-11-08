const eslint = require('gulp-eslint');
const gulp = require('gulp');
const mocha = require('gulp-mocha');

gulp.task('lint', () =>
  gulp.src('./lib/**/*.js')
    .pipe(eslint())
    .pipe(eslint.format())
    .pipe(eslint.failAfterError()));

gulp.task('test', () =>
  gulp.src('./test/**/*.spec.js')
    .pipe(mocha()));

gulp.task('default', ['lint', 'test']);
