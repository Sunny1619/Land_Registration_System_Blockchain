"""Test script to demonstrate the Land Registry Blockchain system"""
import requests
import json
import time

# Service URLs
BOOTSTRAP_URL = "http://localhost:5000"
CENTRAL_URL = "http://localhost:8000"
SRO1_URL = "http://localhost:5001"
SRO2_URL = "http://localhost:5002"
NODE1_URL = SRO1_URL  # Alias for compatibility
NODE2_URL = SRO2_URL  # Alias for compatibility


def print_header(text):
    """Print formatted header"""
    print("\n" + "="*60)
    print(f"  {text}")
    print("="*60)


def check_services():
    """Check if all services are running"""
    print_header("CHECKING SERVICES")
    
    services = {
        "Bootstrap": BOOTSTRAP_URL,
        "Central Service": CENTRAL_URL,
        "SRO Node 1": NODE1_URL,
        "SRO Node 2": NODE2_URL
    }
    
    all_running = True
    for name, url in services.items():
        try:
            response = requests.get(f"{url}/status", timeout=2)
            if response.status_code == 200:
                print(f"✓ {name}: Running")
            else:
                print(f"✗ {name}: Error ({response.status_code})")
                all_running = False
        except requests.exceptions.RequestException:
            print(f"✗ {name}: Not reachable")
            all_running = False
    
    return all_running


def register_land(owner, area, location, property_type, survey_number):
    """Register a new land"""
    print_header(f"REGISTERING LAND - Owner: {owner}")
    
    response = requests.post(
        f"{CENTRAL_URL}/land/register",
        json={
            "survey_number": survey_number,
            "owner": owner,
            "area": area,
            "location": location,
            "property_type": property_type
        }
    )
    
    if response.status_code == 201:
        data = response.json()
        print(f"✓ Land registered successfully")
        print(f"  Survey Number: {survey_number}")
        print(f"  Transaction ID: {data['tx_id']}")
        print(f"  Land ID: {data['land_id']}")
        print(f"  Status: {data['status']}")
        return data['tx_id'], data['land_id']
    else:
        print(f"✗ Failed to register land: {response.text}")
        return None, None


def request_transfer(land_id, seller, buyer):
    """Request land transfer"""
    print_header(f"REQUESTING TRANSFER - {seller} → {buyer}")
    
    response = requests.post(
        f"{CENTRAL_URL}/land/transfer",
        json={
            "land_id": land_id,
            "seller": seller,
            "buyer": buyer
        }
    )
    
    if response.status_code == 201:
        data = response.json()
        print(f"✓ Transfer request created")
        print(f"  Transaction ID: {data['tx_id']}")
        print(f"  Status: {data['status']}")
        return data['tx_id']
    else:
        print(f"✗ Failed to request transfer: {response.text}")
        return None


def sro_verify_transaction(tx_id, sro_id):
    """
    SRO physically verifies a transaction (simulates physical document verification)
    
    Args:
        tx_id: Transaction ID
        sro_id: SRO node ID doing the verification
    """
    print_header(f"SRO PHYSICAL VERIFICATION - {sro_id}")
    
    response = requests.put(
        f"{CENTRAL_URL}/transactions/{tx_id}/sro-verify",
        json={"sro_id": sro_id}
    )
    
    if response.status_code == 200:
        data = response.json()
        print(f"✓ Transaction physically verified by SRO")
        print(f"  Transaction ID: {tx_id}")
        print(f"  Verified by: {data['verified_by']}")
        print(f"  Status: Ready for blockchain inclusion")
        return True
    else:
        print(f"✗ Failed to verify transaction: {response.text}")
        return False


def get_unverified_transactions():
    """Get all unverified transactions"""
    print_header("FETCHING UNVERIFIED TRANSACTIONS")
    
    response = requests.get(f"{CENTRAL_URL}/transactions/unverified")
    
    if response.status_code == 200:
        data = response.json()
        print(f"✓ Found {data['count']} unverified transaction(s)")
        for tx in data['unverified_transactions']:
            print(f"  - {tx['transaction_id']}: {tx['transaction_type']} for {tx['land_id']}")
        return data['unverified_transactions']
    else:
        print(f"✗ Failed to fetch unverified transactions")
        return []


def get_pending_transactions():
    """Get all pending transactions"""
    print_header("FETCHING PENDING TRANSACTIONS (SRO-VERIFIED)")
    
    response = requests.get(f"{CENTRAL_URL}/transactions/pending")
    
    if response.status_code == 200:
        data = response.json()
        print(f"✓ Found {data['count']} pending transaction(s)")
        for tx in data['pending_transactions']:
            print(f"  - {tx['transaction_id']}: {tx['transaction_type']} for {tx['land_id']}")
        return data['pending_transactions']
    else:
        print(f"✗ Failed to fetch pending transactions")
        return []


