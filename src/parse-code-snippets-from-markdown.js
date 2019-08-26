'use strict';

const isStartOfSnippet = line => line.trim().match(/```\W*(JavaScript|js|es6)\s?$/i);
const isEndOfSnippet = line => line.trim() === '```';
const isSkip = line => line.trim() === '<!-- skip-example -->';
const isCodeSharedInFile = line => line.trim() === '<!-- share-code-between-examples -->';

const lastLinePattern = () => /[^\n]+\r?\n$/m;
const returnAssertionPattern = () => /^\s*\/\/\s?\=\>(.+)\r?$/;
const outputAssertionPattern = () => /^\s*\/\/ output: (.+)\r?$/;
const isReturnAssertion = line => returnAssertionPattern().test(line);
const isOutputAssertion = line => outputAssertionPattern().test(line);

function startNewSnippet (snippets, fileName, lineNumber) {
  const skip = snippets.skip;
  snippets.skip = false;

  return Object.assign(snippets, {snippets: snippets.snippets.concat([
    {code: '', fileName, lineNumber, complete: false, skip}
  ])});
}

function addLineToLastSnippet (line) {
  return function addLine (snippets) {
    const lastSnippet = snippets.snippets[snippets.snippets.length - 1];

    if (lastSnippet && !lastSnippet.complete) {
      if(line.trim() === '/*') {
        lastSnippet.multiLineCommentOpen = true;
        lastSnippet.code += line + '\n';
      } else if(line.trim() === '*/') {
        lastSnippet.multiLineCommentOpen = false;
        lastSnippet.isMultiLineOutputAssertion = false;
        lastSnippet.code += line + '\n'
      } else if(lastSnippet.isMultiLineOutputAssertion && lastSnippet.multiLineCommentOpen) {
        lastSnippet.code += '*/' + buildOutputAssertion(line.trim()) + '/*\n';
      } else if(lastSnippet.isMultiLineOutputAssertion && !lastSnippet.multiLineCommentOpen) {
        if(line.trim().startsWith('//')) {
          lastSnippet.code += buildOutputAssertion(line.replace('//', '').trim());
        } else {
            lastSnippet.isMultiLineOutputAssertion = false;
            lastSnippet.code += line + '\n';
          }
      } else if(lastSnippet.multiLineCommentOpen && line.trim() === "output:") {
        lastSnippet.code += line + '\n';
        lastSnippet.isMultiLineOutputAssertion = true;
      } else if(line.trim() === "// output:") {
        lastSnippet.isMultiLineOutputAssertion = true;
        lastSnippet.code += line + '\n';
      } else {
        lastSnippet.code += line + '\n';
      }
    }

    return snippets;
  };
}

function buildOutputAssertion(expression) {
  return `__assertEqual(__consolePop(), '${expression.trim().replace(/'/g, '\'')}');\n`;
}

function addReturnAssertionToLastSnippet (line) {
  return function addLine (snippets) {
    const lastSnippet = snippets.snippets[snippets.snippets.length - 1];

    if (lastSnippet && !lastSnippet.complete) {
      lastSnippet.code = lastSnippet.code.replace(lastLinePattern(), lastLine => {
        const expression = line.match(returnAssertionPattern())[1];
        return 'var __returnValue=' + lastLine + '\n' 
          + `__assertEqual(__returnValue,${expression});\n`;
      })
    }

    return snippets;
  };
}

function addOutputAssertionToLastSnippet (line) {
  return function addLine (snippets) {
    const lastSnippet = snippets.snippets[snippets.snippets.length - 1];

    if (lastSnippet && !lastSnippet.complete) {
      const expression = line.match(outputAssertionPattern())[1];
      lastSnippet.code += buildOutputAssertion(expression);
    }

    return snippets;
  };
}

function addMultilineOutputAssertionToLastSnippet (line) {
  return function addLine (snippets) {
    const lastSnippet = snippets.snippets[snippets.snippets.length - 1];

    if (lastSnippet && !lastSnippet.complete) {
      const expression = line.match(outputAssertionPattern())[1];
      lastSnippet.code +=
        `__assertEqual(Array.from(__logStackPop() || [undefined]),[${expression.trim()}])\n`;
    }

    return snippets;
  };
}

function endSnippet (snippets, fileName, lineNumber) {
  const lastSnippet = snippets.snippets[snippets.snippets.length - 1];

  if (lastSnippet) {
    lastSnippet.complete = true;
  }

  return snippets;
}

function skip (snippets) {
  snippets.skip = true;

  return snippets;
}

function shareCodeInFile (snippets) {
  snippets.shareCodeInFile = true;

  return snippets;
}

function parseLine (line) {
  if (isStartOfSnippet(line)) {
    return startNewSnippet;
  }

  if (isEndOfSnippet(line)) {
    return endSnippet;
  }

  if (isSkip(line)) {
    return skip;
  }

  if (isCodeSharedInFile(line)) {
    return shareCodeInFile;
  }

  if(isReturnAssertion(line)) {
    return addReturnAssertionToLastSnippet(line);
  }

  if(isOutputAssertion(line)) {
    return addOutputAssertionToLastSnippet(line);
  }

  return addLineToLastSnippet(line);
}

function parseCodeSnippets (args) {
  const contents = args.contents;
  const fileName = args.fileName;

  const initialState = {
    snippets: [],
    shareCodeInFile: false,
    complete: false
  };

  const results = contents
    .split('\n')
    .map(parseLine)
    .reduce((snippets, lineAction, index) => lineAction(snippets, fileName, index + 1), initialState);

  const codeSnippets = results.snippets;

  const lastSnippet = codeSnippets[codeSnippets.length - 1];

  if (lastSnippet && !lastSnippet.complete) {
    throw new Error('Snippet parsing was incomplete');
  }

  return {
    fileName,
    codeSnippets,
    shareCodeInFile: results.shareCodeInFile
  };
}

module.exports = parseCodeSnippets;
