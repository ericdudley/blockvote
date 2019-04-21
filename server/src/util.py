#!/usr/bin/python3
# Independent Study
# RIT 2185
# Professor: Alan Kaminsky
# Author: Eric Dudley
#
# util.py - Provides helper functions and stores application state

from flask import abort, jsonify, current_app as app
import uuid
import argparse
import threading
import logging


def validate_required(required, body):
    """Validate that all fields in required are keys in body.
    
    Arguments:
        required {list} -- List of str field names.
        body {dict} -- The dictionary to be validated.
    """

    for field in required:
        if field not in body:
            abort(500)


def resp(data):
    """Construct a JSON response with data as the body.
    
    Arguments:
        data {obj} -- A JSON serializable object.
    
    Returns:
        {Flask response} -- A 200 JSON reponse.
    """

    return jsonify(data), 200, {"Content-Type": "text/json"}


def build_url(port, path):
    """Construct an API url.
    
    Arguments:
        port {int} -- The port of the server to be addressed.
        path {str} -- The path to the endpoint with a leading slash.
    
    Returns:
        {str} -- The fully qualified domain name with port and path.
    """

    return API_BASE + str(port) + path


def build_node_info():
    """Construct a node info dictionary.
    
    Returns:
        {dict} -- A dictionary that represents a lightweight set of info related to the node.
    """

    return {
        "nodes": nodes,
        "blockchain_count": len(blockchains),
        "is_miner": miner,
        "mining": mining,
    }


def parse_args():
    """Parses system arguments using argparse.
    
    Returns:
        {obj} -- If all arguments are valid, an object with all the command line arugments.
    """

    parser = argparse.ArgumentParser(
        description="Run a node on the blockvote blockchain."
    )
    parser.add_argument("-p", "--port", dest="port", default=5000, type=int)
    parser.add_argument(
        "-s", "--servers", dest="servers", default=[], type=int, nargs="*"
    )
    parser.add_argument("-m", "--mine", dest="mine", default=False, action="store_true")
    return parser.parse_args()


def getUUID():
    """Produce a random UUID.
    
    Returns:
        {str} -- A randomly generated UUID.
    """

    return str(uuid.uuid1())


def getLogger(name):
    """Create a logger with the specified name.
    
    Arguments:
        name {str} -- The name of the logger shown in the output.
    
    Returns:
        {logger} -- A standard logging module logger.
    """

    log = logging.getLogger(name)
    ch = logging.StreamHandler()
    ch.setFormatter(logging.Formatter("%(name)s[%(levelname)s] %(message)s"))
    log.addHandler(ch)
    log.setLevel(logging.INFO)

    return log


log = getLogger("util")

""" Application state. """

""" Lock to control access to the application state. Needed by miners. """
lock = threading.Lock()

"""
The lowest port that can be used by a node. 
All other nodes should be increasing from this port by one.
"""
base_port = 5000

""" The base URL that all nodes are on. """
API_BASE = "http://localhost:"

""" A dictionary that maps election id's to blockchains. """
blockchains = {}

""" A list of other known nodes on the network. """
nodes = []

""" The port that the current node listens on. """
port = base_port

""" A dictionary that maps ballot id's to ballots that have not been added to the chain yet. """
unconfirmed_ballots = {}

""" Flag that specifies whether or not this node is a miner. """
miner = False

""" Mining block ID. """
mining = None
