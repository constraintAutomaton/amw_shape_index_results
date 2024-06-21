pushd SolidBench.js
    yarn link "rdf-dataset-fragmenter"
    yarn install --ignore-engines
    yarn build || true
popd
yarn link "rdf-dataset-fragmenter"
yarn install