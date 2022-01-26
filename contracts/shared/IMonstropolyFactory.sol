pragma solidity 0.8.9;

import "./IMonstropolyData.sol";

contract IMonstropolyFactory{
    struct Token {
        string genetic;
        uint bornAt;
    }
    function transferFrom(address from, address buyer, uint256 tokenId) public{}
    function balanceOf(address tokenOwner) public view returns (uint256) {}
    function burn(uint256 tokenId) public{}
    function allowance(address from, address delegate) public view returns (uint) {}
    function tokenOfId(uint256 tokenId) public view returns(Token memory) { }
    function freeGen(string memory gen) public view returns(bool) {}
    function ownerOf(uint256 tokenId) public view virtual returns (address) { }
    function mint(address to, string memory genes) public virtual returns(uint){ }
    function isApproved(address to, uint256 tokenId) public view returns (bool){}
    function lockToken(uint256 tokenId ) public{}
    function unlockToken(uint256 tokenId) public {}
    function isLocked(uint256 tokenId) public view returns(bool) {}
}