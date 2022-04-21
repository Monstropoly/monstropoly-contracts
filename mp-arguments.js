const { ethers } = require('hardhat');
module.exports = [
    "0xCC18024a12FcF2099693cB6C22eb127765Ae6dbf", //admin
    "0x0DD1AC51cBaDD3e4DFa98DdD07E383d4706b7732", //treasury
    "0x40e14db292B9CeDf2E7FD2375CDF373dc75c3998", //wbnb
    [
        ethers.utils.parseEther('0.01'), //BNB
        ethers.utils.parseEther('1') //MPOLY
    ],
    [
        ethers.utils.parseEther('10000'), //BNB
        ethers.utils.parseEther('1000000') //MPOLY
    ],
    [
        ethers.constants.AddressZero, //BNB
        "0x6a4e41E9114B4E5528bE8C34f95a4F3134c903C7" //MPOLY
    ]
];