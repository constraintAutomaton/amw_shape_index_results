python -m venv ./venv
source ./venv/bin/activate
pip install pandas
pip install matplotlib
pip install jupyterlab
ipython kernel install --user --name=venv
jupyter-lab