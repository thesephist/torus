// Karma configuration
// Generated on Wed Dec 12 2018 23:34:27 GMT-0800 (Pacific Standard Time)

module.exports = function(config) {
    config.set({

        frameworks: ['mocha', 'chai'],

        files: [
            'dist/torus.min.js',
            'dist/jdom.dev.js',
            'test/*.js'
        ],

        exclude: [
            '**/*.swp'
        ],

        reporters: [
            'mocha',
        ],

        port: 9876,

        colors: true,

        logLevel: config.LOG_INFO,

        // enable / disable watching file and executing tests whenever any file changes
        autoWatch: false,

        // available browser launchers: https://npmjs.org/browse/keyword/karma-launcher
        browsers: [
            'ChromeHeadless',
        ],

        // Continuous Integration mode
        // if true, Karma captures browsers, runs the tests and exits
        singleRun: true,

        // Concurrency level
        // how many browser should be started simultaneous
        concurrency: Infinity,
    });
}
