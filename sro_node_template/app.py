"""Authority Node (SRO) - Maintains ledger, proposes blocks, participates in voting consensus"""
from flask import Flask, jsonify, request
from flask_cors import CORS
import requests
import json
import os
import sys
import time
from threading import Lock

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from common.blockchain import Blockchain, Block, Transaction

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Node configuration (set via command line args)
NODE_ID = os.environ.get('NODE_ID', 'SRO_NODE_1')
NODE_PORT = int(os.environ.get('NODE_PORT', 5001))
BOOTSTRAP_URL = os.environ.get('BOOTSTRAP_URL', 'http://localhost:5000')
CENTRAL_SERVICE_URL = os.environ.get('CENTRAL_SERVICE_URL', 'http://localhost:8000')

# Blockchain state
blockchain = Blockchain()
authority_nodes = {}
pending_proposals = {}  # Store block proposals awaiting votes
votes_received = {}  # Track votes for each proposal
proposal_lock = Lock()

LEDGER_FILE = f"{NODE_ID}_ledger.json"


def save_ledger():
    """Save blockchain to file"""
    blockchain.save_to_file(LEDGER_FILE)


def load_ledger():
    """Load blockchain from file"""
    global blockchain
    loaded_blockchain = Blockchain.load_from_file(LEDGER_FILE)
    if loaded_blockchain:
        blockchain = loaded_blockchain
        print(f"✓ Loaded existing ledger with {blockchain.length} blocks")
        return True
    return False


def register_with_bootstrap():
    """Register this node with the bootstrap node"""
    try:
        response = requests.post(
            f"{BOOTSTRAP_URL}/nodes/register",
            json={
                "node_id": NODE_ID,
                "url": f"http://localhost:{NODE_PORT}"
            },
            timeout=5
        )
        
        if response.status_code == 201:
            data = response.json()
            
            # Load ledger from bootstrap
            global blockchain, authority_nodes
            blockchain = Blockchain.from_dict(data['ledger'])
            authority_nodes = data['authority_nodes']
            
            save_ledger()
            
            print(f"✓ Successfully registered with bootstrap node")
            print(f"✓ Received ledger with {blockchain.length} blocks")
            print(f"✓ Known authority nodes: {len(authority_nodes)}")
            return True
        else:
            print(f"✗ Registration failed: {response.text}")
            return False
            
    except requests.exceptions.RequestException as e:
        print(f"✗ Could not connect to bootstrap node: {e}")
        return False


def fetch_pending_transactions():
    """Fetch pending transactions from central service"""
    try:
        response = requests.get(
            f"{CENTRAL_SERVICE_URL}/transactions/pending",
            timeout=5
        )
        
        if response.status_code == 200:
            data = response.json()
            return data['pending_transactions']
        else:
            print(f"✗ Failed to fetch pending transactions: {response.text}")
            return []
            
    except requests.exceptions.RequestException as e:
        print(f"✗ Could not connect to central service: {e}")
        return []


def mark_transaction_in_blockchain(tx_id, block_hash):
    """Mark a transaction as added to blockchain in central service"""
    try:
        response = requests.put(
            f"{CENTRAL_SERVICE_URL}/transactions/{tx_id}/add-to-blockchain",
            json={"block_hash": block_hash},
            timeout=5
        )
        
        if response.status_code == 200:
            print(f"✓ Transaction {tx_id} marked as in blockchain")
            return True
        else:
            print(f"✗ Failed to mark transaction {tx_id} in blockchain: {response.text}")
            return False
            
    except requests.exceptions.RequestException as e:
        print(f"✗ Could not connect to central service: {e}")
        return False


def mark_transaction_verified(tx_id):
    """Mark a transaction as verified in central service (DEPRECATED - kept for compatibility)"""
    try:
        response = requests.put(
            f"{CENTRAL_SERVICE_URL}/transactions/{tx_id}/verify",
            json={"verifier": NODE_ID},
            timeout=5
        )
        
        if response.status_code == 200:
            print(f"✓ Transaction {tx_id} marked as verified")
            return True
        else:
            print(f"✗ Failed to verify transaction {tx_id}: {response.text}")
            return False
            
    except requests.exceptions.RequestException as e:
        print(f"✗ Could not connect to central service: {e}")
        return False


def broadcast_vote_request(block_dict, proposer_url):
    """
    Broadcast block proposal to all authority nodes for voting
    
    Returns:
        dict: {node_id: vote_result}
    """
    votes = {}
    
    for node_id, node_info in authority_nodes.items():
        if node_id == NODE_ID:
            # Don't send to self
            continue
        
        node_url = node_info['url']
        
        try:
            response = requests.post(
                f"{node_url}/vote",
                json={
                    "block": block_dict,
                    "proposer": NODE_ID,
                    "proposer_url": proposer_url
                },
                timeout=5
            )
            
            if response.status_code == 200:
                vote_data = response.json()
                votes[node_id] = vote_data['vote']
                print(f"  Vote from {node_id}: {vote_data['vote']}")
            else:
                print(f"  ✗ Failed to get vote from {node_id}")
                votes[node_id] = "NO_RESPONSE"
                
        except requests.exceptions.RequestException as e:
            print(f"  ✗ Could not reach {node_id}: {e}")
            votes[node_id] = "NO_RESPONSE"
    
    return votes


