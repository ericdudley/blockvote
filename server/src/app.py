#!/usr/bin/python3
# Independent Study
# RIT 2185
# Professor: Alan Kaminsky
# Author: Eric Dudley
#
# app.py - flask application that runs a block vote full node or miner


from flask import Flask, request, abort, jsonify
import requests
import blockchain
import time
import json
from ecdsa import SigningKey, VerifyingKey
from flask_cors import CORS
import threading
from flask_socketio import SocketIO, emit
from util import *
import util
import uuid
from binascii import hexlify
from base64 import b64decode, b64encode
from random import choice
from copy import deepcopy
import logging

log = getLogger("app")


app = Flask(__name__)
app.debug = False
CORS(app)
socketio = SocketIO(app, async_mode="eventlet")


@socketio.on("connect")
def connect():
    """On web socket connect, send the node's info.
    """

    socketio.emit("info", build_node_info())


@app.route("/alive")
def alive():
    """Endpoint that returns nothing to verify that the node is alive.
    """

    return ""


@app.route("/get_nodes")
def get_nodes():
    """Returns a list of the currently known nodes in the network. Also adds the requester's port
    to the list.
    
    Returns:
        {resp} -- JSON list of node ports.
    """

    port = int(request.headers.get("node-port"))
    if port and port not in nodes:
        nodes.append(port)
    node_info = build_node_info()
    socketio.emit("info", node_info)
    return resp(nodes)


@app.route("/elections")
def get_elections():
    """
    Returns:
        {resp} -- JSON array of blockchain dictionaries.
    """

    return resp(list(blockchains.values()))


@app.route("/election/<id>")
def get_election(id):
    """
    Arguments:
        id {str} -- Election id.
    
    Returns:
        {resp} -- JSON array of blocks from the chain with the given id.
    """

    if id not in blockchains.keys():
        abort(500)
    return resp(blockchains.get(id).chain)


@app.route("/receive_ballot", methods=["POST"])
def receive_ballot():
    """Receives and verifies a ballot that has been broadcast to the network.
    """

    body = request.json
    validate_required(["ballot"], body)
    ballot = body["ballot"]["ballot"]
    verifying_key = VerifyingKey.from_string(bytes.fromhex(ballot["verifying_key"]))

    lock.acquire()
    if (
        ballot["election"] in blockchains.keys()
        and ballot["id"] not in unconfirmed_ballots[ballot["election"]].keys()
        and blockchain.verifyingKeyInBlockchain(
            verifying_key, blockchains[ballot["election"]]
        )
        and not blockchain.verifyingKeyAlreadyUsed(
            verifying_key,
            blockchains[ballot["election"]],
            unconfirmed_ballots[ballot["election"]],
        )
        and blockchain.verifyBallot(
            ballot,
            body["ballot"]["signature"],
            verifying_key_hex=ballot["verifying_key"],
        )
    ):
        log.info("%d received ballot %s" % (port, ballot["id"]))
        unconfirmed_ballots[ballot["election"]][ballot["id"]] = body["ballot"]
        lock.release()
        threading.Thread(target=broadcast_ballot, args=[body["ballot"]]).start()
    else:
        lock.release()
    return ""


@app.route("/receive_election", methods=["POST"])
def receive_election():
    """Receives and verifies an election that has been broadcast to the network.
    """
    body = request.json
    validate_required(["election"], body)
    election = body["election"]

    if election["id"] not in blockchains.keys():
        blockchains[election["id"]] = election
        unconfirmed_ballots[election["id"]] = {}
        socketio.emit("info", build_node_info())
        log.info("%d received election %s" % (port, election["id"]))
        threading.Thread(target=broadcast_election, args=[election]).start()
    return ""


@app.route("/receive_block", methods=["POST"])
def receive_block():
    """Receives and verifies a block that has been broadcast to the network.
    """
    body = request.json
    validate_required(["block"], body)
    block = body["block"]
    election = block["header"]["election"]

    with lock:
        if (
            block["header"]["election"] in blockchains.keys()
            and blockchain.verifyBlock(block)
            and block["header"]["id"]
            not in [b["header"]["id"] for b in blockchains[election]["chain"]]
            and blockchains[election]["chain"][-1]["header"]["id"]
            == block["header"]["previous_id"]
        ):
            blockchains[election]["chain"].append(block)
            for ballot in block["ballots"]:
                if ballot["ballot"]["id"] in unconfirmed_ballots.keys():
                    unconfirmed_ballots.pop(ballot["ballot"]["id"])
            log.info("%d received block %s" % (port, block["header"]["id"]))
            threading.Thread(target=broadcast_block, args=[block]).start()
    return ""


@app.route("/new_election", methods=["POST"])
def new_election():
    """Creates a new election and broadcasts it to the network.
    
    Returns:
        {resp} -- A JSON object that contains the election information and key pairs.
    """

    body = request.json
    validate_required(["label", "candidates", "ballot_count"], body)

    signing_keys, verifying_keys = blockchain.generateKeys(body["ballot_count"])

    genesis = blockchain.createGenesisBlock(
        body["label"], body["candidates"], verifying_keys
    )
    new_blockchain = blockchain.createBlockchain(genesis)

    with lock:
        blockchains[genesis["header"]["id"]] = new_blockchain
        unconfirmed_ballots[genesis["header"]["id"]] = {}

    socketio.emit("info", build_node_info())
    log.info("%d created election %s" % (port, new_blockchain["id"]))
    threading.Thread(target=broadcast_election, args=[new_blockchain]).start()

    return resp(
        {
            "id": genesis["header"]["id"],
            "label": genesis["header"]["label"],
            "time": genesis["header"]["timestamp"],
            "candidates": genesis["header"]["candidates"],
            "verifying_keys": verifying_keys,
            "signing_keys": signing_keys,
        }
    )


