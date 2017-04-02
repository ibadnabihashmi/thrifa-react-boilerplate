var gulp = require('gulp');
var gutil = require('gulp-util');
var gulpif = require('gulp-if');
var argv = require('yargs').argv;
var browserify = require('browserify');
var babelify = require('babelify');
var watchify = require('watchify');
var source = require('vinyl-source-stream');
var autoprefixer = require('gulp-autoprefixer');
var sass = require('gulp-sass');
var csso = require('gulp-csso');
var buffer = require('vinyl-buffer');
var uglify = require('gulp-uglify');
var sourcemaps = require('gulp-sourcemaps');
var plumber = require('gulp-plumber');
var server = require('gulp-server-livereload');
var eslint = require('gulp-eslint');
var scsslint = require('gulp-scss-lint');

function lint() {
  return gulp.src(['app/**/*.js','!node_modules/**'])
    .pipe(plumber())
    .pipe(eslint())
    .pipe(eslint.format())
    .pipe(eslint.failAfterError());
}

gulp.task('sass', () => {
  return gulp.src('public/css/main.scss')
    .pipe(plumber())
    .pipe(sass())
    .pipe(autoprefixer())
    .pipe(gulpif(argv.production, csso()))
    .pipe(gulp.dest('public/css'));
});

gulp.task('react', () => {
  return browserify({ entries: 'app/main.js', debug: true })
    .transform('babelify', { presets: ['es2015', 'react'] })
    .bundle()
    .pipe(source('bundle.js'))
    .pipe(buffer())
    .pipe(sourcemaps.init({ loadMaps: true }))
    .pipe(gulpif(argv.production, uglify()))
    .pipe(sourcemaps.write('.'))
    .pipe(gulp.dest('public/js'));
});

gulp.task('watchify', () => {
  var bundler = watchify(browserify({ entries: 'app/main.js', debug: true }, watchify.args));
  bundler.transform('babelify', { presets: ['es2015', 'react'] });
  bundler.on('update', rebundle);
  bundler.on('update', lint);
  return rebundle();

  function rebundle() {
    var start = Date.now();
    return bundler.bundle()
      .on('error', function(err) {
        gutil.log(gutil.colors.red(err.toString()));
      })
      .on('end', function() {
        gutil.log(gutil.colors.green('Finished rebundling in', (Date.now() - start) + 'ms'));
      })
      .pipe(source('bundle.js'))
      .pipe(buffer())
      .pipe(sourcemaps.init({ loadMaps: true }))
      .pipe(sourcemaps.write('.'))
      .pipe(gulp.dest('public/js'));
  }
});

gulp.task('lint',lint);

gulp.task('serve' ,(done) => {

  gulp.src('public')
    .pipe(server({
      livereload: {
        enable: true,
        filter: function(filePath, cb) {
          if(/\/public\/js\/bundle.js/.test(filePath)) {
            cb(true)
          } else if(/\/public\/css\/main.css/.test(filePath)){
            cb(true)
          }
        }
      },
      open: true
    }));
});

gulp.task('watch', () => {
  gulp.watch('public/css/**/*.scss', ['sass','scss-lint']);
});

gulp.task('scss-lint', function() {
  return gulp.src('public/css/main.scss')
    .pipe(scsslint({
      'config': '.scss-lint.yml',
    }));
});

gulp.task('build', ['sass', 'react']);
gulp.task('default', ['build', 'watch', 'watchify', 'lint','scss-lint','serve']);
