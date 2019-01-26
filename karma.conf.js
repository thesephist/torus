const IS_PROD = process.env.NODE_TEST_ENV === 'production';

let karmaFiles;
if (IS_PROD) {
    karmaFiles = [
        'dist/index.min.js',
        'test/*.js',
    ];
} else {
    karmaFiles = [
        'dist/torus.no-debug.js',
        'dist/jdom.dev.js',
        'test/*.js',
    ];
}

const coverageOptions = IS_PROD ? {} : {
    preprocessors: {
        'dist/**/*.js': ['coverage'],
    },
    coverageReporter: {
        type: 'html',
        dir: 'coverage/',
    },
};

module.exports = function (config) {
    config.set({

        frameworks: ['mocha', 'chai'],

        files: karmaFiles,

        exclude: [
            '**/*.swp',
        ],

        reporters: IS_PROD ? [
            'mocha',
        ] : [
            'mocha',
            'coverage',
        ],

        ...coverageOptions,

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
