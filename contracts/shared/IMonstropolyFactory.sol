pragma solidity 0.8.9;

import "./IMonstropolyData.sol";

contract IMonstropolyFactory{
    struct Hero{
        address owner;
        string genetic;
        uint bornAt;
        uint256 index;
        bool exists;
    }
    function transferFrom(address from, address buyer, uint256 tokenId) public{}
    function balanceOf(address tokenOwner) public view returns (uint256) {}
    function burn(uint256 _value) public{}
    function allowance(address from, address delegate) public view returns (uint) {}
    function burnFrom(address from, uint256 tokenId) public returns (bool) {}
    function heroeOfId(uint256 tokenId) public view returns(Hero memory) { }
    function freeGen(string memory gen) public view returns(bool) {}
    function ownerOf(uint256 tokenId) public view virtual returns (address) { }
    function mint(address to, string memory genes) public virtual returns(uint){ }
    function isApproved(address to, uint256 tokenId) public view returns (bool){}
    function lockHero(uint256 tokenId ) public{}
    function unlockHero(uint256 tokenId) public {}
    function isLocked(uint256 tokenId) public view returns(bool) {}
    function heroesId() public view returns(uint256[] memory){}
    function gens(bytes32 _hash) public view returns(bool){}
}