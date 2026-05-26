// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract AgentIdentity is ERC721, Ownable {
    uint256 private _nextTokenId;

    struct AgentRecord {
        uint256 tokenId;
        address owner;
        string agentName;
        bytes32 lastStrategyHash;
        uint256 lastPerformance;
        uint256 createdAt;
        uint256 updatedAt;
    }

    mapping(uint256 => AgentRecord) public agents;
    mapping(address => uint256) public agentOf;

    event StrategyLogged(uint256 indexed tokenId, bytes32 strategyHash, uint256 performance);

    constructor() ERC721("AI Trading Agent", "AITRADE") Ownable(msg.sender) {}

    function mintAgent(string memory agentName) external returns (uint256) {
        require(agentOf[msg.sender] == 0, "Already has an agent");

        uint256 tokenId = ++_nextTokenId;
        _safeMint(msg.sender, tokenId);

        agents[tokenId] = AgentRecord({
            tokenId: tokenId,
            owner: msg.sender,
            agentName: agentName,
            lastStrategyHash: bytes32(0),
            lastPerformance: 0,
            createdAt: block.timestamp,
            updatedAt: block.timestamp
        });

        agentOf[msg.sender] = tokenId;
        return tokenId;
    }

    function logStrategy(bytes32 strategyHash, uint256 performance) external {
        uint256 tokenId = agentOf[msg.sender];
        require(tokenId != 0, "No agent found");

        agents[tokenId].lastStrategyHash = strategyHash;
        agents[tokenId].lastPerformance = performance;
        agents[tokenId].updatedAt = block.timestamp;

        emit StrategyLogged(tokenId, strategyHash, performance);
    }

    function getAgent(address owner) external view returns (AgentRecord memory) {
        uint256 tokenId = agentOf[owner];
        require(tokenId != 0, "No agent found");
        return agents[tokenId];
    }
}
