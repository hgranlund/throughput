const Benchmark = require('benchmark');
const { createReadStream, readFileSync } = require('fs');
const { devNullStream, toStream } = require('./testUtils');
const { compareWithPrev } = require('./benchmarkUtils');
const { JsonStream } = require('../src');

const toPerformanceTest = (obj, name, StreamClass = JsonStream) => {
  const test = deferred => {
    const stream = new StreamClass(obj());
    stream
      .on('end', () => deferred.resolve())
      .on('error', () => deferred.resolve());
    stream.pipe(devNullStream());
  };
  return { name, test };
};

const simpleJsonTest = toPerformanceTest(
  () => ({
    test: 1,
    test2: 'test',
    test3: [1, 2, 3],
  }),
  'simpleJson',
);

const jsonWith4MBStringStreamJsonStream = toPerformanceTest(
  () => ({
    lorem: createReadStream('./tests/data/loremIpsum-4mb.txt'),
  }),
  'jsonWith4MBStringStream',
);

const jsonWith4MBRawStreamJsonStream = toPerformanceTest(() => {
  const stream = createReadStream('./tests/data/loremIpsum-4mb.json');
  stream.jsonType = JsonStream.jsonTypes.raw;
  return { rawLorem: stream };
}, 'jsonWith4MBRawStream');

const hugeJson = JSON.parse(readFileSync('tests/data/quotes.json'));
const hugeJsonTest = toPerformanceTest(() => hugeJson, 'hugeJson');

const ha10k = new Array(10000).fill('sd');
const array10kTest = toPerformanceTest(() => ha10k, 'array10k');

const arrayStream10kTest = toPerformanceTest(
  () => toStream(ha10k, null, { objectMode: false }),
  'arrayStream10k',
);

const arrayObjectStream10kTest = toPerformanceTest(
  () => toStream(ha10k, null, { objectMode: true }),
  'arrayObjectStream10k',
);

const tests = [
  simpleJsonTest,
  jsonWith4MBStringStreamJsonStream,
  jsonWith4MBRawStreamJsonStream,
  hugeJsonTest,
  arrayStream10kTest,
  array10kTest,
  arrayObjectStream10kTest,
];

const longestName = tests.reduce(
  (longest, { name }) => Math.max(longest, name.length),
  0,
);

tests
  .reduce((suite, { name, test }) => {
    suite.add(name.padEnd(longestName, '.'), test, { defer: true });
    return suite;
  }, new Benchmark.Suite())
  .on('cycle', function(event) {
    console.log(String(event.target));
  })
  .on('complete', event => {
    compareWithPrev(event);
  })
  .run();
