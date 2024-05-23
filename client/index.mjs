import { readdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from "path";
import { spawnSync } from 'node:child_process';

const queryFolder = "./queries/parsed";
const queriesFile = readdirSync(queryFolder);
const queries = [];
const TIMEOUT = 1 * 60 * 1000;
const resultFolder = "result";
const MEMORY_SIZE = 8192 * 1.5;
const RESULT_REGEX = /response start\n(.*)\nresponse end/u;
const REPETITION = 50;
const HTTP_REQUEST_IDENTIFIER = "INFO: Requesting";


for (const file of queriesFile) {
  if (file.includes(".gitkeep")) {
    continue;
  }
  const fileCompletePath = join(queryFolder, file);
  queries.push([JSON.parse(readFileSync(fileCompletePath)), fileCompletePath]);
}

const configPaths = [
  ["./config_engine/config-solid-shape-index.json", "shape_index"],
  ["./config_engine/config-solid-default.json", "type_index"],

  //["./config_engine/config-solid-shape-index_info.json", "shape_index_info"],
  //["./config_engine/config-solid-default_info.json", "type_index_info"],
];


for (const [configPath, name] of configPaths) {
  const results = {};
  for (const [queryObject, queryName] of queries) {
    const currentResult = {};
    for (const [version, query] of Object.entries(queryObject)) {
      currentResult[version] = [];
      for (let i = 0; i < REPETITION - 1; ++i) {
        console.log(`New query started repetition(s) ${i} index ${queryName} version ${version} with engine ${configPath}`);
        const command = createCommand(configPath, query);
        try {
          const { stdout, stderr, error } = spawnSync(command[0], command[1], { timeout: TIMEOUT + 1000, maxBuffer: undefined });
          if (error && error.code === 'ETIMEDOUT') {
            currentResult[version] = {
              timeout: TIMEOUT,
            };
            results[queryName] = currentResult;
            const resultFile = `${name}_result.json`;
            writeFileSync(join(resultFolder, resultFile), JSON.stringify({ data: results }, null, 2));
            break;
          }
          const stdoutSerialized = JSON.parse(RESULT_REGEX.exec(String(stdout))[1]);
          stdoutSerialized["n_results"] = stdoutSerialized["results"].length;
          stdoutSerialized["n_http_requests"] = getInformationFromLog(String(stderr));
          currentResult[version].push(stdoutSerialized);
          await sleep(5000);
        } catch (err) {
          console.log("error happen");
          console.log(command);
          console.error(String(err));
          currentResult[version] = {
            error: String(err),
          };
          results[queryName] = currentResult;
          const resultFile = `${name}_result.json`;
          writeFileSync(join(resultFolder, resultFile), JSON.stringify({ data: results }, null, 2));
          break;
        }

        results[queryName] = currentResult;
        const resultFile = `${name}_result.json`;
        writeFileSync(join(resultFolder, resultFile), JSON.stringify({ data: results }, null, 2));
      }

    }
  }

}

function createCommand(configPath, query) {
  const command = "node";
  const formattedQuery = query.replace(/(\r\n|\n|\r)/gm, " ");

  const args = [
    `--max-old-space-size=${MEMORY_SIZE}`,
    './comunicaRunner.mjs',
    '-c', configPath,
    '-q', formattedQuery,
    '-t', TIMEOUT.toString()
  ];
  return [command, args];
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function getInformationFromLog(content) {
  let numberHttpRequest = 0;
  console.log(content);
  for (const line of content.split('\n')) {
    numberHttpRequest += fetchNumberOfHttpRequest(line);
  }
  return numberHttpRequest;
}

function fetchNumberOfHttpRequest(line) {
  return line.includes(HTTP_REQUEST_IDENTIFIER) ? 1 : 0;
}