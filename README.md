# BlockVote
A blockchain-based electronic voting system focused on ranked-choice voting.

The application is composed of a user-facing client that is a React web application, and a server that represents a node in the Blockvote network.

# Requirements
- NodeJS
- Python 3

# Client
To run the client first install dependencies defined in `package.json` by running `npm install`. After installing dependencies, the client application can be launched by running `npm start`.

# Server
To run the server first install dependencies defined in `requirements.txt` by running `pip3 install -r requirements.txt`. After installing dependencies, a node can be started by running `python3 app.py --port [port to list on] [--miner]`.
