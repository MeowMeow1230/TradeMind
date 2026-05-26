"""Mantle blockchain integration for logging strategy hashes on-chain."""

import hashlib
import json

from web3 import Web3

MANTLE_SEPOLIA_RPC = "https://rpc.sepolia.mantle.xyz"


def log_strategy_to_chain(
    contract_address: str,
    private_key: str,
    code: str,
    sharpe_ratio: float,
) -> str:
    """Log a strategy hash and sharpe ratio to the Mantle Sepolia chain.

    Returns the transaction hash.
    """
    w3 = Web3(Web3.HTTPProvider(MANTLE_SEPOLIA_RPC))

    strategy_hash = hashlib.sha256(code.encode()).hexdigest()

    # Minimal ABI for a simple logging contract
    abi = json.dumps([
        {
            "name": "logStrategy",
            "type": "function",
            "inputs": [
                {"name": "hash", "type": "bytes32"},
                {"name": "sharpe", "type": "uint256"},
            ],
            "outputs": [],
            "stateMutability": "nonpayable",
        }
    ])

    contract = w3.eth.contract(address=Web3.to_checksum_address(contract_address), abi=abi)
    account = w3.eth.account.from_key(private_key)

    # Scale sharpe to uint256 (multiply by 1e18 for fixed-point)
    sharpe_scaled = int(sharpe_ratio * 1e18)

    tx = contract.functions.logStrategy(
        Web3.to_bytes(hexstr=strategy_hash),
        sharpe_scaled,
    ).build_transaction({
        "from": account.address,
        "nonce": w3.eth.get_transaction_count(account.address),
        "gas": 200_000,
        "gasPrice": w3.eth.gas_price,
    })

    signed = account.sign_transaction(tx)
    tx_hash = w3.eth.send_raw_transaction(signed.raw_transaction)
    return tx_hash.hex()
