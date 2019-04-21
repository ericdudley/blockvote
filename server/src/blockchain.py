#!/usr/bin/python3
# Independent Study
# RIT 2185
# Professor: Alan Kaminsky
# Author: Eric Dudley
#
# blockchain.py - provide functions to create/verify/update blockchain entities

import time
from hashlib import md5
from json import dumps
from ecdsa import SigningKey, VerifyingKey, BadSignatureError
from util import getUUID, getLogger, port

log = getLogger("blockchain")

""" The number of ballots that are stored in a single block. """
BLOCK_BALLOT_COUNT = 4

""" The number of leading zeroes required at the end of a block's hash value. """
MINING_DIFFICULTY = 2


def generateKeys(ballot_count):
    """Generates key pairs to be used for signing/verifying transactions.
    
    Arguments:
        ballot_count {int} -- Number of key pairs to generate.
    
    Returns:
        [(signing hex str[], verifying hex str[])] -- a tuple containing the signing
        and verifying keys, both lists are of same length and matching keys are in the same index.
    """

    signing_keys = []
    verifying_keys = []
    for _ in range(ballot_count):

        # Get ecsda key pair
        sk = SigningKey.generate()
        vk = sk.get_verifying_key()

        # Convert to hex strings
        sks = sk.to_string().hex()
        vks = vk.to_string().hex()

        # Add to list
        signing_keys.append(sks)
        verifying_keys.append(vks)
    return signing_keys, verifying_keys


def hashBlock(block):
    """Computes the hash of a block.
    
    Arguments:
        obj {dict} -- The block to be hashed.
    
    Returns:
        {str} -- Hash of block as a hex string.  
    """

    # Using a weak hashing algorithm for performance reasons during testing
    m = md5()

    # Convert block to JSON string and compute hash of the JSON string
    m.update(dumps(block, sort_keys=True).encode())
    return m.hexdigest()


def signBallot(ballot, signing_key_hex):
    """Creates digital signature of a ballot using the provided signing key.
    
    Arguments:
        ballot {dict} -- The ballot to be signed.
        signing_key_hex {str} -- Hex string representation of a signing key.
    
    Returns:
        {str} -- Hex string representation of the digital signature.
    """

    signing_key = SigningKey.from_string(bytes.fromhex(signing_key_hex))

    # Sign the JSON serialization of the ballot.
    return signing_key.sign(dumps(ballot, sort_keys=True).encode()).hex()


def verifyBallot(ballot, signature_hex, verifying_key_hex=None, signing_key_hex=None):
    """Verifies that the digital signature of a ballot matches the provided verifying/signing key.

    Arguments:
        ballot {dict} -- The ballot to be verifies.
        signature_hex {str} -- Hex string digital signature created by signBallot.
    
    Keyword Arguments:
        verifying_key_hex {str} -- Hex string verifying key. (default: {None})
        signing_key_hex {str} -- Hex string signing key. (default: {None})
    
    Returns:
        {bool} -- True if the digital signature is valid for the given ballot and key.
    """

    vk = None
    # Get verifying key from hex of either the signing or verifying key
    if verifying_key_hex:
        vk = VerifyingKey.from_string(bytes.fromhex(verifying_key_hex))
    elif signing_key_hex:
        vk = SigningKey.from_string(bytes.fromhex(signing_key_hex)).get_verifying_key()
    if vk:
        try:
            vk.verify(
                bytes.fromhex(signature_hex), dumps(ballot, sort_keys=True).encode()
            )
            return True
        except BadSignatureError:
            return False

    # No key provided or key hex was invalid
    return False


def verifyBlock(block):
    """Verifies that a block is valid.
    
    Arguments:
        block {dict} -- The block to be verified.
    
    Returns:
        {bool} -- True if the block is a valid block.
    """

    # Make sure the blocks hash conforms to the required difficulty.
    valid_pow = hashBlock(block)[:MINING_DIFFICULTY] == MINING_DIFFICULTY * "0"
    return valid_pow


def verifyingKeyInBlockchain(verifying_key, blockchain):
    """Returns whether or not a verifying key is included in the genesis block of the blockchain.
    
    Arguments:
        verifying_key {VerifyingKey} -- The key to be checked.
        blockchain {dict} -- A blockchain dictionary.
    
    Returns:
        {bool} -- True if the verifying key is included in the blockchain genesis block header.
    """

    return (
        verifying_key.to_string().hex()
        in blockchain["chain"][0]["header"]["verifying_keys"]
    )


