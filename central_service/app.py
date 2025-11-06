"""Centralized Transaction Service - Handles land registration and transfer requests"""
from flask import Flask, jsonify, request
from flask_cors import CORS
import sqlite3
import json
import uuid
from datetime import datetime

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

DATABASE = 'transactions.db'


def get_db():
    """Get database connection"""
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row  # Return rows as dictionaries
    return conn


def init_db():
    """Initialize database schema"""
    conn = get_db()
    cursor = conn.cursor()
    
    # Create lands table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS lands (
            land_id TEXT PRIMARY KEY,
            survey_number TEXT UNIQUE NOT NULL,
            owner TEXT NOT NULL,
            area TEXT NOT NULL,
            location TEXT NOT NULL,
            property_type TEXT NOT NULL,
            created_at TEXT NOT NULL,
            verified BOOLEAN DEFAULT 0
        )
    ''')
    
    # Create transactions table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS transactions (
            tx_id TEXT PRIMARY KEY,
            type TEXT NOT NULL,
            land_id TEXT NOT NULL,
            land_details TEXT,
            seller TEXT,
            buyer TEXT,
            verified_by_sro BOOLEAN DEFAULT 0,
            verifying_sro TEXT,
            verifier TEXT,
            timestamp TEXT NOT NULL,
            status TEXT DEFAULT 'PENDING',
            block_hash TEXT,
            FOREIGN KEY (land_id) REFERENCES lands (land_id)
        )
    ''')
    
    # Add block_hash column if it doesn't exist (for existing databases)
    try:
        cursor.execute('ALTER TABLE transactions ADD COLUMN block_hash TEXT')
        conn.commit()
    except sqlite3.OperationalError:
        pass  # Column already exists
    
    conn.commit()
    conn.close()
    print("✓ Database initialized")


@app.route('/status', methods=['GET'])
def status():
    """Get service status"""
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute("SELECT COUNT(*) as count FROM transactions WHERE status='PENDING'")
    pending_count = cursor.fetchone()['count']
    
    cursor.execute("SELECT COUNT(*) as count FROM transactions WHERE verified_by_sro=1 AND status='PENDING'")
    verified_pending_count = cursor.fetchone()['count']
    
    cursor.execute("SELECT COUNT(*) as count FROM transactions WHERE status='VERIFIED'")
    verified_count = cursor.fetchone()['count']
    
    conn.close()
    
    return jsonify({
        "status": "running",
        "service": "Centralized Transaction Service",
        "pending_transactions": pending_count,
        "verified_by_sro_pending": verified_pending_count,
        "blockchain_verified": verified_count
    })