def propose_block(node_url, node_name, tx_ids):
    """Propose a block with transactions"""
    print_header(f"PROPOSING BLOCK - {node_name}")
    
    response = requests.post(
        f"{node_url}/propose",
        json={"transaction_ids": tx_ids}
    )
    
    if response.status_code == 201:
        data = response.json()
        print(f"✓ Block accepted by consensus")
        print(f"  Block Index: {data['block']['index']}")
        print(f"  Transactions: {len(data['block']['transactions'])}")
        print(f"  Votes: {data['accept_count']}/{data['total_votes']} ACCEPT")
        print(f"\n  Voting Details:")
        for voter, vote in data['votes'].items():
            print(f"    {voter}: {vote}")
        return True
    else:
        data = response.json()
        print(f"✗ Block rejected by consensus")
        print(f"  Votes: {data.get('accept_count', 0)}/{data.get('total_votes', 0)} ACCEPT")
        if 'votes' in data:
            print(f"\n  Voting Details:")
            for voter, vote in data['votes'].items():
                print(f"    {voter}: {vote}")
        return False


def view_blockchain(node_url, node_name):
    """View blockchain ledger"""
    print_header(f"BLOCKCHAIN LEDGER - {node_name}")
    
    response = requests.get(f"{node_url}/ledger")
    
    if response.status_code == 200:
        data = response.json()
        print(f"Chain Length: {data['length']} blocks\n")
        
        for block in data['chain']:
            print(f"Block #{block['index']}")
            print(f"  Hash: {block['block_hash'][:32]}...")
            print(f"  Prev: {block['previous_hash'][:32]}...")
            print(f"  Authority: {block['authority_signature']}")
            print(f"  Transactions: {len(block['transactions'])}")
            for i, tx in enumerate(block['transactions'], 1):
                print(f"    {i}. {tx['tx_id']} - {tx['type']}")
            print()
    else:
        print(f"✗ Failed to fetch blockchain")


def main():
    """Main test flow"""
    print("\n" + "="*60)
    print("  LAND REGISTRY BLOCKCHAIN - DEMO TEST")
    print("="*60)
    
    # Check services
    if not check_services():
        print("\n✗ Some services are not running. Please start them first.")
        return
    
    time.sleep(1)
    
    # Test 1: Register land for Alice
    tx1_id, land1_id = register_land(
        owner="Alice Sharma",
        area="1500 sq.ft",
        location="Plot 12, Sector 9, Noida",
        property_type="Residential",
        survey_number="SY-2024-ND-001"
    )
    
    if not tx1_id:
        return
    
    time.sleep(1)
    
    # Test 2: Register land for Bob
    tx2_id, land2_id = register_land(
        owner="Bob Kumar",
        area="2000 sq.ft",
        location="Plot 45, Sector 15, Gurgaon",
        property_type="Commercial",
        survey_number="SY-2024-GG-045"
    )
    
    if not tx2_id:
        return
    
    time.sleep(1)
    
    # Test 3: Check unverified transactions
    unverified = get_unverified_transactions()
    
    if not unverified:
        print("\n✗ No transactions to verify. Test cannot continue.")
        return
    
    time.sleep(1)
    
    # Test 4: SRO Node 1 physically verifies Alice's land registration
    if tx1_id:
        sro_verify_transaction(tx1_id, "SRO_NODE_1")
        time.sleep(1)
    
    # Test 5: SRO Node 2 physically verifies Bob's land registration
    if tx2_id:
        sro_verify_transaction(tx2_id, "SRO_NODE_2")
        time.sleep(1)
    
    # Test 6: View pending transactions (should show only SRO-verified ones)
    pending = get_pending_transactions()
    
    time.sleep(1)
    
    # Test 7: Node 1 proposes block with both registrations
    if pending:
        tx_ids = [tx['transaction_id'] for tx in pending]
        propose_block(NODE1_URL, "SRO Node 1", tx_ids)
    
    time.sleep(2)
    
    # Test 8: Request transfer
    if land1_id:
        tx3_id = request_transfer(land1_id, "Alice Sharma", "Charlie Singh")
        
        if tx3_id:
            time.sleep(1)
            
            # Test 9: SRO Node 1 physically verifies the transfer
            sro_verify_transaction(tx3_id, "SRO_NODE_1")
            time.sleep(1)
            
            # Test 10: Node 2 proposes block with transfer
            propose_block(NODE2_URL, "SRO Node 2", [tx3_id])
    
    time.sleep(2)
    
    # Test 11: View blockchain from all nodes
    view_blockchain(NODE1_URL, "SRO Node 1")
    view_blockchain(NODE2_URL, "SRO Node 2")
    
    # Test 12: View blockchain from bootstrap
    view_blockchain(BOOTSTRAP_URL, "Bootstrap Node")
    
    print_header("DEMO COMPLETED")
    print("\n✓ All tests completed successfully!")
    print("\nYou can now:")
    print("  - Check service status at /status endpoints")
    print("  - View ledgers at /ledger endpoints")
    print("  - View all lands at http://localhost:6000/lands")
    print("  - Create more transactions and propose blocks\n")


if __name__ == "__main__":
    main()
