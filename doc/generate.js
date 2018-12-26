// Generations documentation from //> comments
//  in torus source files.

const fs = require('fs');
const marked = require('marked');
const mkdirp = require('mkdirp');

const index = fs.readFileSync('./doc/index.html', 'utf8');
const css = fs.readFileSync('./doc/main.css', 'utf8');
const template = fs.readFileSync('./doc/template.html', 'utf8');
const torusSource = fs.readFileSync('./src/torus.js', 'utf8');
const jdomSource = fs.readFileSync('./src/jdom.js', 'utf8');

const linesToRows = lines => {
    const linePairs = [];
    let docLine = '';

    let inDocComment = false;
    const pushPair = (codeLine, lineNumber) => {
        if (docLine) {
            linePairs.push([docLine, codeLine, lineNumber]);
        } else {
            linePairs.push(['', codeLine, lineNumber]);
        }
        docLine = '';
    }

    const pushComment = line => {
        if (line.trim().startsWith('//>')) {
            docLine = line.replace('//>', '').trim();
        } else {
            docLine += ' ' + line.replace('//', '').trim();
        }
    };

    lines.split('\n').forEach((line, idx) => {
        if (line.trim().startsWith('//>')) {
            inDocComment = true;
            pushComment(line);
        } else if (line.trim().startsWith('//')) {
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
        }</div><pre class="source javascript"><strong>${lineNumber}</strong>${source}</pre></div>`;
    }).join('\n');

    return template
        .replace(/{{title}}/g, title)
        .replace(/{{lines}}/g, lines);
}


mkdirp.sync('./docs/');

fs.writeFile('./docs/index.html', index, 'utf8', (err) => {
    if (err) console.error('Error writing index page', err);
});
fs.writeFile('./docs/main.css', css, 'utf8', (err) => {
    if (err) console.error('Error writing main.css', err);
});
fs.writeFile('./docs/torus.html', buildAnnotatedPage('torus.js', linesToRows(torusSource)), 'utf8', (err) => {
    if (err) console.error('Error writing documentation page', err);
});
fs.writeFile('./docs/jdom.html', buildAnnotatedPage('jdom.js', linesToRows(jdomSource)), 'utf8', (err) => {
    if (err) console.error('Error writing documentation page', err);
});
