"""Utility functions for blockchain operations"""
import hashlib
import json
from datetime import datetime


def hash_block(block_data):
    """
    Generate SHA-256 hash of a block
    
    Args:
        block_data (dict): Block data to hash
        
    Returns:
        str: Hexadecimal hash string
    """
    # Create a deterministic string representation
    block_string = json.dumps(block_data, sort_keys=True)
    return hashlib.sha256(block_string.encode()).hexdigest()


def generate_authority_signature(node_id, timestamp):
    """
    Generate authority signature for a block
    
    Args:
        node_id (str): Node identifier (e.g., "SRO_NODE_1")
        timestamp (str): Block timestamp
        
    Returns:
        str: Authority signature
    """
    return f"{node_id}_{int(datetime.fromisoformat(timestamp.replace('Z', '+00:00')).timestamp())}"


def validate_transaction(transaction):
    """
    Validate transaction structure and required fields
    
    Args:
        transaction (dict): Transaction object
        
    Returns:
        tuple: (bool, str) - (is_valid, error_message)
    """
    required_fields = ['tx_id', 'type', 'timestamp']
    
    for field in required_fields:
        if field not in transaction:
            return False, f"Missing required field: {field}"
    
    if transaction['type'] not in ['REGISTER', 'TRANSFER']:
        return False, f"Invalid transaction type: {transaction['type']}"
    
    if transaction['type'] == 'REGISTER':
        if 'land_id' not in transaction or 'land_details' not in transaction:
            return False, "REGISTER transaction missing land_id or land_details"
    
    if transaction['type'] == 'TRANSFER':
        if not all(k in transaction for k in ['land_id', 'seller', 'buyer']):
            return False, "TRANSFER transaction missing required fields"
    
    return True, ""


def get_current_timestamp():
    """Get current UTC timestamp in ISO format"""
    return datetime.utcnow().strftime('%Y-%m-%dT%H:%M:%SZ')
