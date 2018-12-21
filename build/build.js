// Strip out debug lines

const fs = require('fs');
const path = require('path');
const mkdirp = require('mkdirp');
const webpack = require('webpack');

function stripDebugParts(source) {
    let inDebugPart = false;
    let nextLineDebug = false;
    let strippedSource = '';

    const sourceLines = source.split('\n').filter(s => s.length);
    for (const line of sourceLines) {
        switch (line.trim()) {
            case '//@debug':
            case '// @debug':
                nextLineDebug = true;
                inDebugPart = false;
                break;
            case '//@begindebug':
            case '// @begindebug':
                nextLineDebug = false;
                inDebugPart = true;
                break;
            case '//@enddebug':
            case '// @enddebug':
                nextLineDebug = false;
                inDebugPart = false;
                break;
            default:
                if (nextLineDebug) {
                    nextLineDebug = false;
                } else if (inDebugPart) {
                    // do nothing
                } else {
                    strippedSource += line + '\n';
                }
        }
    }

    return strippedSource;
}

const webpackConfigs = {
    dev: {
        entry: './src/torus.js',
        mode: 'development',
        output: {
            path: path.resolve('./dist/'),
            filename: 'torus.dev.js',
        },
    },
    prod: {
        entry: './dist/torus.no-debug.js',
        mode: 'production',
        output: {

            path: path.resolve('./dist/'),
            filename: 'torus.min.js',
        },
    },
    jdom_dev: {
        entry: './src/jdom.js',
        mode: 'development',
        output: {
            path: path.resolve('./dist/'),
            filename: 'jdom.dev.js',
        },
    },
    jdom_prod: {
        entry: './src/jdom.js',
        mode: 'production',
        output: {
            path: path.resolve('./dist/'),
            filename: 'jdom.min.js',
        },
    },
}

// copy torus without debug statements
const torusSource = fs.readFileSync('./src/torus.js', 'utf8');
mkdirp.sync('./dist/');
const torusSourceNoDebug = stripDebugParts(torusSource);
fs.writeFile('./dist/torus.no-debug.js', torusSourceNoDebug, 'utf8', (err) => {
    if (err) console.error('Error writing no-debug file', err);

    for (const [name, config] of Object.entries(webpackConfigs)) {
        webpack(config, (err, stats) => {
            if (err || stats.hasErrors()) {
                console.log('Webpack build error', err);
            }
            console.log('Build information: ', name);
            console.log(stats.toString());
        });
    }
});

