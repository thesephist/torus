// Generations documentation from //> comments
//  in torus source files.

const fs = require('fs');
const marked = require('marked');
const mkdirp = require('mkdirp');

const template = fs.readFileSync('./doc/template.html', 'utf8');
const torusSource = fs.readFileSync('./src/torus.js', 'utf8');
const jdomSource = fs.readFileSync('./src/jdom.js', 'utf8');

const linesToRows = lines => {
    const linePairs = [];
    let docLine = '';

    let inDocComment = false;
    const pushPair = codeLine => {
        if (docLine) {
            linePairs.push([docLine, codeLine]);
        } else {
            linePairs.push(['', codeLine]);
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

    for (const line of lines.split('\n')) {
        if (line.trim().startsWith('//>')) {
            inDocComment = true;
            pushComment(line);
        } else if (line.trim().startsWith('//')) {
            if (inDocComment) {
                pushComment(line)
            } else {
                pushPair(line);
            }
        } else {
            if (inDocComment)  inDocComment = false;
            pushPair(line);
        }
    }

    return linePairs;
}

const buildAnnotatedPage = (title, linePairs) => {
    const lines = linePairs.map(([doc, source]) => {
        return `<div class="line"><div class="doc">${marked(doc)}</div><pre class="source">${source}</pre></div>`;
    }).join('\n');

    return template
        .replace(/{{title}}/g, title)
        .replace(/{{lines}}/g, lines);
}


mkdirp.sync('./docs/');

fs.writeFile('./docs/torus.html', buildAnnotatedPage('torus.js', linesToRows(torusSource)), 'utf8', (err) => {
    if (err) console.error('Error writing documentation page', err);
});
fs.writeFile('./docs/jdom.html', buildAnnotatedPage('jdom.js', linesToRows(jdomSource)), 'utf8', (err) => {
    if (err) console.error('Error writing documentation page', err);
});
