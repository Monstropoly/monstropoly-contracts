pragma solidity 0.8.9;

/// @title The interface for MonstropolyGenScience
/// @notice Creates NFT's genetics
/// @dev Creates genetics from a random base
interface IMonstropolyGenScience {

    /// @notice Returns a genetic of certain asset
    /// @dev Modifies random_ to accomplish expectations
    /// @param asset_ Desired asset
    /// @param random_ Base random hexadecimal string
    /// @param vip_ Used to compute final rarity based on probabilities
    /// @return gen_ Final NFT genetic
    /// @return free_ Wether or not genetic is free
    function generateAssetView(uint asset_, string memory random_, bool vip_) external view returns(string memory gen_, bool free_);
    
    /// @notice Returns a genetic of certain asset
    /// @dev Modifies random_ to accomplish expectations
    /// @dev Root corresponds to Asset, Type and Rarity
    /// @param rootValues_ Desired root values
    /// @param preFixed_ Wether or not want to use rootValues_[x] value
    /// @param random_ Base random hexadecimal string
    /// @param vip_ Used to compute final rarity based on probabilities
    /// @return gen_ Final NFT genetic
    /// @return free_ Wether or not genetic is free
    function generateFromRootView(uint[3] memory rootValues_, bool[3] memory preFixed_, string memory random_, bool vip_) external view returns(string memory gen_, bool free_);
    
    /// @notice Returns a genetic of certain asset
    /// @dev Modifies random_ to accomplish expectations
    /// @dev Uses atomically previously setted random value and resets it
    /// @param asset_ Desired asset
    /// @param vip_ Used to compute final rarity based on probabilities
    /// @return gen_ Final NFT genetic
    function generateAsset(uint asset_, bool vip_) external returns(string memory gen_);
    
    /// @notice Returns a genetic of certain asset
    /// @dev Modifies random_ to accomplish expectations
    /// @dev Root corresponds to Asset, Type and Rarity
    /// @dev Uses atomically previously setted random value and resets it
    /// @param rootValues_ Desired root values
    /// @param preFixed_ Wether or not want to use rootValues_[x] value
    /// @param vip_ Used to compute final rarity based on probabilities
    /// @return gen_ Final NFT genetic
    function generateFromRoot(uint[3] memory rootValues_, bool[3] memory preFixed_, bool vip_) external returns(string memory gen_);
    
    /// @notice Sets random base value to compute genetic
    /// @dev Uses it atomically just after setting it
    /// @dev Also sets randomBlock to be sure is used atomically
    /// @dev Must match current lengths
    /// @param random_ Base random hexadecimal string
    function setRandom(string calldata random_) external; 
}