def verifyingKeyAlreadyUsed(verifying_key, blockchain, unconfirmed_ballots):
    """Returns whether or not a verifying key has already been used to cast a ballot.

    Arguments:
        verifying_key {VerifyingKey} -- The verifying key in question.
        blockchain {dict} -- A blockchain dictionary.
        unconfirmed_ballots {dict} -- The pool of unconfirmed ballots associated with blockchain.
    
    Returns:
        {bool} -- True if the verifying key is already associated with a ballot in either
        the unconfirmed ballot pool or a block in the blockchain.
    """

    key_string = verifying_key.to_string().hex()

    # Look for the key in the chain
    for block in blockchain["chain"]:
        for ballot in block["ballots"]:
            if ballot["ballot"]["verifying_key"] == key_string:
                return True

    # Look for the key in the unconfirmed ballots
    for ballot in unconfirmed_ballots.values():
        if ballot["ballot"]["verifying_key"] == key_string:
            return True
    return False


def createGenesisBlock(label, candidates, verifying_keys):
    """Create a genesis block.
    
    Arguments:
        label {str} -- The human readable label of the election.
        candidates {list} -- A list of candidate names, each name should be unique.
        verifying_keys {list} -- A list of verifying key hex strings.
    
    Returns:
        {dict} -- A properly structured genesis block for a blockchain. Has a randomly generated id.
    """

    return {
        "header": {
            "id": getUUID(),
            "timestamp": time.time(),
            "candidates": candidates,
            "verifying_keys": verifying_keys,
            "label": label,
            "nonce": 0,
        },
        "ballots": [],
    }


def createBlockchain(genesis_block):
    """Create a blockchain.
    
    Arguments:
        genesis_block {dict} -- A genesis block created by createGenesisBlock.
    
    Returns:
        {dict} -- A blockchain dictionary holding a list of blocks starting with the gensis_block.
        The blockchain's id is the id of the genesis block.
    """

    return {
        "id": genesis_block["header"]["id"],
        "label": genesis_block["header"]["label"],
        "chain": [genesis_block],
    }


def createBlock(election, ballots, previous_hash, previous_id):
    """Create a block.
    
    Arguments:
        election {str} -- The election id.
        ballots {list} -- A list of ballots that the block holds.
        previous_hash {str} -- Hex string of the hash of the preceding block in the chain.
        previous_id {str} -- Id of the preceding block in the chain.
    
    Returns:
        {dict} -- A block with a randomly generated id, filled in header, and list of ballots.
    """

    return {
        "header": {
            "election": election,
            "id": getUUID(),
            "timestamp": time.time(),
            "nonce": 0,
            "previous_hash": previous_hash,
            "previous_id": previous_id,
            "mined_by": port,
        },
        "ballots": ballots,
    }


def createBallot(election, candidates, verifying_key):
    """Create a ballot.
    
    Arguments:
        election {str} -- Election id.
        candidates {list} -- An ordered list of candidates from highest rank to least.
        verifying_key {str} -- Hex string verifying key.
    
    Returns:
        {dict} -- A ballot dictionary with a randomly generated id.
    """

    return {
        "id": getUUID(),
        "election": election,
        "candidates": candidates,
        "verifying_key": verifying_key,
    }


def addBlock(blockchain, block):
    """Adds a block to the end of a blockchain.
    
    Arguments:
        blockchain {dict} -- The blockchain to be added to.
        block {dict} -- The block to be added.
    """

    assert "chain" in blockchain and type(blockchain["chain"]) is list
    blockchain["chain"].append(block)


def mineBlock(election, ballots, previous_block):
    """Mines a new block containing the given ballots.
    
    Arguments:
        election {str} -- Election id.
        ballots {list} -- List of ballot dictionaries.
        previous_block {dict} -- Block dictionary preceding the mined block.
    
    Returns:
        {dict} -- Returns a new block with a valid hash and reference to the previous block.
    """

    block = createBlock(
        election, ballots, hashBlock(previous_block), previous_block["header"]["id"]
    )

    # Increment nonce until the hash of the block conforms to the difficulty requirement
    while hashBlock(block)[:MINING_DIFFICULTY] != MINING_DIFFICULTY * "0":
        block["header"]["nonce"] += 1
    return block
