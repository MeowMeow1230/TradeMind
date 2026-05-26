import os
import json
import hashlib
from web3 import Web3
from pathlib import Path

MANTLE_TESTNET_RPC = "https://rpc.sepolia.mantle.xyz"
CHAIN_ID = 5003

_CONTRACT_DIR = Path(__file__).parent.parent.parent / "artifacts" / "contracts" / "AgentIdentity.sol"
_ABI_PATH = _CONTRACT_DIR / "AgentIdentity.json"


def _get_contract(w3: Web3, contract_address: str):
    with open(_ABI_PATH) as f:
        abi = json.load(f)["abi"]
    return w3.eth.contract(address=contract_address, abi=abi)


def deploy_contract(private_key: str) -> str:
    """Deploy AgentIdentity contract and return address."""
    w3 = Web3(Web3.HTTPProvider(MANTLE_TESTNET_RPC))
    account = w3.eth.account.from_key(private_key)

    with open(_ABI_PATH) as f:
        artifact = json.load(f)

    contract = w3.eth.contract(abi=artifact["abi"], bytecode=artifact["bytecode"])
    tx = contract.constructor().build_transaction({
        "from": account.address,
        "nonce": w3.eth.get_transaction_count(account.address),
        "chainId": CHAIN_ID,
    })

    signed = account.sign_transaction(tx)
    tx_hash = w3.eth.send_raw_transaction(signed.raw_transaction)
    receipt = w3.eth.wait_for_transaction_receipt(tx_hash)
    return receipt.contractAddress


def log_strategy_to_chain(
    contract_address: str,
    private_key: str,
    code: str,
    sharpe_ratio: float,
) -> str:
    """Hash strategy code and log to Mantle. Returns transaction hash."""
    w3 = Web3(Web3.HTTPProvider(MANTLE_TESTNET_RPC))
    account = w3.eth.account.from_key(private_key)
    contract = _get_contract(w3, contract_address)

    strategy_hash = "0x" + hashlib.sha256(code.encode()).hexdigest()
    performance = int(sharpe_ratio * 1_000_000)

    tx = contract.functions.logStrategy(
        bytes.fromhex(strategy_hash[2:]),
        performance
    ).build_transaction({
        "from": account.address,
        "nonce": w3.eth.get_transaction_count(account.address),
        "chainId": CHAIN_ID,
    })

    signed = account.sign_transaction(tx)
    tx_hash = w3.eth.send_raw_transaction(signed.raw_transaction)
    receipt = w3.eth.wait_for_transaction_receipt(tx_hash)
    return receipt.transactionHash.hex()
