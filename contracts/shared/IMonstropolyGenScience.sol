pragma solidity 0.8.9;


interface IMonstropolyGenScience{
    function generateAsset(uint256 asset, bool _vip) external returns(string memory);
    function generateAssetView(uint256 asset, uint256 _random, bool _vip) external view returns(string memory gen);
    function generateType(uint256 asset, uint256 _type, bool _vip) external returns(string memory);
    function generateTypeView(uint256 asset, uint256 _type, uint256 _random, bool _vip) external view returns(string memory gen);
    function generateRarity(uint256 asset, uint256 rarity) external returns(string memory);
    function generateRarityView(uint256 asset, uint256 rarity, uint256 _random) external view returns(string memory gen);
    function generateFromRoot(uint256[3] memory rootValues, bool[3] memory preFixed, bool _vip) external returns(string memory);
    function generateFromRootView(uint256[3] memory rootValues, bool[3] memory preFixed, uint256 _random, bool _vip) external view returns(string memory gen);
    function generateGenView(uint256 _random, string memory _genRoot, string memory _genStats, string memory _genAttributes, bool _vip) external view returns (string memory gen, uint256);
    function generateGen(string memory _genRoot, string memory _genStats, string memory _genAttributes, bool _vip) external returns (string memory gen);    
}