def broadcast_finalized_block(block_dict):
    """Broadcast finalized block to all nodes including bootstrap"""
    # Always include bootstrap node
    nodes_to_notify = [{"node_id": "BOOTSTRAP", "url": BOOTSTRAP_URL}]
    
    # Add all other authority nodes (skip BOOTSTRAP if already added)
    for node_id, node_info in authority_nodes.items():
        if node_id != NODE_ID and node_id != "BOOTSTRAP":  # Don't send to self or duplicate bootstrap
            nodes_to_notify.append(node_info)
    
    for node_info in nodes_to_notify:
        node_url = node_info['url']
        
        try:
            response = requests.post(
                f"{node_url}/block/add",
                json=block_dict,
                timeout=5
            )
            
            if response.status_code == 201:
                print(f"  ✓ Block broadcast to {node_info['node_id']}")
            else:
                print(f"  ✗ Failed to broadcast to {node_info['node_id']}")
                
        except requests.exceptions.RequestException as e:
            print(f"  ✗ Could not reach {node_info['node_id']}: {e}")


@app.route('/status', methods=['GET'])
def status():
    """Get node status"""
    return jsonify({
        "status": "running",
        "node_id": NODE_ID,
        "port": NODE_PORT,
        "blockchain_length": blockchain.length,
        "known_nodes": len(authority_nodes)
    })


@app.route('/ledger', methods=['GET'])
def get_ledger():
    """Get the blockchain ledger"""
    return jsonify(blockchain.to_dict())


@app.route('/propose', methods=['POST'])
def propose_block():
    """
    Propose a new block with transactions
    Initiates voting consensus process
    
    Request body:
    {
        "transaction_ids": ["TXN123", "TXN456"]
    }
    """
    global authority_nodes, blockchain
    
    try:
        # Sync authority nodes list from bootstrap before proposing
        try:
            response = requests.get(f"{BOOTSTRAP_URL}/nodes", timeout=5)
            if response.status_code == 200:
                nodes_data = response.json()
                authority_nodes = nodes_data['nodes']
                print(f"✓ Updated authority nodes list: {len(authority_nodes)} nodes")
        except:
            print("⚠ Could not sync authority nodes list, using cached list")
        
        # Sync ledger from bootstrap before proposing to ensure we're up to date
        try:
            response = requests.get(f"{BOOTSTRAP_URL}/ledger", timeout=5)
            if response.status_code == 200:
                bootstrap_ledger = Blockchain.from_dict(response.json())
                if bootstrap_ledger.length > blockchain.length:
                    blockchain = bootstrap_ledger
                    save_ledger()
                    print(f"✓ Synced ledger from bootstrap (now {blockchain.length} blocks)")
        except Exception as e:
            print(f"⚠ Could not sync ledger from bootstrap: {e}")
        
        data = request.get_json()
        
        if not data or 'transaction_ids' not in data:
            return jsonify({"error": "Missing transaction_ids"}), 400
        
        tx_ids = data['transaction_ids']
        
        if not tx_ids:
            return jsonify({"error": "No transactions provided"}), 400
        
        # Fetch transactions from central service
        transactions = []
        for tx_id in tx_ids:
            try:
                response = requests.get(f"{CENTRAL_SERVICE_URL}/transactions/{tx_id}", timeout=5)
                if response.status_code == 200:
                    tx_data = response.json()
                    print(f"✓ Fetched transaction {tx_id}: {tx_data}")
                    transactions.append(tx_data)
                else:
                    error_msg = f"Transaction {tx_id} not found (status: {response.status_code})"
                    print(f"✗ {error_msg}")
                    return jsonify({"error": error_msg}), 404
            except requests.exceptions.RequestException as e:
                error_msg = f"Failed to fetch transaction {tx_id}: {str(e)}"
                print(f"✗ {error_msg}")
                return jsonify({"error": error_msg}), 500
    except Exception as e:
        error_msg = f"Error in propose_block (pre-block creation): {str(e)}"
        print(f"✗ {error_msg}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": error_msg}), 500
    
    try:
        latest_block = blockchain.get_latest_block()
        new_block = Block(
            index=latest_block.index + 1,
            transactions=transactions,
            previous_hash=latest_block.block_hash,
            authority_node_id=NODE_ID
        )
        
        block_dict = new_block.to_dict()
        
        print(f"\n{'='*50}")
        print(f"📦 PROPOSING BLOCK #{new_block.index}")
        print(f"{'='*50}")
        print(f"Transactions: {len(transactions)}")
        print(f"Previous Hash: {latest_block.block_hash[:16]}...")
        print(f"\nInitiating voting process...")
        
        # Broadcast to all nodes for voting
        proposer_url = f"http://localhost:{NODE_PORT}"
        votes = broadcast_vote_request(block_dict, proposer_url)
        
        # Count votes (proposer automatically votes ACCEPT)
        votes[NODE_ID] = "ACCEPT"
        
        accept_votes = sum(1 for v in votes.values() if v == "ACCEPT")
        total_votes = len(votes)
        
        print(f"\n📊 VOTING RESULTS:")
        print(f"  ACCEPT: {accept_votes}/{total_votes}")
        
        # Check if majority accepted
        required_votes = (len(authority_nodes) + 1) // 2  # Majority
        
        if accept_votes >= required_votes:
            print(f"✓ Block ACCEPTED (majority reached)")
            
            # Add block to local chain
            blockchain.add_block(new_block)
            save_ledger()
            
            # Mark transactions as added to blockchain with block hash
            for tx in transactions:
                mark_transaction_in_blockchain(tx['tx_id'], new_block.block_hash)
            
            # Broadcast finalized block to all nodes
            print(f"\n📡 Broadcasting finalized block to all nodes...")
            broadcast_finalized_block(block_dict)
            
            print(f"{'='*50}\n")
            
            return jsonify({
                "message": "Block accepted and added to blockchain",
                "block": block_dict,
                "votes": votes,
                "accept_count": accept_votes,
                "total_votes": total_votes
            }), 201
        else:
            print(f"✗ Block REJECTED (insufficient votes)")
            print(f"{'='*50}\n")
            
            return jsonify({
                "message": "Block rejected by consensus",
                "votes": votes,
                "accept_count": accept_votes,
                "total_votes": total_votes,
                "required_votes": required_votes
            }), 400
    except Exception as e:
        error_msg = f"Error in propose_block (block creation/voting): {str(e)}"
        print(f"✗ {error_msg}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": error_msg}), 500


