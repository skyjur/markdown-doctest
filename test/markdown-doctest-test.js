/* globals describe, it */
'use strict';

const path = require('path');

const assert = require('assert');

const doctest = require('../src/doctest');

const getTestFilePath = (testFile) => {
  return path.join(__dirname, '/test_files/', testFile);
};

describe('runTests', () => {
  it('pass', () => {
    const files = [getTestFilePath('pass.md')];

    const config = {};
    const results = doctest.runTests(files, config);

    const passingResults = results.filter(result => result.status === 'pass');

    assert.equal(passingResults.length, 1);
  });

  it('fail', () => {
    const files = [getTestFilePath('fail-with-text.md')];
    const config = {};
    const results = doctest.runTests(files, config);

    const passingResults = results.filter(result => result.status === 'pass');
    const failingResults = results.filter(result => result.status === 'fail');

    assert.equal(passingResults.length, 1, JSON.stringify(results, null, 2));
    assert.equal(failingResults.length, 2);
  });

  it('skip', () => {
    const files = [getTestFilePath('skip.md')];
    const config = {};
    const results = doctest.runTests(files, config);

    const passingResults = results.filter(result => result.status === 'pass');
    const failingResults = results.filter(result => result.status === 'fail');
    const skippedResults = results.filter(result => result.status === 'skip');

    assert.equal(passingResults.length, 1);
    assert.equal(failingResults.length, 0);
    assert.equal(skippedResults.length, 1);
  });

  it('config', () => {
    const files = [getTestFilePath('require-override.md')];
    const config = {
      require: {
        lodash: {range: () => []}
      }
    };

    const results = doctest.runTests(files, config);

    const passingResults = results.filter(result => result.status === 'pass');
    const failingResults = results.filter(result => result.status === 'fail');
    const skippedResults = results.filter(result => result.status === 'skip');

    assert.equal(passingResults.length, 1, results[0].stack);
    assert.equal(failingResults.length, 0);
    assert.equal(skippedResults.length, 0);
  });

  it('globals', () => {
    const files = [getTestFilePath('globals.md')];
    const config = {
      globals: {
        name: 'Nick'
      }
    };

    const results = doctest.runTests(files, config);

    const passingResults = results.filter(result => result.status === 'pass');
    const failingResults = results.filter(result => result.status === 'fail');
    const skippedResults = results.filter(result => result.status === 'skip');

    assert.equal(passingResults.length, 1, results[0].stack);
    assert.equal(failingResults.length, 0);
    assert.equal(skippedResults.length, 0);
  });

  it('es6', () => {
    const files = [getTestFilePath('es6.md')];
    const config = {};

    const results = doctest.runTests(files, config);

    const passingResults = results.filter(result => result.status === 'pass');
    const failingResults = results.filter(result => result.status === 'fail');
    const skippedResults = results.filter(result => result.status === 'skip');

    assert.equal(passingResults.length, 2, results[0].stack);
    assert.equal(failingResults.length, 0);
    assert.equal(skippedResults.length, 0);
  });

  it('joins tests', () => {
    const files = [getTestFilePath('environment.md')];
    const config = {};

    const results = doctest.runTests(files, config);

    const passingResults = results.filter(result => result.status === 'pass');
    const failingResults = results.filter(result => result.status === 'fail');
    const skippedResults = results.filter(result => result.status === 'skip');

    assert.equal(passingResults.length, 3, results[1].stack);
    assert.equal(failingResults.length, 0);
    assert.equal(skippedResults.length, 0);
  });

  it('supports regex imports', () => {
    const files = [getTestFilePath('require-override.md')];
    const config = {
      regexRequire: {
        'lo(.*)': function (fullPath, matchedName) {
          assert.equal(matchedName, 'dash');

          return {
            range: () => []
          };
        }
      }
    };

    const results = doctest.runTests(files, config);

    const passingResults = results.filter(result => result.status === 'pass');
    const failingResults = results.filter(result => result.status === 'fail');
    const skippedResults = results.filter(result => result.status === 'skip');

    assert.equal(passingResults.length, 1, results[0].stack);
    assert.equal(failingResults.length, 0);
    assert.equal(skippedResults.length, 0);
  });

  it('runs the beforeEach hook prior to each example', () => {
    const files = [getTestFilePath('before-each.md')];
    const a = {
      value: 0
    }

    const config = {
      globals: {
        a
      },

      beforeEach: () => a.value = 0
    };

    const results = doctest.runTests(files, config);

    const passingResults = results.filter(result => result.status === 'pass');
    const failingResults = results.filter(result => result.status === 'fail');
    const skippedResults = results.filter(result => result.status === 'skip');

    assert.equal(passingResults.length, 3, results[0].stack);
    assert.equal(failingResults.length, 0);
    assert.equal(skippedResults.length, 0);

    assert.equal(a.value, 1);
  });

  // es7 maybe some time later
  it.skip('supports stage 0 examples', () => {
    const files = [getTestFilePath('es7.md')];
    const config = {
      babel: {
        stage: 0
      },

      require: {
        assert
      }
    };

    const results = doctest.runTests(files, config);

    const passingResults = results.filter(result => result.status === 'pass');
    const failingResults = results.filter(result => result.status === 'fail');
    const skippedResults = results.filter(result => result.status === 'skip');

    assert.equal(passingResults.length, 1, results[0].stack);
    assert.equal(failingResults.length, 0);
    assert.equal(skippedResults.length, 0);
  });

  it('ignores json examples', () => {
    const files = [getTestFilePath('json.md')];
    const config = {};

    const results = doctest.runTests(files, config);

    const passingResults = results.filter(result => result.status === 'pass');
    const failingResults = results.filter(result => result.status === 'fail');
    const skippedResults = results.filter(result => result.status === 'skip');

    assert.equal(passingResults.length, 0);
    assert.equal(failingResults.length, 0);
    assert.equal(skippedResults.length, 0);
  });

  it('return value assertion - pass', () => {
    const files = [getTestFilePath('return-assertion-pass.md')];

    const config = {};
    const results = doctest.runTests(files, config);

    const passingResults = results.filter(result => result.status === 'pass');

    assert.equal(passingResults.length, 1, JSON.stringify(results, null, 2));
  });

  it('return value assertion - fail', () => {
    const files = [getTestFilePath('return-assertion-fail.md')];
    const config = {};
    const results = doctest.runTests(files, config);

    const passingResults = results.filter(result => result.status === 'pass');
    const failingResults = results.filter(result => result.status === 'fail');

    assert.equal(passingResults.length, 0, JSON.stringify(results, null, 2));
    assert.equal(failingResults.length, 1, JSON.stringify(results, null, 2));
  });

  it('log assertion - pass', () => {
    const files = [getTestFilePath('log-assertion-pass.md')];

    const config = {};
    const results = doctest.runTests(files, config);

    const passingResults = results.filter(result => result.status === 'pass');

    assert.equal(passingResults.length, 6, JSON.stringify(results, null, 2));
  });

  it('log assertion - fail', () => {
    const files = [getTestFilePath('log-assertion-fail.md')];
    const config = {};
    const results = doctest.runTests(files, config);

    const passingResults = results.filter(result => result.status === 'pass');
    const failingResults = results.filter(result => result.status === 'fail');

    assert.equal(passingResults.length, 0, JSON.stringify(results, null, 2));
    assert.equal(failingResults.length, 4, JSON.stringify(results, null, 2));
  });

  it('multiline output assertion - pass', () => {
    const files = [getTestFilePath('multiline-output-assertion-pass.md')];

    const config = {};
    const results = doctest.runTests(files, config);

    const passingResults = results.filter(result => result.status === 'pass');

    assert.equal(passingResults.length, 2, JSON.stringify(results, null, 2));
  });

  it('multiline output assertion - fail', () => {
    const files = [getTestFilePath('multiline-output-assertion-fail.md')];
    const config = {};
    const results = doctest.runTests(files, config);

    const passingResults = results.filter(result => result.status === 'pass');
    const failingResults = results.filter(result => result.status === 'fail');

    assert.equal(passingResults.length, 0, JSON.stringify(results, null, 2));
    assert.equal(failingResults.length, 2, JSON.stringify(results, null, 2));
  });
});
