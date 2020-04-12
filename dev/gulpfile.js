'use strict';

var fs = require('fs')
var path = require('path')
var gulp = require('gulp')
var gutil = require('gulp-util');
var uglify = require('gulp-uglify');
var less = require('gulp-less');
var cleanCSS = require('gulp-clean-css');
var concat = require('gulp-concat');
var rename = require('gulp-rename');

var styleDir = '../public/themes';
var styleDir2 = '../public/css';
var jsTinymceDir = '../public/tinymce';
var jsMdDir = '../public/md';

// 解析less
gulp.task('less', done => {
    gulp.src(styleDir + '/**/*.less')
        .pipe(less())
        .pipe(cleanCSS({compatibility: 'ie8', processImportFrom: ['!icon/iconfont.css', '!inhope-icon/style.css']}))
        .pipe(gulp.dest(styleDir))
        .pipe(gulp.dest(styleDir));

    gulp.src(styleDir2 + '/**/*.less')
        .pipe(less())
        .pipe(cleanCSS({compatibility: 'ie8', processImportFrom: ['!icon/iconfont.css', '!inhope-icon/style.css']}))
        .pipe(gulp.dest(styleDir2))
        .pipe(gulp.dest(styleDir2));

    gutil.log(gutil.colors.green('less ok'));
	done();
});

gulp.task('js', done => {
    gulp.src(jsTinymceDir + '/tinymce.js')
        .pipe(rename({suffix:'.min'}))
        .pipe(uglify({
            // 混淆变量名
            mangle: true,
            // 输出时将所有的中文转换为unicode
            output: {ascii_only: true}
            // 将所有压缩后的代码置于des/js/文件夹
        }))        
        .pipe(gulp.dest(jsTinymceDir));
    gutil.log(gutil.colors.green('js  ok'));
    done();
});

gulp.task('js2', done => {
    gulp.src(jsTinymceDir + '/plugins/leaui_mindmap/mindmap/main.js')
        .pipe(rename({suffix:'.min'}))
        .pipe(uglify({
            // 混淆变量名
            mangle: true,
            // 输出时将所有的中文转换为unicode
            output: {ascii_only: true}
            // 将所有压缩后的代码置于des/js/文件夹
        }))        
        .pipe(gulp.dest(jsTinymceDir + '/plugins/leaui_mindmap/mindmap/'));
    gutil.log(gutil.colors.green('js  ok'));
    done();
});

gulp.task('md', done => {
    gulp.src(jsMdDir + '/main-v2.js')
        .pipe(rename({suffix:'.min'}))
        .pipe(uglify({
            // 混淆变量名
            mangle: true,
            // 输出时将所有的中文转换为unicode
            output: {ascii_only: true}
            // 将所有压缩后的代码置于des/js/文件夹
        }))        
        .pipe(gulp.dest(jsMdDir));
    gutil.log(gutil.colors.green('js  ok'));
    done();
});

gulp.task('mce_nav_plugin', done => {
    gulp.src(jsTinymceDir + '/plugins/leanote_nav/plugin.js')
        .pipe(rename({suffix:'.min'}))
        .pipe(uglify({
            // 混淆变量名
            mangle: true,
            // 输出时将所有的中文转换为unicode
            output: {ascii_only: true}
            // 将所有压缩后的代码置于des/js/文件夹
        }))        
        .pipe(gulp.dest(jsTinymceDir + '/plugins/leanote_nav/'));
    gutil.log(gutil.colors.green('js  ok'));
    done();
});

// 开发服务
gulp.task('dev', gulp.series('less', function() {
    gulp.watch(styleDir + '/**/*.less', gulp.series('less'));
    gulp.watch(styleDir2 + '/**/*.less', gulp.series('less'));
}));

gulp.task('default', gulp.parallel('dev', 'js'));
