import { QueryEngineFactory } from "@comunica/query-sparql-link-traversal-solid";
import {LoggerPretty} from '@comunica/logger-pretty';

import { Command } from 'commander';

const program = new Command();
program
  .name('evaluation')
  .description('CLI program to run a TREE evaluation')
  .version('0.0.0')

  .requiredOption('-c, --config <string>', 'File path of the config')
  .requiredOption('-q, --query <string>', 'query to execute')

  .option('-t, --timeout <number>', 'Timeout of the query in second', 120)

  .parse(process.argv);

const options = program.opts();
const config = options.config;
const query = options.query.replaceAll('\\n', '');
const timeout = Number(options.timeout) * 1000;

const resp = await executeQuery(config, query, timeout)
console.log("response start");
console.log(JSON.stringify(resp));
console.log("response end");

async function executeQuery(configPath, query, timeout) {
  return new Promise(async (resolve) => {
    const engine = await new QueryEngineFactory().create({ configPath });
    const results = [];
    const timeoutID = setTimeout(() => {
      console.log('Query timeout');
      resolve(
        {
          results: "TIMEOUT",
          execution_time: `TIMEOUT ${timeout}`
        }
      );
    }, timeout);

    const bindingsStream = await engine.queryBindings(query, {
      lenient: true,
      log: new LoggerPretty({ level: 'trace' }),
    });
    const start = new Date().getTime();

    bindingsStream.on('data', (binding) => {
      results.push(binding);
    });

    bindingsStream.on('error', (err) => {
      console.error(err);
      clearTimeout(timeoutID);
      resolve(
        {
          results: err,
          execution_time: undefined
        }
      );
    });

    bindingsStream.on('end', () => {
      const end = new Date().getTime();
      clearTimeout(timeoutID);
      resolve(
        {
          results,
          execution_time: end - start
        }
      );
    });
  })
}