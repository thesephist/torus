// Generations documentation from //> comments
//  in torus source files.

const fs = require('fs');
const path = require('path');
const marked = require('marked');
const mkdirp = require('mkdirp');

const index = fs.readFileSync('./doc/index.html', 'utf8');
const css = fs.readFileSync('./doc/main.css', 'utf8');
const template = fs.readFileSync('./doc/template.html', 'utf8');

const ANNOTATION_START = '//>';
const ANNOTATION_CONTINUE = '//';
const FILES_TO_ANNOTATE = {
    'API Documentation': './samples/api.js',
    'torus.js': './src/torus.js',
    'jdom.js': './src/jdom.js',
    'Hacker News Reader': './samples/hn-reader/main.js',
    'Graphing Calculator demo': './samples/graph-calc/main.js',
    'Markdown Parser demo': './samples/markus/main.js',
    'Slide deck demo': './samples/slides/main.js',
    'Todo demo': './samples/todo/main.js',
    'Tabbed UI demo': './samples/tabs/main.js',
    'Search UI demo': './samples/searchbar/main.js',
}

const encodeHTML = code => {
    return code.replace(/[\u00A0-\u9999<>\&]/gim, i => {
        return '&#' + i.codePointAt(0) + ';';
    });
}

const markedOptions = {
    sanitize: true,
    sanitizer: encodeHTML,
}

const linesToRows = lines => {
    const linePairs = [];
    let docLine = '';

    let inAnnotationBlock = false;
    const pushPair = (codeLine, lineNumber) => {
        if (docLine) {
            const lastLine = linePairs[linePairs.length - 1];
            if (lastLine && lastLine[0]) {
                linePairs.push(['', '', '']);
            }
            linePairs.push([marked(docLine, markedOptions), encodeHTML(codeLine), lineNumber]);
        } else {
            linePairs.push(['', encodeHTML(codeLine), lineNumber]);
        }
        docLine = '';
    }

    const pushComment = line => {
        if (line.trim().startsWith(ANNOTATION_START)) {
            docLine = line.replace(ANNOTATION_START, '').trim();
        } else {
            docLine += ' ' + line.replace(ANNOTATION_CONTINUE, '').trim();
        }
    };

    lines.split('\n').forEach((line, idx) => {
        if (line.trim().startsWith(ANNOTATION_START)) {
            inAnnotationBlock = true;
            pushComment(line);
        } else if (line.trim().startsWith(ANNOTATION_CONTINUE)) {
            if (inAnnotationBlock) {
                pushComment(line)
            } else {
                pushPair(line, idx + 1);
            }
        } else {
            if (inAnnotationBlock) inAnnotationBlock = false;
            pushPair(line, idx + 1);
        }
    });

    return linePairs;
}

const buildAnnotatedPage = (title, linePairs) => {
    const lines = linePairs.map(([doc, source, lineNumber]) => {
        return `<div class="line"><div class="doc">${
            doc
        }</div><pre class="source javascript"><strong class="lineNumber">${
            lineNumber
        }</strong>${source}</pre></div>`;
    }).join('\n');

    return template
        .replace(/{{title}}/g, title)
        .replace(/{{lines}}/g, lines);
}

const buildIndex = indexPage => {
    const sources = Object.entries(FILES_TO_ANNOTATE).map(([name, sourcePath]) => {
        const errFn = err => console.error('Error building documentation page:', sourcePath, err);
        const fileName = `${name.replace(/\s+/g, '-').toLowerCase()}.html`;
        fs.readFile(sourcePath, 'utf8', (err, content) => {
            if (err) errFn(err);

            const annotatedPage = buildAnnotatedPage(name, linesToRows(content));
            fs.writeFile(path.join('./docs/', fileName), annotatedPage, 'utf8', err => {
                if (err) errFn(err);
            });
        });

        return `<p><a title="${name} annotated source" href="${fileName}">${name}</a></p>`;
    });

    return indexPage.replace(/{{sources}}/, sources.join('\n'));
}

mkdirp.sync('./docs/');
fs.writeFile('./docs/index.html', buildIndex(index), 'utf8', (err) => {
    if (err) console.error('Error writing index page', err);
});
fs.writeFile('./docs/main.css', css, 'utf8', (err) => {
    if (err) console.error('Error writing main.css', err);
});