@app.route('/vote', methods=['POST'])
def vote_on_block():
    """
    Receive a block proposal and vote on it
    
    Request body:
    {
        "block": {...},
        "proposer": "SRO_NODE_1",
        "proposer_url": "http://localhost:5001"
    }
    """
    data = request.get_json()
    
    if not data or 'block' not in data or 'proposer' not in data:
        return jsonify({"error": "Missing block or proposer"}), 400
    
    block_dict = data['block']
    proposer = data['proposer']
    
    print(f"\n📩 Received block proposal from {proposer}")
    print(f"  Proposed block index: {block_dict.get('index')}")
    print(f"  My current chain length: {blockchain.length}")
    
    try:
        # Convert dict to Block object
        proposed_block = Block.from_dict(block_dict)
        
        # Validate the block
        latest_block = blockchain.get_latest_block()
        print(f"  My latest block index: {latest_block.index}")
        print(f"  My latest block hash: {latest_block.block_hash[:16]}...")
        print(f"  Proposed previous hash: {proposed_block.previous_hash[:16]}...")
        
        is_valid, error = blockchain.is_valid_new_block(proposed_block, latest_block)
        
        if not is_valid:
            print(f"  ✗ Block validation failed: {error}")
            return jsonify({
                "vote": "REJECT",
                "reason": error,
                "voter": NODE_ID
            })
        
        # Verify proposer is an authority
        if proposer not in authority_nodes:
            print(f"  ✗ Proposer {proposer} is not an authority")
            return jsonify({
                "vote": "REJECT",
                "reason": "Proposer not authorized",
                "voter": NODE_ID
            })
        
        # All checks passed
        print(f"  ✓ Block is valid - voting ACCEPT")
        
        return jsonify({
            "vote": "ACCEPT",
            "voter": NODE_ID
        })
        
    except Exception as e:
        print(f"  ✗ Error validating block: {e}")
        return jsonify({
            "vote": "REJECT",
            "reason": str(e),
            "voter": NODE_ID
        }), 500


