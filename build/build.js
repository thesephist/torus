// Strip out debug lines

function stripDebugParts(source) {
    let inDebugPart = false;
    let nextLineDebug = false;
    let strippedSource = '';

    const sourceLines = source.split('\n').filter(s => s.length);
    for (const line in sourceLines) {
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
                    strippedSource += line;
                }
        }
    }
}

