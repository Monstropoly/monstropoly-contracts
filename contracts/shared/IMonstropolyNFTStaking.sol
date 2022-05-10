interface IMonstropolyNFTStaking {
  event StakeNFT(uint256 indexed tokenId, address indexed staker);
  event UnstakeNFT(uint256 indexed tokenId);
  function stake ( uint256 tokenId ) external;
  function unstake ( uint256 tokenId ) external;
}