@app.route("/cast_ballot", methods=["POST"])
def cast_ballot():
    """Creates and signs a ballot, broadcasts the ballot to the network.
    
    Returns:
        {resp} -- A JSON object containing a ballot and it's signature.
    """

    body = request.json
    validate_required(["signing_key", "candidates", "election"], body)

    signing_key = SigningKey.from_string(bytes.fromhex(body["signing_key"]))
    verifying_key = signing_key.get_verifying_key()

    with lock:
        if body["election"] not in blockchains:
            abort(500)
        if not blockchain.verifyingKeyInBlockchain(
            verifying_key, blockchains[body["election"]]
        ):
            abort(500)
        if blockchain.verifyingKeyAlreadyUsed(
            verifying_key,
            blockchains[body["election"]],
            unconfirmed_ballots[body["election"]],
        ):
            abort(500)

        ballot = blockchain.createBallot(
            body["election"], body["candidates"], verifying_key.to_string().hex()
        )
        signature = blockchain.signBallot(ballot, body["signing_key"])

        ballot_msg = {"ballot": ballot, "signature": signature}

        unconfirmed_ballots[body["election"]][ballot["id"]] = ballot_msg
        log.info("%d cast ballot %s" % (port, ballot["id"]))
    threading.Thread(target=broadcast_ballot, args=[ballot_msg]).start()
    return resp(ballot_msg)


# Discover Other Nodes


def discover():
    """Iterates through currently known nodes in the network and requests for more nodes from them.
    """

    time.sleep(5)
    for n in nodes:
        r = requests.get(build_url(n, "/get_nodes"), headers={"node-port": str(port)})
        for n2 in r.json():
            n2 = int(n2)
            # if n2 not in nodes and n2 != conf("port"):
            # nodes.append(n2)


def mine():
    """
    Infinite loop to continuously check for unconfirmed ballots to mine blocks from and
    broadcast to the network.
    """
    global mining

    while True:
        election = None
        mine_election = None
        mine_ballots = None
        mine_prev_block = None
        with lock:
            keys = list(blockchains.keys())
            if len(keys) > 0:
                election = choice(keys)
            if (
                election
                and len(unconfirmed_ballots[election]) >= blockchain.BLOCK_BALLOT_COUNT
            ):
                mine_election = election
                mine_ballots = deepcopy(
                    list(unconfirmed_ballots[election].values())[
                        : blockchain.BLOCK_BALLOT_COUNT
                    ]
                )
                mine_prev_block = deepcopy(blockchains[election]["chain"][-1])

        if mine_election and mine_ballots and mine_prev_block:
            log.info(
                "%d started mining block %d"
                % (port, len(blockchains[mine_election]["chain"]))
            )
            mining = len(blockchains[election]["chain"])
            socketio.emit("info", build_node_info())
            block = blockchain.mineBlock(mine_election, mine_ballots, mine_prev_block)
            log.info(
                "%d finished mining block %d"
                % (port, len(blockchains[mine_election]["chain"]))
            )
            with lock:
                for ballot in mine_ballots:
                    unconfirmed_ballots[mine_election].pop(ballot["ballot"]["id"])
                blockchain.addBlock(blockchains[election], block)
            threading.Thread(target=broadcast_block, args=[block]).start()
        else:
            mining = None
            socketio.emit("info", build_node_info())
            time.sleep(1)


def broadcast_election(election):
    """Broadcast the election to the network.
    
    Arguments:
        election {dict} -- Election dictionary from createBlockchain.
    """

    for n in nodes:
        r = requests.post(
            build_url(n, "/receive_election"), json={"election": election}
        )


def broadcast_ballot(ballot):
    """Broadcast the ballot to the network.
    
    Arguments:
        ballot {dict} -- Ballot dictionary containing a ballot and digital signature.
    """
    for n in nodes:
        r = requests.post(build_url(n, "/receive_ballot"), json={"ballot": ballot})


def broadcast_block(block):
    """Broadcast the block to the network.
    
    Arguments:
        block {dict} -- Block dictionary from createBlock.
    """

    for n in nodes:
        r = requests.post(build_url(n, "/receive_block"), json={"block": block})


if __name__ == "__main__":
    """Parse args, start miner thread if required, and start Flask application.
    """

    args = parse_args()
    port = args.port
    for server in args.servers:
        nodes.append(int(server))

    if args.mine:
        log.info("Miner started on %d" % port)
    else:
        log.info("Node started on %d" % port)

    discover_thread = threading.Thread(target=discover)
    discover_thread.start()
    if args.mine:
        util.miner = True
        mine_thread = threading.Thread(target=mine)
        mine_thread.start()

    socketio.run(app, port=port)
    mine_thread.join()
    discover_thread.join()
