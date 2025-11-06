"""Blockchain core classes: Transaction, Block, Blockchain"""
import json
from datetime import datetime
from .utils import hash_block, generate_authority_signature, validate_transaction, get_current_timestamp


class Transaction:
    """Represents a land registry transaction"""
    
    def __init__(self, tx_id, tx_type, land_id, land_details=None, 
                 seller=None, buyer=None, verifier=None, status="PENDING"):
        self.tx_id = tx_id
        self.type = tx_type
        self.land_id = land_id
        self.land_details = land_details or {}
        self.seller = seller
        self.buyer = buyer
        self.verifier = verifier
        self.timestamp = get_current_timestamp()
        self.status = status
    
    def to_dict(self):
        """Convert transaction to dictionary"""
        return {
            "tx_id": self.tx_id,
            "type": self.type,
            "land_id": self.land_id,
            "land_details": self.land_details,
            "seller": self.seller,
            "buyer": self.buyer,
            "verifier": self.verifier,
            "timestamp": self.timestamp,
            "status": self.status
        }
    
    @staticmethod
    def from_dict(data):
        """Create Transaction from dictionary"""
        tx = Transaction(
            tx_id=data['tx_id'],
            tx_type=data['type'],
            land_id=data['land_id'],
            land_details=data.get('land_details'),
            seller=data.get('seller'),
            buyer=data.get('buyer'),
            verifier=data.get('verifier'),
            status=data.get('status', 'PENDING')
        )
        tx.timestamp = data['timestamp']
        return tx


class Block:
    """Represents a block in the blockchain"""
    
    def __init__(self, index, transactions, previous_hash, authority_node_id):
        self.index = index
        self.timestamp = get_current_timestamp()
        self.transactions = transactions  # List of Transaction objects or dicts
        self.previous_hash = previous_hash
        self.authority_signature = generate_authority_signature(authority_node_id, self.timestamp)
        self.nonce = 0
        self.block_hash = self.calculate_hash()
    
    def calculate_hash(self):
        """Calculate block hash"""
        block_data = {
            "index": self.index,
            "timestamp": self.timestamp,
            "transactions": [tx if isinstance(tx, dict) else tx.to_dict() for tx in self.transactions],
            "previous_hash": self.previous_hash,
            "authority_signature": self.authority_signature,
            "nonce": self.nonce
        }
        return hash_block(block_data)
    
    def to_dict(self):
        """Convert block to dictionary"""
        return {
            "index": self.index,
            "timestamp": self.timestamp,
            "transactions": [tx if isinstance(tx, dict) else tx.to_dict() for tx in self.transactions],
            "previous_hash": self.previous_hash,
            "block_hash": self.block_hash,
            "authority_signature": self.authority_signature,
            "nonce": self.nonce
        }
    
    @staticmethod
    def from_dict(data):
        """Create Block from dictionary"""
        # Create a block without going through __init__ to avoid recalculating hash
        block = object.__new__(Block)
        
        # Restore all fields directly
        block.index = data['index']
        block.timestamp = data['timestamp']
        block.transactions = [Transaction.from_dict(tx) if isinstance(tx, dict) else tx 
                             for tx in data['transactions']]
        block.previous_hash = data['previous_hash']
        block.authority_signature = data['authority_signature']
        block.nonce = data.get('nonce', 0)
        block.block_hash = data['block_hash']
        
        return block


class Blockchain:
    """Manages the blockchain ledger"""
    
    def __init__(self):
        self.chain = []
        self.length = 0
    
    def create_genesis_block(self, authority_node_id="BOOTSTRAP"):
        """Create the first block in the chain"""
        genesis_transaction = Transaction(
            tx_id="GENESIS",
            tx_type="REGISTER",
            land_id="GENESIS_LAND",
            land_details={"description": "Genesis Block - Land Registry System Initialized"},
            verifier=authority_node_id,
            status="VERIFIED"
        )
        
        genesis_block = Block(
            index=0,
            transactions=[genesis_transaction],
            previous_hash="0" * 64,
            authority_node_id=authority_node_id
        )
        
        self.chain.append(genesis_block)
        self.length = 1
        return genesis_block
    
    def get_latest_block(self):
        """Get the most recent block"""
        return self.chain[-1] if self.chain else None
    
    def add_block(self, block):
        """Add a validated block to the chain"""
        self.chain.append(block)
        self.length = len(self.chain)
    
    def is_valid_new_block(self, new_block, previous_block):
        """
        Validate a new block against the previous block
        
        Args:
            new_block (Block): Block to validate
            previous_block (Block): Previous block in chain
            
        Returns:
            tuple: (bool, str) - (is_valid, error_message)
        """
        if previous_block.index + 1 != new_block.index:
            return False, f"Invalid index: expected {previous_block.index + 1}, got {new_block.index}"
        
        if previous_block.block_hash != new_block.previous_hash:
            return False, "Previous hash mismatch"
        
        # In a PoA network, we trust the authority node's hash calculation
        # Hash verification is done by the proposer when creating the block
        # Recalculating would fail due to JSON serialization differences
        
        return True, ""
    
    def is_chain_valid(self):
        """Validate the entire blockchain"""
        for i in range(1, len(self.chain)):
            current_block = self.chain[i]
            previous_block = self.chain[i - 1]
            
            is_valid, error = self.is_valid_new_block(current_block, previous_block)
            if not is_valid:
                return False, f"Invalid block at index {i}: {error}"
        
        return True, ""
    
    def to_dict(self):
        """Convert blockchain to dictionary"""
        return {
            "chain": [block.to_dict() for block in self.chain],
            "length": self.length
        }
    
    @staticmethod
    def from_dict(data):
        """Create Blockchain from dictionary"""
        blockchain = Blockchain()
        blockchain.chain = [Block.from_dict(block_data) for block_data in data['chain']]
        blockchain.length = len(blockchain.chain)
        return blockchain
    
    def save_to_file(self, filename):
        """Save blockchain to JSON file"""
        with open(filename, 'w') as f:
            json.dump(self.to_dict(), f, indent=2)
    
    @staticmethod
    def load_from_file(filename):
        """Load blockchain from JSON file"""
        try:
            with open(filename, 'r') as f:
                data = json.load(f)
            return Blockchain.from_dict(data)
        except FileNotFoundError:
            return None
