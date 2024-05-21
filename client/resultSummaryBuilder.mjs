import { readFileSync, writeFileSync } from 'fs';
import { open } from 'node:fs/promises';

const REGEX_RESULT = /New query started index (?<index>.+) version (?<version>v\d) with engine (?<config>.+)/u;
const HTTP_REQUEST_IDENTIFIER = "INFO: Requesting";
const logFile = "./result/log";

const mapping = {
    "./config_engine/config-solid-shape-index.json": "./result/shape_index_result.json",
    "./config_engine/config-solid-default.json": "./result/type_index_result.json"
}

const mappingOutput = {
    "./config_engine/config-solid-shape-index.json": "./result/summary_shape_index_result.json",
    "./config_engine/config-solid-default.json": "./result/summary_type_index_result.json"
}

const file = await open(logFile);

let currentNHttpRequest = 0;
let currentVersion;
let currentConfig;
let currentIndex;
const updateStatement = {};

for await (const line of file.readLines()) {
    const newResult = line.match(REGEX_RESULT);
    if (newResult !== null) {
        fillUpdate(currentVersion, currentConfig, currentIndex)

        currentVersion = newResult["groups"]["version"];
        currentConfig = newResult["groups"]["config"];
        currentIndex = newResult["groups"]["index"];
        currentNHttpRequest = 0;
    }
    currentNHttpRequest += fetchNumberOfHttpRequest(line);
}

createSummaryResult();
console.log(JSON.stringify(updateStatement, null, 2));
updateToFile();


function fetchNumberOfHttpRequest(line) {
    return line.includes(HTTP_REQUEST_IDENTIFIER) ? 1 : 0;
}


function fillUpdate(currentVersion, currentConfig, currentIndex) {
    if (currentConfig !== undefined) {
        const configResult = updateStatement[currentConfig];
        if (configResult === undefined) {
            updateStatement[currentConfig] = {
                [currentIndex]: {
                    [currentVersion]: {
                        "n_http_requests": currentNHttpRequest
                    }
                }
            };

        } else {
            const queryResult = configResult[currentIndex];
            if (queryResult === undefined) {
                updateStatement[currentConfig][currentIndex] = {
                    [currentVersion]: {
                        "n_http_requests": currentNHttpRequest
                    }
                };
            } else {
                const queryResultVersion = queryResult[currentVersion];
                if (queryResultVersion === undefined) {
                    updateStatement[currentConfig][currentIndex][currentVersion] = { "n_http_requests": currentNHttpRequest }
                } else {
                    queryResultVersion["n_http_requests"] = currentNHttpRequest;
                }
            }
        }
        return true;
    }
    return false;
}

function createSummaryResult() {
    for (const [key, queries] of Object.entries(updateStatement)) {
        const prevResult = JSON.parse(readFileSync(mapping[key]))["data"];
        for (const [index, values] of Object.entries(queries)) {
            for (const [version, queryValues] of Object.entries(values)) {
                updateStatement[key][index][version]["execution_time"] = prevResult[index][version]["execution_time"];
                updateStatement[key][index][version]["n_results"] =
                    Array.isArray(prevResult[index][version]["results"]) ? prevResult[index][version]["results"].length : -1

            }
        }
    }
}


function updateToFile() {
    for (const [key, results] of Object.entries(updateStatement)) {
        const outputFilePath = mappingOutput[key];
        writeFileSync(outputFilePath, JSON.stringify(results, null, 2));
    }
}