@app.route('/block/add', methods=['POST'])
def add_block():
    """
    Receive and add a finalized block from another node
    (Called after voting consensus is reached)
    """
    data = request.get_json()
    
    if not data:
        return jsonify({"error": "No block data provided"}), 400
    
    try:
        new_block = Block.from_dict(data)
        
        # Check if we already have this block
        if new_block.index <= blockchain.length - 1:
            print(f"ℹ Block #{new_block.index} already exists in local chain")
            return jsonify({"message": "Block already exists"}), 200
        
        # Validate and add
        latest_block = blockchain.get_latest_block()
        is_valid, error = blockchain.is_valid_new_block(new_block, latest_block)
        
        if not is_valid:
            print(f"✗ Received invalid block: {error}")
            return jsonify({"error": f"Invalid block: {error}"}), 400
        
        blockchain.add_block(new_block)
        save_ledger()
        
        print(f"✓ Block #{new_block.index} added to local chain")
        
        return jsonify({
            "message": "Block added successfully",
            "block_index": new_block.index
        }), 201
        
    except Exception as e:
        return jsonify({"error": f"Failed to add block: {str(e)}"}), 500


@app.route('/sync', methods=['GET'])
def sync_ledger():
    """Sync ledger with bootstrap node"""
    global blockchain
    
    try:
        response = requests.get(f"{BOOTSTRAP_URL}/ledger", timeout=5)
        
        if response.status_code == 200:
            bootstrap_ledger = Blockchain.from_dict(response.json())
            
            if bootstrap_ledger.length > blockchain.length:
                blockchain = bootstrap_ledger
                save_ledger()
                print(f"✓ Synced ledger with bootstrap (now {blockchain.length} blocks)")
                
                return jsonify({
                    "message": "Ledger synced successfully",
                    "blockchain_length": blockchain.length
                })
            else:
                return jsonify({
                    "message": "Local ledger is up to date",
                    "blockchain_length": blockchain.length
                })
        else:
            return jsonify({"error": "Failed to fetch bootstrap ledger"}), 500
            
    except requests.exceptions.RequestException as e:
        return jsonify({"error": f"Could not sync with bootstrap: {str(e)}"}), 500


@app.route('/blockchain', methods=['GET'])
def get_blockchain():
    """Get blockchain (alias for /ledger for frontend compatibility)"""
    return jsonify(blockchain.to_dict())


@app.route('/info', methods=['GET'])
def get_node_info():
    """Get node information"""
    return jsonify({
        "node_id": NODE_ID,
        "port": NODE_PORT,
        "blockchain_length": blockchain.length,
        "is_authority": True,
        "bootstrap_url": BOOTSTRAP_URL
    })


@app.route('/sync/ledger', methods=['GET'])
def sync_ledger_alias():
    """Sync ledger (alias for /sync for frontend compatibility)"""
    return sync_ledger()


# Initialize node on module load (works with both `flask run` and `python app.py`)
def initialize_node():
    """Initialize node - called on module load"""
    global blockchain, authority_nodes
    
    print("\n" + "="*50)
    print(f"🚀 AUTHORITY NODE: {NODE_ID}")
    print("="*50)
    
    # Always try to register with bootstrap first
    print("Registering with bootstrap node...")
    registration_success = register_with_bootstrap()
    
    if not registration_success:
        # Registration failed, try to load local ledger as fallback
        print("⚠️ Bootstrap registration failed, attempting local ledger load...")
        if load_ledger():
            print(f"✓ Loaded local ledger with {blockchain.length} blocks")
        else:
            print("✗ No local ledger found. Starting with empty chain.")
    
    # Always sync with bootstrap to ensure latest state
    print("Syncing with bootstrap for latest updates...")
    try:
        response = requests.get(f"{BOOTSTRAP_URL}/ledger", timeout=5)
        if response.status_code == 200:
            ledger_data = response.json()
            bootstrap_length = ledger_data.get('length', 0)
            
            if bootstrap_length > blockchain.length:
                print(f"Bootstrap has newer blocks ({bootstrap_length} vs {blockchain.length})")
                blockchain.chain = [Block.from_dict(b) for b in ledger_data['chain']]
                save_ledger()
                print(f"✓ Synced to latest ledger ({blockchain.length} blocks)")
            elif bootstrap_length == blockchain.length:
                print(f"✓ Already up-to-date ({blockchain.length} blocks)")
            else:
                print(f"ℹ️ Local chain is ahead ({blockchain.length} vs {bootstrap_length})")
        else:
            print("⚠️ Could not fetch bootstrap ledger for sync")
    except Exception as e:
        print(f"⚠️ Sync with bootstrap failed: {e}")
    
    # Get latest authority nodes list
    try:
        response = requests.get(f"{BOOTSTRAP_URL}/nodes", timeout=5)
        if response.status_code == 200:
            data = response.json()
            if data.get('nodes'):
                authority_nodes = data['nodes']
                print(f"✓ Updated authority nodes: {len(authority_nodes)} nodes")
    except Exception as e:
        print(f"⚠️ Could not fetch authority nodes: {e}")
    
    print(f"Blockchain Length: {blockchain.length}")
    print(f"Listening on port: {NODE_PORT}")
    print("="*50 + "\n")


# Call initialize on module load
initialize_node()


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=NODE_PORT, debug=False, use_reloader=False)
