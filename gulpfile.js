/*global require,process*/
var gulp = require('gulp');
var plugins = require('gulp-load-plugins')();
var config = require('../config.json');
var minimist = require('minimist');

var knownOptions = {
  string: ['env'],
  default: {
    env: process.env.NODE_ENV || 'pstest',
    'use-babel': true
  }
};

var options = minimist(process.argv.slice(2), knownOptions);

gulp.task('deploy', function () {
  return gulp.src('dist/web_root/scripts/**/*', {
    base: 'dist/web_root/'
  })
    .pipe(plugins.debug())
    .pipe(plugins.if(config.hasOwnProperty(options.env), plugins.sftp(config[options.env].deploy_credentials)));
});

gulp.task('build-then-deploy', function (callback) {
  return plugins.runSequence('build', 'deploy', callback);
});

gulp.task('watch', function (callback) {
  return gulp.watch('./web_root/**/*', ['build-then-deploy']);
});

gulp.task('build', ['babel'], function () {
  return gulp.src([
    './web_root/**/*',
    'plugin.xml',
    './test/lib/**/*',
    './test/*',
    '!web_root/scripts/**/*',
    '!test/*.js',
  ], {
      base: './'
    })
    .pipe(plugins.debug())
    .pipe(gulp.dest('dist'));
});

gulp.task('package', function () {
  return gulp.src([
    'dist/**',
    '!plugin.zip',
    '!dist/test',
    '!dist/test/**/*'
    ])
    .pipe(plugins.zip('plugin.zip'))
    .pipe(gulp.dest('dist'));
});

gulp.task('babel', function () {
  return gulp.src([
    './web_root/scripts/**/*',
    './test/**/*.js',
    '!test/**/lib/**'
  ], {
      base: './'
    })
    .pipe(plugins.debug())
    .pipe(plugins.if(options['use-babel'], plugins.babel()))
    .pipe(gulp.dest('dist'));
});

gulp.task('lint', function () {
  return gulp.src('src/**/*.js')
    .pipe(plugins.eslint())
    .pipe(plugins.eslint.format());
});
