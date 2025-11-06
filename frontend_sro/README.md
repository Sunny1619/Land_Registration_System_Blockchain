# SRO Portal

This is the Sub-Registrar Office (SRO) portal for the Land Registry Blockchain system.

## Features

- **Dashboard**: View node statistics and system status
- **Verify Transactions**: Physically verify land registration/transfer documents
- **Propose Blocks**: Create blocks with verified transactions and initiate consensus
- **View Blockchain**: Explore the complete blockchain ledger
- **Sync Ledger**: Synchronize blockchain with bootstrap node

## Running the Portal

```bash
cd frontend_sro
npm install
npm start
```

The portal will run on http://localhost:3001

## Node Selection

Use the dropdown in the navigation bar to select which SRO node you're operating as:
- SRO Node 1 (Port 5001)
- SRO Node 2 (Port 5002)
- SRO Node 3 (Port 5003)

## Workflow

1. **Verify Transactions**: Review unverified transactions and mark them as verified after checking physical documents
2. **Propose Blocks**: Select verified transactions and propose a block to add them to the blockchain
3. **Consensus**: All SRO nodes automatically vote on the proposed block
4. **Finalization**: If majority accepts, the block is added to all nodes' ledgers
