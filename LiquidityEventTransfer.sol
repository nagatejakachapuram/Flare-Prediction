// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

// Make sure these are valid paths in your project
import "./library/flare-periphery-contracts/coston2/IEVMTransactionVerification.sol";

contract LiquidityEventListener {
    struct Log {
        address emitter;
        address contractAddress;
        bytes32 topic0;
        bytes32 topic1;
        bytes32 topic2;
        bytes32 topic3;
        bytes data;
        uint256 logIndex;
    }

    struct EVMTransactionData {
        address to;
        address from;
        uint256 value;
        uint256 gas;
        uint256 gasPrice;
        uint256 nonce;
        bytes input;
        uint256 blockNumber;
        uint256 timestamp;
        bytes32 txHash;
        Log[] logs;
    }

    struct Response {
        bytes32 requestId;
        EVMTransactionData data;
    }

    event LiquidityAdded(address indexed provider, uint256 amount0, uint256 amount1);

    struct LiquidityEvent {
        address provider;
        uint256 amount0;
        uint256 amount1;
    }

    LiquidityEvent[] public liquidityEvents;

    function collectLiquidityEvents(Response calldata dataWithProof) external {
        for (uint256 i = 0; i < dataWithProof.data.logs.length; i++) {
            Log calldata log = dataWithProof.data.logs[i];

            // This matches the keccak hash of your LiquidityAdded event signature
            if (
                log.topic0 ==
                keccak256("LiquidityAdded(address,uint256,uint256)")
            ) {
                address provider = address(uint160(uint256(log.topic1)));

                (uint256 amount0, uint256 amount1) = abi.decode(
                    log.data,
                    (uint256, uint256)
                );

                liquidityEvents.push(
                    LiquidityEvent({
                        provider: provider,
                        amount0: amount0,
                        amount1: amount1
                    })
                );
            }
        }
    }
}
