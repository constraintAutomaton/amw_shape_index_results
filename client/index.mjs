import { readdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from "path";
import { execSync } from 'node:child_process';

const queryFolder = "./queries/parsed";
const queriesFile = readdirSync(queryFolder);
const queries = [];
const TIMEOUT = 1.5 * 60 * 1000;
const resultFolder = "result";
const MEMORY_SIZE = 16192;
const RESULT_REGEX = /response start\n(.*)\nresponse end/u

for (const file of queriesFile) {
  if (file.includes(".gitkeep")) {
    continue;
  }
  const fileCompletePath = join(queryFolder, file);
  queries.push([JSON.parse(readFileSync(fileCompletePath)), fileCompletePath]);
}

const configPaths = [
  ["./config_engine/config-solid-shape-index_info.json", "shape_index"],
  ["./config_engine/config-solid-default_info.json", "type_index"],
];


for (const [configPath, name] of configPaths) {
  const results = {};
  for (const [queryObject, queryName] of queries) {
    const currentResult = {};
    for (const [version, query] of Object.entries(queryObject)) {
      console.log(`New query started index ${queryName} version ${version} with engine ${configPath}`);
      const command = createCommand(configPath, query);
      let stdout;
      try {
        stdout = String(execSync(command, { timeout: (TIMEOUT + 1000) }));
        const stdoutSerialized = JSON.parse(RESULT_REGEX.exec(stdout)[1]);
        console.log("ADQ")
        console.log(stdoutSerialized);
        currentResult[version] = stdoutSerialized;
      } catch (err) {
        currentResult[version] = {
          results: undefined,
          execution_time: `TIMEOUT ${TIMEOUT}`
        };
      }
    }
    results[queryName] = currentResult;
    const resultFile = `${name}_result.json`;
    writeFileSync(join(resultFolder, resultFile), JSON.stringify({ data: results }));
  }

}

function createCommand(configPath, query) {
  return `node --max-old-space-size=${MEMORY_SIZE} ./comunicaRunner.mjs -c ${configPath} -q "${query.replace(/(\r\n|\n|\r|\t)/gm, "")}" -t ${TIMEOUT / 1000}`;
}