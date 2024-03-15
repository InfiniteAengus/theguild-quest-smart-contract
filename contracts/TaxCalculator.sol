// SPDX-License-Identifier: GNU AGPLv3
pragma solidity 0.8.20;

import "./interfaces/ITaxManager.sol";

library TaxCalculator {
    function _calculateSeekerTax(
        ITaxManager _taxManager,
        uint256 _paymentAmount
    ) internal view returns (uint256 platformTax_, uint256 referralTax_) {
        ITaxManager.SeekerFees memory seekerFees = _taxManager.getSeekerFees();
        uint256 taxRateDivisor = _taxManager.taxBaseDivisor();

        referralTax_ =
            (_paymentAmount * seekerFees.referralRewards) /
            taxRateDivisor;

        platformTax_ =
            (_paymentAmount * seekerFees.platformRevenue) /
            taxRateDivisor;

        return (platformTax_, referralTax_);
    }

    function _calculateSolverTax(
        ITaxManager _taxManager,
        uint256 _paymentAmount
    )
        internal
        view
        returns (
            uint256 platformTax_,
            uint256 referralTax_,
            uint256 platformTreasuryTax_
        )
    {
        ITaxManager.SolverFees memory solverFees = _taxManager.getSolverFees();
        uint256 taxRateDivisor = _taxManager.taxBaseDivisor();

        referralTax_ =
            (_paymentAmount * solverFees.referralRewards) /
            taxRateDivisor;

        platformTax_ =
            (_paymentAmount * solverFees.platformRevenue) /
            taxRateDivisor;

        platformTreasuryTax_ =
            (_paymentAmount * solverFees.platformTreasury) /
            taxRateDivisor;

        return (referralTax_, platformTax_, platformTreasuryTax_);
    }
}
