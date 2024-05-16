pushd rdf-dataset-fragmenter.js
    yarn install --ignore-engines
    yarn build || true
    yarn unlink
    yarn link
popd

pushd SolidBench.js
    yarn link "rdf-dataset-fragmenter"
    yarn install --ignore-engines
    yarn build || true
popd
yarn link "rdf-dataset-fragmenter"