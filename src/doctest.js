'use strict';

const fs = require('fs');
const assert = require("assert");
const vm = require('vm');
const ts = require("typescript");

const chalk = require('chalk');

const parseCodeSnippets = require('./parse-code-snippets-from-markdown');

function runTests (files, config) {
  const results = files
    .map(read)
    .map(parseCodeSnippets)
    .map(testFile(config));

  return flattenArray(results);
}

function read (fileName) {
  return {contents: fs.readFileSync(fileName, 'utf8'), fileName};
}

function makeTestSandbox (config) {
  function sandboxRequire (moduleName) {
    for (let regexRequire in config.regexRequire) {
      const regex = new RegExp(regexRequire);

      const match = regex.exec(moduleName);
      const handler = config.regexRequire[regexRequire];

      if (match) {
        return handler(...match);
      }
    }

    if (config.require[moduleName] === undefined) {
      throw moduleNotFoundError(moduleName);
    }

    return config.require[moduleName];
  }

  const logStack = []

  const sandboxConsole = {
    log: (...value) => logStack.push(value)
  };

  const sandboxGlobals = {
    __consolePop: () => consoleLogArgsToString(logStack.shift() || []),
    __assertEqual: assert.deepEqual,
    require: sandboxRequire, 
    console: sandboxConsole
  };
  const sandbox = Object.assign({}, sandboxGlobals, config.globals);

  return sandbox;
}

function consoleLogArgsToString(args) {
  return args.map(arg => 
    typeof arg === 'object'
       ? JSON.stringify(arg) 
       : arg
  ).join(' ')
}

function testFile (config) {
  return function testFileWithConfig (args) {
    const codeSnippets = args.codeSnippets;
    const fileName = args.fileName;
    const shareCodeInFile = args.shareCodeInFile;

    let results;

    if (shareCodeInFile) {
      const sandbox = makeTestSandbox(config);
      results = codeSnippets.map(test(config, fileName, sandbox));
    } else {
      results = codeSnippets.map(test(config, fileName));
    }

    return flattenArray(results);
  };
}

function test (config, filename, sandbox) {
  return (codeSnippet) => {
    if (codeSnippet.skip) {
      return {status: 'skip', codeSnippet, stack: ''};
    }

    let success = false;
    let stack = '';

    let code = codeSnippet.code;
    let perSnippetSandbox;

    if (sandbox === undefined) {
      perSnippetSandbox = makeTestSandbox(config);
    }

    if (config.beforeEach) {
      config.beforeEach();
    }

    try {
      code = ts.transpileModule(codeSnippet.code, {
        reportDiagnostics: false,
        compilerOptions: {
          target: ts.ScriptTarget.ES2016,  // supported by node.js stable release
          module: ts.ModuleKind.CommonJS,
        }
      }).outputText;

      vm.runInNewContext(code, perSnippetSandbox || sandbox);

      success = true;
    } catch (e) {
      stack = e.stack || '';
    }

    const status = success ? 'pass' : 'fail';

    process.stdout.write(success ? chalk.green('.') : chalk.red('x'));

    return {status, codeSnippet, stack};
  };
}

function flattenArray (array) {
  return array.reduce((a, b) => a.concat(b), []);
}

function printResults (results) {
  results
    .filter(result => result.status === 'fail')
    .forEach(printFailure);

  const passingCount = results.filter(result => result.status === 'pass').length;
  const failingCount = results.filter(result => result.status === 'fail').length;
  const skippingCount = results.filter(result => result.status === 'skip').length;

  function successfulRun () {
    return failingCount === 0;
  }

  console.log(chalk.green('Passed: ' + passingCount));

  if (skippingCount > 0) {
    console.log(chalk.yellow('Skipped: ' + skippingCount));
  }

  if (successfulRun()) {
    console.log(chalk.green('\nSuccess!'));
  } else {
    console.log(chalk.red('Failed: ' + failingCount));
  }
}

function printFailure (result) {
  console.log(chalk.red(`Failed - ${markDownErrorLocation(result)}`));

  const stackDetails = relevantStackDetails(result.stack);

  console.log(stackDetails);

  const variableNotDefined = stackDetails.match(/(\w+) is not defined/);

  if (variableNotDefined) {
    const variableName = variableNotDefined[1];

    console.log(`You can declare ${chalk.blue(variableName)} in the ${chalk.blue('globals')} section in ${chalk.grey('.markdown-doctest-setup.js')}`);

    console.log(`
For example:
${chalk.grey('// .markdown-doctest-setup.js')}
module.exports = {
  globals: {
    ${chalk.blue(variableName)}: ...
  }
}
    `);
  }
}

function relevantStackDetails (stack) {
  const match = stack.match(/([\w\W]*?)at eval/) ||
    stack.match(/([\w\W]*)at [\w*\/]*?doctest.js/);

  if (match !== null) {
    return match[1];
  }

  return stack;
}

function moduleNotFoundError (moduleName) {
  return new Error(`
Attempted to require '${chalk.blue(moduleName)}' but was not found in config.
You need to include it in the require section of your ${chalk.grey('.markdown-doctest-setup.js')} file.

For example:
${chalk.grey('// .markdown-doctest-setup.js')}
module.exports = {
  require: {
    ${chalk.blue(`'${moduleName}': require('${moduleName}')`)}
  }
}
  `);
}

function markDownErrorLocation (result) {
  const match = result.stack.match(/eval.*<.*>:(\d+):(\d+)/);

  if (match) {
    const mdLineNumber = parseInt(match[1], 10);
    const columnNumber = parseInt(match[2], 10);

    const lineNumber = result.codeSnippet.lineNumber + mdLineNumber;

    return `${result.codeSnippet.fileName}:${lineNumber}:${columnNumber}`;
  }

  return `${result.codeSnippet.fileName}:${result.codeSnippet.lineNumber}`;
}

module.exports = {printResults, runTests};
