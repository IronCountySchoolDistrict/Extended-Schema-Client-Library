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

gulp.task('deploy', function() {
  return gulp.src('dist/web/scripts/**')
    .pipe(plugins.debug())
    .pipe(function() {
      var env = options.env;
      return plugins.if(config.hasOwnProperty(env), plugins.sftp(config[env].deploy_credentials));
    });
});

gulp.task('build-then-deploy', function(callback) {
  return plugins.runSequence('build', 'deploy', callback);
});

gulp.task('build', ['babel'], function() {
  return gulp.src([
      './web_root/**/*',
      'plugin.xml',
      '!/web_root/scripts/**/*'
    ], {
      base: './'
    })
    .pipe(plugins.debug())
    .pipe(gulp.dest('dist'));
});

gulp.task('package', function() {
  return gulp.src('dist/**')
    .pipe(plugins.zip('plugin.zip'))
    .pipe(gulp.dest('dist'));
});

gulp.task('babel', function() {
  return gulp.src([
      './web_root/scripts/**/*'
    ], {
      base: './'
    })
    .pipe(plugins.debug())
    .pipe(plugins.if(options['use-babel'], plugins.babel({
      'blacklist': 'useStrict',
      'modules': 'amd'
    })))
    .pipe(gulp.dest('dist'));
});

gulp.task('lint', function() {
  return gulp.src('src/**/*.js')
    .pipe(plugins.eslint())
    .pipe(plugins.eslint.format());
});
