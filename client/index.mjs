import { QueryEngineFactory } from "@comunica/query-sparql-link-traversal-solid";
import {LoggerPretty} from '@comunica/logger-pretty';
import {
  createOutputInterceptor
} from 'output-interceptor';
 
let output = '';

const originalStdoutWrite = process.stderr.write.bind(process.stdout);

process.stderr.write = (chunk, encoding, callback) => {
  if (typeof chunk === 'string') {
    output += chunk;
    output+="zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz";
  }

  console.log(`doing: "${chunk}"\n\n`);

  return originalStdoutWrite(chunk, encoding, callback);
};

const query = `PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
PREFIX snvoc: <http://solidbench-server:3000/www.ldbc.eu/ldbc_socialnet/1.0/vocabulary/>
SELECT ?messageId ?messageCreationDate ?messageContent WHERE {
  ?message snvoc:hasCreator <http://solidbench-server:3000/pods/00000000000000000933/profile/card#me>;
    rdf:type snvoc:Post;
    snvoc:content ?messageContent;
    snvoc:creationDate ?messageCreationDate;
    snvoc:id ?messageId.
}`.replaceAll('solidbench-server', 'localhost');
const configPath = './config_engine/config-solid-shape-index-no-ldp.json' // './config_engine/config-solid-shape-index-no-ldp.json' //'./config_engine/config-solid-default.json'//'./config_engine/config-solid-shape-index.json';
const engine = await new QueryEngineFactory().create({ configPath });

const bindingsStream = await engine.queryBindings(query, {
  lenient: true,
 log: new LoggerPretty({ level: 'trace' }),
});
const start = new Date().getTime();

bindingsStream.on('data', (binding) => {
  console.log(binding.toString());
});

bindingsStream.on('end', ()=>{
  const end = new Date().getTime();
  const time = end - start;
  console.log(`Execution time: ${time} with ${configPath}`);
});

/** 
const query2 = `PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
PREFIX snvoc: <http://solidbench-server:3000/www.ldbc.eu/ldbc_socialnet/1.0/vocabulary/>
SELECT ?firstName ?lastName ?birthday ?locationIP ?browserUsed ?cityId ?creationDate WHERE {
  <http://solidbench-server:3000/pods/00000000000000000933/profile/card#me> rdf:type snvoc:Person;
    snvoc:id ?personId;
    snvoc:firstName ?firstName;
    snvoc:lastName ?lastName;
    snvoc:birthday ?birthday;
    snvoc:creationDate ?creationDate;
    snvoc:locationIP ?locationIP;
    snvoc:isLocatedIn ?city.
  ?city snvoc:id ?cityId.
  <http://solidbench-server:3000/pods/00000000000000000933/profile/card#me> snvoc:browserUsed ?browserUsed.
}`.replaceAll('solidbench-server', 'localhost');

const bindingsStream2 = await engine.queryBindings(query2, {
  lenient: true,
  //log: new LoggerPretty({ level: 'trace' }),
});

bindingsStream2.on('data', (binding) => {
  console.log(binding.toString());
});
*/