"""Bootstrap Node - Initializes blockchain and manages authority nodes"""
from flask import Flask, jsonify, request
from flask_cors import CORS
import json
import os
import sys

# Add parent directory to path to import common modules
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from common.blockchain import Blockchain, Block

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Initialize blockchain
blockchain = Blockchain()
blockchain.create_genesis_block("BOOTSTRAP")

# Authority nodes registry
authority_nodes = {
    "BOOTSTRAP": {
        "node_id": "BOOTSTRAP",
        "url": "http://localhost:5000",
        "verified": True
    }
}

# Save paths
LEDGER_FILE = "bootstrap_ledger.json"
NODES_FILE = "authority_nodes.json"


def save_ledger():
    """Save blockchain ledger to file"""
    blockchain.save_to_file(LEDGER_FILE)


def save_nodes_registry():
    """Save authority nodes registry to file"""
    with open(NODES_FILE, 'w') as f:
        json.dump(authority_nodes, f, indent=2)


def load_data():
    """Load existing ledger and nodes registry if available"""
    global blockchain, authority_nodes
    
    # Load ledger
    loaded_blockchain = Blockchain.load_from_file(LEDGER_FILE)
    if loaded_blockchain:
        blockchain = loaded_blockchain
        print(f"✓ Loaded existing ledger with {blockchain.length} blocks")
    else:
        print("✓ Created new genesis block")
        save_ledger()
    
    # Load nodes registry
    if os.path.exists(NODES_FILE):
        with open(NODES_FILE, 'r') as f:
            authority_nodes.update(json.load(f))
        print(f"✓ Loaded {len(authority_nodes)} authority nodes")
    else:
        save_nodes_registry()


@app.route('/status', methods=['GET'])
def status():
    """Get bootstrap node status"""
    return jsonify({
        "status": "running",
        "node_id": "BOOTSTRAP",
        "blockchain_length": blockchain.length,
        "authority_nodes_count": len(authority_nodes)
    })


@app.route('/ledger', methods=['GET'])
def get_ledger():
    """Get the complete blockchain ledger"""
    return jsonify(blockchain.to_dict())


@app.route('/nodes/register', methods=['POST'])
def register_node():
    """
    Register a new authority node
    
    Request body:
    {
        "node_id": "SRO_NODE_1",
        "url": "http://localhost:5001"
    }
    """
    data = request.get_json()
    
    if not data or 'node_id' not in data or 'url' not in data:
        return jsonify({"error": "Missing node_id or url"}), 400
    
    node_id = data['node_id']
    url = data['url']
    
    if node_id in authority_nodes:
        return jsonify({"error": "Node already registered"}), 400
    
    # Register the node
    authority_nodes[node_id] = {
        "node_id": node_id,
        "url": url,
        "verified": True  # Auto-verify for demo purposes
    }
    
    save_nodes_registry()
    
    print(f"✓ Registered new authority node: {node_id} at {url}")
    
    # Return the current ledger to the new node
    return jsonify({
        "message": "Node registered successfully",
        "ledger": blockchain.to_dict(),
        "authority_nodes": authority_nodes
    }), 201


@app.route('/nodes', methods=['GET'])
def get_nodes():
    """Get list of all authority nodes"""
    return jsonify({
        "nodes": authority_nodes,
        "count": len(authority_nodes)
    })


@app.route('/nodes/verify/<node_id>', methods=['GET'])
def verify_node(node_id):
    """Verify if a node is an authorized authority"""
    if node_id in authority_nodes and authority_nodes[node_id]['verified']:
        return jsonify({
            "verified": True,
            "node_id": node_id
        })
    else:
        return jsonify({
            "verified": False,
            "node_id": node_id
        }), 404


@app.route('/vote', methods=['POST'])
def vote_on_block():
    """
    Vote on a block proposal from authority nodes
    
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
    
    try:
        # Convert dict to Block object
        from common.blockchain import Block
        proposed_block = Block.from_dict(block_dict)
        
        # Validate the block
        latest_block = blockchain.get_latest_block()
        is_valid, error = blockchain.is_valid_new_block(proposed_block, latest_block)
        
        if not is_valid:
            print(f"  ✗ Block validation failed: {error}")
            return jsonify({
                "vote": "REJECT",
                "reason": error,
                "voter": "BOOTSTRAP"
            })
        
        # Verify proposer is an authority
        if proposer not in authority_nodes:
            print(f"  ✗ Proposer {proposer} is not an authority")
            return jsonify({
                "vote": "REJECT",
                "reason": "Proposer not authorized",
                "voter": "BOOTSTRAP"
            })
        
        # All checks passed
        print(f"  ✓ Block is valid - voting ACCEPT")
        
        return jsonify({
            "vote": "ACCEPT",
            "voter": "BOOTSTRAP"
        })
        
    except Exception as e:
        print(f"  ✗ Error validating block: {e}")
        return jsonify({
            "vote": "REJECT",
            "reason": str(e),
            "voter": "BOOTSTRAP"
        }), 500


@app.route('/block/add', methods=['POST'])
def add_block():
    """
    Add a verified block to the blockchain (called after voting consensus)
    
    Request body: Block dictionary
    """
    data = request.get_json()
    
    if not data:
        return jsonify({"error": "No block data provided"}), 400
    
    try:
        # Convert dict to Block object
        new_block = Block.from_dict(data)
        
        # Check if we already have this block
        if new_block.index <= blockchain.length - 1:
            print(f"ℹ Block #{new_block.index} already exists in local chain")
            return jsonify({"message": "Block already exists"}), 200
        
        # Validate the block
        latest_block = blockchain.get_latest_block()
        is_valid, error = blockchain.is_valid_new_block(new_block, latest_block)
        
        if not is_valid:
            return jsonify({"error": f"Invalid block: {error}"}), 400
        
        # Add block to chain
        blockchain.add_block(new_block)
        save_ledger()
        
        print(f"✓ Block #{new_block.index} added to blockchain")
        
        return jsonify({
            "message": "Block added successfully",
            "block": new_block.to_dict()
        }), 201
        
    except Exception as e:
        return jsonify({"error": f"Failed to add block: {str(e)}"}), 500


if __name__ == '__main__':
    load_data()
    print("\n" + "="*50)
    print("🚀 BOOTSTRAP NODE STARTED")
    print("="*50)
    print(f"Blockchain Length: {blockchain.length}")
    print(f"Authority Nodes: {len(authority_nodes)}")
    print("="*50 + "\n")
    
    app.run(host='0.0.0.0', port=5000, debug=True)
