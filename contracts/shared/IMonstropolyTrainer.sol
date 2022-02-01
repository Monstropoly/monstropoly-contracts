pragma solidity 0.8.9;

/// @title The interface for MonstropolyTrainer
/// @notice Increments NFTs stats
/// @dev Burns and mints a new NFT with incremented stat
interface IMonstropolyTrainer {

    /// @notice Emitted when price is updated
    /// @param asset Asset id
    /// @param statIndex Index of the stats array
    /// @param increment Amount of units to increment
    /// @param price New price
    event UpdatePrice(uint asset, uint statIndex, uint increment, uint price);

    /// @notice Emitted when stat is trained
    /// @param tokenId Unique uint identificator of NFT
    /// @param statIndex Index of the stats array
    /// @param increment Amount of units to increment
    /// @param price Charged price
    event TrainStat(uint tokenId, uint statIndex, uint increment, uint price);

    /// @notice Sets address for trusted MonstropolyRelayer
    /// @param _forwarder MonstropolyRelayer address
    function setTrustedForwarder(address _forwarder) external;

    /// @notice Updates prices by asset_, statIndex_ and increment_
    /// @param asset_ Array with assets
    /// @param statIndex_ Array with statIndexes
    /// @param increment_ Array with increments
    /// @param price_ Array with prices
    function updatePrice(uint[] calldata asset_, uint[] calldata statIndex_, uint[] calldata increment_, uint[] calldata price_) external;
    
    /// @notice Increments stat of a NFT
    /// @dev Burns old one and mints a new trained one
    /// @param tokenId_ Unique uint identificator of NFT
    /// @param statIndex_ Index of the stat to train
    /// @param increment_ Amount of units to increment
    /// @return TokenId of trained minted NFT
    function trainStat(uint tokenId_, uint statIndex_, uint increment_) external returns(uint);
}