@app.route('/land/register', methods=['POST'])
def register_land():
    """
    Register a new land
    
    Request body:
    {
        "owner": "Alice Sharma",
        "area": "1500 sq.ft",
        "location": "Plot 12, Sector 9, Noida",
        "property_type": "Residential"
    }
    """
    data = request.get_json()
    
    required_fields = ['survey_number', 'owner', 'area', 'location', 'property_type']
    if not all(field in data for field in required_fields):
        return jsonify({"error": "Missing required fields. Required: survey_number, owner, area, location, property_type"}), 400
    
    survey_number = data['survey_number'].strip().upper()
    
    # Generate unique land ID
    land_id = f"LAND{uuid.uuid4().hex[:8].upper()}"
    tx_id = f"TXN{uuid.uuid4().hex[:8].upper()}"
    timestamp = datetime.utcnow().strftime('%Y-%m-%dT%H:%M:%SZ')
    
    conn = get_db()
    cursor = conn.cursor()
    
    try:
        # Check if land with this survey number already exists
        cursor.execute("SELECT land_id, owner FROM lands WHERE survey_number = ?", (survey_number,))
        existing_land = cursor.fetchone()
        
        if existing_land:
            conn.close()
            return jsonify({
                "error": f"Land with Survey Number {survey_number} is already registered",
                "existing_land_id": existing_land['land_id'],
                "current_owner": existing_land['owner']
            }), 409  # 409 Conflict
        
        # Insert land record
        cursor.execute('''
            INSERT INTO lands (land_id, survey_number, owner, area, location, property_type, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', (land_id, survey_number, data['owner'], data['area'], data['location'], 
              data['property_type'], timestamp))
        
        # Create transaction record
        land_details = json.dumps({
            "survey_number": survey_number,
            "owner": data['owner'],
            "area": data['area'],
            "location": data['location'],
            "property_type": data['property_type']
        })
        
        cursor.execute('''
            INSERT INTO transactions (tx_id, type, land_id, land_details, timestamp, status)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', (tx_id, 'REGISTER', land_id, land_details, timestamp, 'PENDING'))
        
        conn.commit()
        print(f"✓ Land registration request created: {land_id}")
        
        return jsonify({
            "message": "Land registration request submitted",
            "tx_id": tx_id,
            "land_id": land_id,
            "status": "PENDING"
        }), 201
        
    except sqlite3.IntegrityError as e:
        return jsonify({"error": str(e)}), 400
    finally:
        conn.close()


@app.route('/land/transfer', methods=['POST'])
def transfer_land():
    """
    Request land transfer
    
    Request body:
    {
        "land_id": "LAND12345678",
        "seller": "Alice Sharma",
        "buyer": "Bob Kumar"
    }
    """
    data = request.get_json()
    
    required_fields = ['land_id', 'seller', 'buyer']
    if not all(field in data for field in required_fields):
        return jsonify({"error": "Missing required fields"}), 400
    
    land_id = data['land_id']
    
    conn = get_db()
    cursor = conn.cursor()
    
    # Check if land exists
    cursor.execute("SELECT * FROM lands WHERE land_id = ?", (land_id,))
    land = cursor.fetchone()
    
    if not land:
        conn.close()
        return jsonify({"error": "Land not found"}), 404
    
    # Verify seller is current owner
    if land['owner'] != data['seller']:
        conn.close()
        return jsonify({"error": "Seller is not the current owner"}), 400
    
    # Create transfer transaction
    tx_id = f"TXN{uuid.uuid4().hex[:8].upper()}"
    timestamp = datetime.utcnow().strftime('%Y-%m-%dT%H:%M:%SZ')
    
    try:
        cursor.execute('''
            INSERT INTO transactions (tx_id, type, land_id, seller, buyer, timestamp, status)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', (tx_id, 'TRANSFER', land_id, data['seller'], data['buyer'], timestamp, 'PENDING'))
        
        conn.commit()
        print(f"✓ Land transfer request created: {land_id} from {data['seller']} to {data['buyer']}")
        
        return jsonify({
            "message": "Land transfer request submitted",
            "tx_id": tx_id,
            "land_id": land_id,
            "status": "PENDING"
        }), 201
        
    except sqlite3.IntegrityError as e:
        return jsonify({"error": str(e)}), 400
    finally:
        conn.close()


@app.route('/transactions/pending', methods=['GET'])
def get_pending_transactions():
    """Get all pending transactions that are verified by SRO and ready for blockchain inclusion"""
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute('''
        SELECT tx_id, type, land_id, land_details, seller, buyer, verifying_sro, timestamp, status
        FROM transactions
        WHERE status = 'PENDING' AND verified_by_sro = 1
        ORDER BY timestamp ASC
    ''')
    
    transactions = []
    for row in cursor.fetchall():
        tx = dict(row)
        # Rename fields to match frontend expectations
        transaction = {
            'transaction_id': tx['tx_id'],
            'transaction_type': tx['type'],
            'land_id': tx['land_id'],
            'data': json.loads(tx['land_details']) if tx['land_details'] else {},
            'seller': tx.get('seller'),
            'buyer': tx.get('buyer'),
            'verifying_sro': tx['verifying_sro'],
            'timestamp': tx['timestamp'],
            'status': tx['status']
        }
        transactions.append(transaction)
    
    conn.close()
    
    return jsonify({
        "pending_transactions": transactions,
        "count": len(transactions)
    })


@app.route('/transactions/unverified', methods=['GET'])
def get_unverified_transactions():
    """Get all transactions waiting for SRO physical verification"""
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute('''
        SELECT tx_id, type, land_id, land_details, seller, buyer, timestamp, status
        FROM transactions
        WHERE verified_by_sro = 0
        ORDER BY timestamp ASC
    ''')
    
    transactions = []
    for row in cursor.fetchall():
        tx = dict(row)
        # Rename fields to match frontend expectations
        transaction = {
            'transaction_id': tx['tx_id'],
            'transaction_type': tx['type'],
            'land_id': tx['land_id'],
            'data': json.loads(tx['land_details']) if tx['land_details'] else {},
            'seller': tx.get('seller'),
            'buyer': tx.get('buyer'),
            'timestamp': tx['timestamp'],
            'status': tx['status']
        }
        transactions.append(transaction)
    
    conn.close()
    
    return jsonify({
        "unverified_transactions": transactions,
        "count": len(transactions)
    })


@app.route('/transactions/<tx_id>/sro-verify', methods=['PUT'])
def sro_verify_transaction(tx_id):
    """
    SRO physically verifies a transaction after checking legal documents
    This is the FIRST step - done at SRO office with physical documents
    
    Request body:
    {
        "sro_id": "SRO_NODE_1"
    }
    """
    data = request.get_json()
    
    if not data or 'sro_id' not in data:
        return jsonify({"error": "Missing sro_id"}), 400
    
    conn = get_db()
    cursor = conn.cursor()
    
    # Check if transaction exists
    cursor.execute("SELECT * FROM transactions WHERE tx_id = ?", (tx_id,))
    tx = cursor.fetchone()
    
    if not tx:
        conn.close()
        return jsonify({"error": "Transaction not found"}), 404
    
    if tx['verified_by_sro']:
        conn.close()
        return jsonify({"error": "Transaction already verified by SRO"}), 400
    
    # Mark as verified by SRO
    cursor.execute('''
        UPDATE transactions
        SET verified_by_sro = 1, verifying_sro = ?
        WHERE tx_id = ?
    ''', (data['sro_id'], tx_id))
    
    conn.commit()
    conn.close()
    
    print(f"✓ Transaction {tx_id} physically verified by {data['sro_id']} (ready for blockchain)")
    
    return jsonify({
        "message": "Transaction verified by SRO - ready for blockchain inclusion",
        "tx_id": tx_id,
        "verified_by": data['sro_id']
    })


@app.route('/transactions/<tx_id>/verify', methods=['PUT'])
def verify_transaction(tx_id):
    """
    Mark a transaction as verified by an authority node
    (This is for backward compatibility - not used in current flow)
    
    Request body:
    {
        "verifier": "SRO_NODE_1"
    }
    """
    data = request.get_json()
    
    if not data or 'verifier' not in data:
        return jsonify({"error": "Missing verifier"}), 400
    
    conn = get_db()
    cursor = conn.cursor()
    
    # Update transaction status
    cursor.execute('''
        UPDATE transactions
        SET status = 'VERIFIED', verifier = ?
        WHERE tx_id = ?
    ''', (data['verifier'], tx_id))
    
    if cursor.rowcount == 0:
        conn.close()
        return jsonify({"error": "Transaction not found"}), 404
    
    # If REGISTER transaction, also update land verification
    cursor.execute("SELECT type, land_id FROM transactions WHERE tx_id = ?", (tx_id,))
    tx = cursor.fetchone()
    
    if tx and tx['type'] == 'REGISTER':
        cursor.execute("UPDATE lands SET verified = 1 WHERE land_id = ?", (tx['land_id'],))
    
    conn.commit()
    conn.close()
    
    print(f"✓ Transaction {tx_id} verified by {data['verifier']}")
    
    return jsonify({
        "message": "Transaction verified successfully",
        "tx_id": tx_id
    })


@app.route('/transactions/<tx_id>/add-to-blockchain', methods=['PUT'])
def add_transaction_to_blockchain(tx_id):
    """
    Mark a transaction as added to blockchain (sets block_hash)
    Called after block is accepted by consensus
    
    Request body:
    {
        "block_hash": "abc123..."
    }
    """
    data = request.get_json()
    
    if not data or 'block_hash' not in data:
        return jsonify({"error": "Missing block_hash"}), 400
    
    conn = get_db()
    cursor = conn.cursor()
    
    # Update transaction with block hash (indicates it's in blockchain)
    cursor.execute('''
        UPDATE transactions
        SET block_hash = ?, status = 'COMPLETED'
        WHERE tx_id = ?
    ''', (data['block_hash'], tx_id))
    
    if cursor.rowcount == 0:
        conn.close()
        return jsonify({"error": "Transaction not found"}), 404
    
    # If TRANSFER transaction, update land ownership
    cursor.execute("SELECT type, land_id, buyer FROM transactions WHERE tx_id = ?", (tx_id,))
    tx = cursor.fetchone()
    
    if tx and tx['type'] == 'TRANSFER' and tx['buyer']:
        cursor.execute("UPDATE lands SET owner = ? WHERE land_id = ?", (tx['buyer'], tx['land_id']))
        print(f"✓ Land {tx['land_id']} ownership transferred to {tx['buyer']}")
    
    conn.commit()
    conn.close()
    
    print(f"✓ Transaction {tx_id} added to blockchain (block: {data['block_hash'][:16]}...)")
    
    return jsonify({
        "message": "Transaction added to blockchain",
        "tx_id": tx_id,
        "block_hash": data['block_hash']
    })


@app.route('/transactions/<tx_id>', methods=['GET'])
def get_transaction(tx_id):
    """Get transaction details"""
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute('''
        SELECT tx_id, type, land_id, land_details, seller, buyer, verifier, timestamp, status, verifying_sro
        FROM transactions
        WHERE tx_id = ?
    ''', (tx_id,))
    
    row = cursor.fetchone()
    conn.close()
    
    if not row:
        return jsonify({"error": "Transaction not found"}), 404
    
    tx = dict(row)
    # Parse land_details JSON if it exists
    if tx['land_details']:
        tx['land_details'] = json.loads(tx['land_details'])
    else:
        tx['land_details'] = {}
    
    # Use verifying_sro as verifier if verifier is not set
    if not tx.get('verifier') and tx.get('verifying_sro'):
        tx['verifier'] = tx['verifying_sro']
    
    return jsonify(tx)


@app.route('/lands', methods=['GET'])
def get_all_lands():
    """Get all registered lands"""
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute('''
        SELECT land_id, owner, area, location, property_type, created_at, verified
        FROM lands
        ORDER BY created_at DESC
    ''')
    
    lands = [dict(row) for row in cursor.fetchall()]
    conn.close()
    
    return jsonify({
        "lands": lands,
        "count": len(lands)
    })


@app.route('/lands/<land_id>', methods=['GET'])
def get_land(land_id):
    """Get land details"""
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute('''
        SELECT land_id, owner, area, location, property_type, created_at, verified
        FROM lands
        WHERE land_id = ?
    ''', (land_id,))
    
    row = cursor.fetchone()
    conn.close()
    
    if not row:
        return jsonify({"error": "Land not found"}), 404
    
    return jsonify(dict(row))


@app.route('/land/all', methods=['GET'])
def get_all_lands_alias():
    """Get all lands (alias for /lands for frontend compatibility)"""
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute('''
        SELECT land_id, owner, area, location, property_type, created_at, verified
        FROM lands
        ORDER BY created_at DESC
    ''')
    
    lands = [dict(row) for row in cursor.fetchall()]
    conn.close()
    
    # Return just the array for frontend compatibility
    return jsonify(lands)


@app.route('/transactions/all', methods=['GET'])
def get_all_transactions():
    """Get all transactions"""
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute('''
        SELECT tx_id as transaction_id, type as transaction_type, land_id, 
               land_details as data, seller, buyer, verified_by_sro, 
               verifying_sro, timestamp, status, block_hash
        FROM transactions
        ORDER BY timestamp DESC
    ''')
    
    rows = cursor.fetchall()
    conn.close()
    
    transactions = []
    for row in rows:
        tx = dict(row)
        # Parse land_details JSON
        if tx.get('data'):
            tx['data'] = json.loads(tx['data'])
        transactions.append(tx)
    
    return jsonify(transactions)


@app.route('/blockchain', methods=['GET'])
def get_blockchain():
    """Get blockchain from bootstrap node"""
    import requests
    try:
        response = requests.get('http://localhost:5000/ledger')
        return jsonify(response.json())
    except Exception as e:
        return jsonify({"error": str(e), "chain": [], "is_valid": False}), 500


@app.route('/blockchain/info', methods=['GET'])
def get_blockchain_info():
    """Get blockchain information"""
    import requests
    try:
        response = requests.get('http://localhost:5000/ledger')
        blockchain = response.json()
        return jsonify({
            "length": len(blockchain.get('chain', [])),
            "is_valid": blockchain.get('is_valid', False),
            "last_block": blockchain.get('chain', [])[-1] if blockchain.get('chain') else None
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == '__main__':
    init_db()
    print("\n" + "="*50)
    print("🚀 CENTRALIZED TRANSACTION SERVICE STARTED")
    print("="*50)
    print("Database: transactions.db")
    print("="*50 + "\n")
    
    app.run(host='0.0.0.0', port=8000, debug=True)
