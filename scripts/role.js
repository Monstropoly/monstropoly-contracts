const { solKeccak256 } = require('../utils/whitelistTree');

async function main() {
    const role = solKeccak256('ADMIN_ROLE').toString('hex')
    console.log(role)
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});