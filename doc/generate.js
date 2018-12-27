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
    'torus.js': './src/torus.js',
    'jdom.js': './src/jdom.js',
    'Search demo': './samples/searchbar/main.js',
    'Todo demo': './samples/todo/main.js',
    'Tabbed UI demo': './samples/tabs/main.js',
}

const encodeHTML = code => {
    return code.replace(/[\u00A0-\u9999<>\&]/gim, i => {
        return '&#' + i.charCodeAt(0) + ';';
    })
}

const linesToRows = lines => {
    const linePairs = [];
    let docLine = '';

    let inDocComment = false;
    const pushPair = (codeLine, lineNumber) => {
        if (docLine) {
            const lastLine = linePairs[linePairs.length - 1];
            if (lastLine && lastLine[0]) {
                linePairs.push(['', '', '']);
            }
            linePairs.push([docLine, encodeHTML(codeLine), lineNumber]);
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
            inDocComment = true;
            pushComment(line);
        } else if (line.trim().startsWith(ANNOTATION_CONTINUE)) {
            if (inDocComment) {
                pushComment(line)
            } else {
                pushPair(line, idx + 1);
            }
        } else {
            if (inDocComment) inDocComment = false;
            pushPair(line, idx + 1);
        }
    });

    return linePairs;
}

const buildAnnotatedPage = (title, linePairs) => {
    const lines = linePairs.map(([doc, source, lineNumber]) => {
        return `<div class="line"><div class="doc">${
            marked(doc)
        }</div><pre class="source javascript"><strong class="lineNumber">${lineNumber}</strong>${source}</pre></div>`;
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
                if (err) errorFn(err);
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
