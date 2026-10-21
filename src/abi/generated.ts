// Generated public contract interfaces used by the browser.

export const positionManagerAbi = [
  {
    "type": "constructor",
    "inputs": [
      {
        "name": "quote_",
        "type": "address",
        "internalType": "contract IERC20"
      },
      {
        "name": "ring_",
        "type": "address",
        "internalType": "contract IPriceRing"
      },
      {
        "name": "vault_",
        "type": "address",
        "internalType": "contract IHouseVault"
      },
      {
        "name": "feeRouter_",
        "type": "address",
        "internalType": "contract IFeeRouter"
      },
      {
        "name": "tiers_",
        "type": "address",
        "internalType": "contract ITierRegistry"
      },
      {
        "name": "owner_",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "params_",
        "type": "tuple",
        "internalType": "struct ParamsLib.RiskParams",
        "components": [
          {
            "name": "maxLevDefault",
            "type": "uint16",
            "internalType": "uint16"
          },
          {
            "name": "maxLevVerified",
            "type": "uint16",
            "internalType": "uint16"
          },
          {
            "name": "fence",
            "type": "uint8",
            "internalType": "uint8"
          },
          {
            "name": "flaggedFence",
            "type": "uint8",
            "internalType": "uint8"
          },
          {
            "name": "winFeeBps",
            "type": "uint16",
            "internalType": "uint16"
          },
          {
            "name": "carryPerHourE8",
            "type": "uint32",
            "internalType": "uint32"
          },
          {
            "name": "premiumMultE4",
            "type": "uint32",
            "internalType": "uint32"
          },
          {
            "name": "sigmaFloorE8",
            "type": "uint32",
            "internalType": "uint32"
          },
          {
            "name": "maxFillAdjE8",
            "type": "uint32",
            "internalType": "uint32"
          },
          {
            "name": "maxScanPerCall",
            "type": "uint32",
            "internalType": "uint32"
          },
          {
            "name": "minCollateral",
            "type": "uint64",
            "internalType": "uint64"
          },
          {
            "name": "maxPositionNotional",
            "type": "uint96",
            "internalType": "uint96"
          }
        ]
      },
      {
        "name": "stress_",
        "type": "tuple",
        "internalType": "struct ParamsLib.StressParams",
        "components": [
          {
            "name": "btcUpBps",
            "type": "uint16",
            "internalType": "uint16"
          },
          {
            "name": "btcDnBps",
            "type": "uint16",
            "internalType": "uint16"
          },
          {
            "name": "ethUpBps",
            "type": "uint16",
            "internalType": "uint16"
          },
          {
            "name": "ethDnBps",
            "type": "uint16",
            "internalType": "uint16"
          },
          {
            "name": "ratioBps",
            "type": "uint16",
            "internalType": "uint16"
          },
          {
            "name": "maxUtilBps",
            "type": "uint16",
            "internalType": "uint16"
          }
        ]
      }
    ],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "BLACKOUT_MAX_LEV",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint16",
        "internalType": "uint16"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "FILL_AFTER_MS",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "HARD_MAX_LEV",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint16",
        "internalType": "uint16"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "HARD_MAX_LEV_DEFAULT",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint16",
        "internalType": "uint16"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "MAX_CARRY_PER_HOUR_E8",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint32",
        "internalType": "uint32"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "MAX_FILL_DELAY_SEC",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "MAX_UTIL_BPS",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint16",
        "internalType": "uint16"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "MAX_WIN_FEE_BPS",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint16",
        "internalType": "uint16"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "MIN_FENCE",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint8",
        "internalType": "uint8"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "NUM_MARKETS",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint8",
        "internalType": "uint8"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "VOID_AFTER_SEC",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "acceptOwnership",
    "inputs": [],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "blackouts",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "tuple[]",
        "internalType": "struct PositionManager.Window[]",
        "components": [
          {
            "name": "startSec",
            "type": "uint32",
            "internalType": "uint32"
          },
          {
            "name": "endSec",
            "type": "uint32",
            "internalType": "uint32"
          },
          {
            "name": "weekdayMask",
            "type": "uint8",
            "internalType": "uint8"
          }
        ]
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "book",
    "inputs": [
      {
        "name": "market",
        "type": "uint8",
        "internalType": "uint8"
      },
      {
        "name": "isLong",
        "type": "bool",
        "internalType": "bool"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "tuple",
        "internalType": "struct StressLib.Book",
        "components": [
          {
            "name": "sumN",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "sumA",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "sumM",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "pendN",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "fExt",
            "type": "uint64",
            "internalType": "uint64"
          },
          {
            "name": "lExt",
            "type": "uint64",
            "internalType": "uint64"
          },
          {
            "name": "fOpp",
            "type": "uint64",
            "internalType": "uint64"
          }
        ]
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "cancelExpired",
    "inputs": [
      {
        "name": "id",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "caps",
    "inputs": [
      {
        "name": "",
        "type": "uint8",
        "internalType": "uint8"
      }
    ],
    "outputs": [
      {
        "name": "maxLongOI",
        "type": "uint96",
        "internalType": "uint96"
      },
      {
        "name": "maxShortOI",
        "type": "uint96",
        "internalType": "uint96"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "claim",
    "inputs": [
      {
        "name": "maxItems",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "paid",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "claimable",
    "inputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "commitAddMargin",
    "inputs": [
      {
        "name": "id",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "amount",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "commitClose",
    "inputs": [
      {
        "name": "id",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "commitOpen",
    "inputs": [
      {
        "name": "market",
        "type": "uint8",
        "internalType": "uint8"
      },
      {
        "name": "isLong",
        "type": "bool",
        "internalType": "bool"
      },
      {
        "name": "collateral",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "leverage",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "maxPremium",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "id",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "escrowed",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "factorCaps",
    "inputs": [],
    "outputs": [
      {
        "name": "maxSideOI",
        "type": "uint96",
        "internalType": "uint96"
      },
      {
        "name": "maxNetOI",
        "type": "uint96",
        "internalType": "uint96"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "factorLongOI",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "factorShortOI",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "feeRouter",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "contract IFeeRouter"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "freeEquity",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getPosition",
    "inputs": [
      {
        "name": "id",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "tuple",
        "internalType": "struct IPositionManager.Position",
        "components": [
          {
            "name": "trader",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "market",
            "type": "uint8",
            "internalType": "uint8"
          },
          {
            "name": "isLong",
            "type": "bool",
            "internalType": "bool"
          },
          {
            "name": "state",
            "type": "uint8",
            "internalType": "enum IPositionManager.State"
          },
          {
            "name": "fence",
            "type": "uint8",
            "internalType": "uint8"
          },
          {
            "name": "premiumConsumed",
            "type": "bool",
            "internalType": "bool"
          },
          {
            "name": "lastScannedBreach",
            "type": "bool",
            "internalType": "bool"
          },
          {
            "name": "commitTs",
            "type": "uint32",
            "internalType": "uint32"
          },
          {
            "name": "collateral",
            "type": "uint64",
            "internalType": "uint64"
          },
          {
            "name": "premium",
            "type": "uint64",
            "internalType": "uint64"
          },
          {
            "name": "notional",
            "type": "uint96",
            "internalType": "uint96"
          },
          {
            "name": "leverage",
            "type": "uint16",
            "internalType": "uint16"
          },
          {
            "name": "entryPx",
            "type": "uint64",
            "internalType": "uint64"
          },
          {
            "name": "liqPx",
            "type": "uint64",
            "internalType": "uint64"
          },
          {
            "name": "idxFill",
            "type": "uint40",
            "internalType": "uint40"
          },
          {
            "name": "scannedTo",
            "type": "uint40",
            "internalType": "uint40"
          },
          {
            "name": "fillTimeMs",
            "type": "uint48",
            "internalType": "uint48"
          },
          {
            "name": "idxCommit",
            "type": "uint40",
            "internalType": "uint40"
          },
          {
            "name": "idxCloseCommit",
            "type": "uint40",
            "internalType": "uint40"
          },
          {
            "name": "idxCloseFill",
            "type": "uint40",
            "internalType": "uint40"
          },
          {
            "name": "breachIdx",
            "type": "uint40",
            "internalType": "uint40"
          },
          {
            "name": "closeCommitTs",
            "type": "uint32",
            "internalType": "uint32"
          },
          {
            "name": "carryPerHourE8",
            "type": "uint32",
            "internalType": "uint32"
          },
          {
            "name": "winFeeBps",
            "type": "uint16",
            "internalType": "uint16"
          },
          {
            "name": "maxFillAdjE8",
            "type": "uint32",
            "internalType": "uint32"
          },
          {
            "name": "marginPending",
            "type": "uint64",
            "internalType": "uint64"
          },
          {
            "name": "idxMarginCommit",
            "type": "uint40",
            "internalType": "uint40"
          },
          {
            "name": "marginCommitTs",
            "type": "uint32",
            "internalType": "uint32"
          }
        ]
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "guardianCloseOnly",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "bool",
        "internalType": "bool"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "inBlackout",
    "inputs": [
      {
        "name": "ts",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "bool",
        "internalType": "bool"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "iouHead",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "iouOf",
    "inputs": [
      {
        "name": "id",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "traderOwed",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "carryOwed",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "winOwed",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "iouQueueLength",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "isCloseOnly",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "bool",
        "internalType": "bool"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "longOI",
    "inputs": [
      {
        "name": "",
        "type": "uint8",
        "internalType": "uint8"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "nextId",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "owner",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "address"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "params",
    "inputs": [],
    "outputs": [
      {
        "name": "maxLevDefault",
        "type": "uint16",
        "internalType": "uint16"
      },
      {
        "name": "maxLevVerified",
        "type": "uint16",
        "internalType": "uint16"
      },
      {
        "name": "fence",
        "type": "uint8",
        "internalType": "uint8"
      },
      {
        "name": "flaggedFence",
        "type": "uint8",
        "internalType": "uint8"
      },
      {
        "name": "winFeeBps",
        "type": "uint16",
        "internalType": "uint16"
      },
      {
        "name": "carryPerHourE8",
        "type": "uint32",
        "internalType": "uint32"
      },
      {
        "name": "premiumMultE4",
        "type": "uint32",
        "internalType": "uint32"
      },
      {
        "name": "sigmaFloorE8",
        "type": "uint32",
        "internalType": "uint32"
      },
      {
        "name": "maxFillAdjE8",
        "type": "uint32",
        "internalType": "uint32"
      },
      {
        "name": "maxScanPerCall",
        "type": "uint32",
        "internalType": "uint32"
      },
      {
        "name": "minCollateral",
        "type": "uint64",
        "internalType": "uint64"
      },
      {
        "name": "maxPositionNotional",
        "type": "uint96",
        "internalType": "uint96"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "pendingOwner",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "address"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "quote",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "contract IERC20"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "renounceOwnership",
    "inputs": [],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "requiredCapital",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "ring",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "contract IPriceRing"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "setBlackouts",
    "inputs": [
      {
        "name": "ws",
        "type": "tuple[]",
        "internalType": "struct PositionManager.Window[]",
        "components": [
          {
            "name": "startSec",
            "type": "uint32",
            "internalType": "uint32"
          },
          {
            "name": "endSec",
            "type": "uint32",
            "internalType": "uint32"
          },
          {
            "name": "weekdayMask",
            "type": "uint8",
            "internalType": "uint8"
          }
        ]
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "setFactorCaps",
    "inputs": [
      {
        "name": "c",
        "type": "tuple",
        "internalType": "struct PositionManager.FactorCaps",
        "components": [
          {
            "name": "maxSideOI",
            "type": "uint96",
            "internalType": "uint96"
          },
          {
            "name": "maxNetOI",
            "type": "uint96",
            "internalType": "uint96"
          }
        ]
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "setGuardianCloseOnly",
    "inputs": [
      {
        "name": "on",
        "type": "bool",
        "internalType": "bool"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "setMarketCaps",
    "inputs": [
      {
        "name": "market",
        "type": "uint8",
        "internalType": "uint8"
      },
      {
        "name": "c",
        "type": "tuple",
        "internalType": "struct PositionManager.MarketCaps",
        "components": [
          {
            "name": "maxLongOI",
            "type": "uint96",
            "internalType": "uint96"
          },
          {
            "name": "maxShortOI",
            "type": "uint96",
            "internalType": "uint96"
          }
        ]
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "setParams",
    "inputs": [
      {
        "name": "rp",
        "type": "tuple",
        "internalType": "struct ParamsLib.RiskParams",
        "components": [
          {
            "name": "maxLevDefault",
            "type": "uint16",
            "internalType": "uint16"
          },
          {
            "name": "maxLevVerified",
            "type": "uint16",
            "internalType": "uint16"
          },
          {
            "name": "fence",
            "type": "uint8",
            "internalType": "uint8"
          },
          {
            "name": "flaggedFence",
            "type": "uint8",
            "internalType": "uint8"
          },
          {
            "name": "winFeeBps",
            "type": "uint16",
            "internalType": "uint16"
          },
          {
            "name": "carryPerHourE8",
            "type": "uint32",
            "internalType": "uint32"
          },
          {
            "name": "premiumMultE4",
            "type": "uint32",
            "internalType": "uint32"
          },
          {
            "name": "sigmaFloorE8",
            "type": "uint32",
            "internalType": "uint32"
          },
          {
            "name": "maxFillAdjE8",
            "type": "uint32",
            "internalType": "uint32"
          },
          {
            "name": "maxScanPerCall",
            "type": "uint32",
            "internalType": "uint32"
          },
          {
            "name": "minCollateral",
            "type": "uint64",
            "internalType": "uint64"
          },
          {
            "name": "maxPositionNotional",
            "type": "uint96",
            "internalType": "uint96"
          }
        ]
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "setStress",
    "inputs": [
      {
        "name": "s",
        "type": "tuple",
        "internalType": "struct ParamsLib.StressParams",
        "components": [
          {
            "name": "btcUpBps",
            "type": "uint16",
            "internalType": "uint16"
          },
          {
            "name": "btcDnBps",
            "type": "uint16",
            "internalType": "uint16"
          },
          {
            "name": "ethUpBps",
            "type": "uint16",
            "internalType": "uint16"
          },
          {
            "name": "ethDnBps",
            "type": "uint16",
            "internalType": "uint16"
          },
          {
            "name": "ratioBps",
            "type": "uint16",
            "internalType": "uint16"
          },
          {
            "name": "maxUtilBps",
            "type": "uint16",
            "internalType": "uint16"
          }
        ]
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "settle",
    "inputs": [
      {
        "name": "id",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "uint8",
        "internalType": "enum IPositionManager.State"
      }
    ],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "shortOI",
    "inputs": [
      {
        "name": "",
        "type": "uint8",
        "internalType": "uint8"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "stress",
    "inputs": [],
    "outputs": [
      {
        "name": "btcUpBps",
        "type": "uint16",
        "internalType": "uint16"
      },
      {
        "name": "btcDnBps",
        "type": "uint16",
        "internalType": "uint16"
      },
      {
        "name": "ethUpBps",
        "type": "uint16",
        "internalType": "uint16"
      },
      {
        "name": "ethDnBps",
        "type": "uint16",
        "internalType": "uint16"
      },
      {
        "name": "ratioBps",
        "type": "uint16",
        "internalType": "uint16"
      },
      {
        "name": "maxUtilBps",
        "type": "uint16",
        "internalType": "uint16"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "stressLiability",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "tiers",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "contract ITierRegistry"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "totalClaimable",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "totalIou",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "transferOwnership",
    "inputs": [
      {
        "name": "newOwner",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "vault",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "contract IHouseVault"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "withdrawClaimable",
    "inputs": [
      {
        "name": "to",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "event",
    "name": "BlackoutsUpdated",
    "inputs": [
      {
        "name": "windows",
        "type": "tuple[]",
        "indexed": false,
        "internalType": "struct PositionManager.Window[]",
        "components": [
          {
            "name": "startSec",
            "type": "uint32",
            "internalType": "uint32"
          },
          {
            "name": "endSec",
            "type": "uint32",
            "internalType": "uint32"
          },
          {
            "name": "weekdayMask",
            "type": "uint8",
            "internalType": "uint8"
          }
        ]
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "BreachObserved",
    "inputs": [
      {
        "name": "id",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "idx",
        "type": "uint40",
        "indexed": false,
        "internalType": "uint40"
      },
      {
        "name": "oraclePx",
        "type": "uint64",
        "indexed": false,
        "internalType": "uint64"
      },
      {
        "name": "midPx",
        "type": "uint64",
        "indexed": false,
        "internalType": "uint64"
      },
      {
        "name": "premiumToVault",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "ClaimableWithdrawn",
    "inputs": [
      {
        "name": "account",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "to",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      },
      {
        "name": "amount",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "CloseCommitted",
    "inputs": [
      {
        "name": "id",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "idxCloseCommit",
        "type": "uint40",
        "indexed": false,
        "internalType": "uint40"
      },
      {
        "name": "earliestIdxCloseFill",
        "type": "uint40",
        "indexed": false,
        "internalType": "uint40"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "CloseVoided",
    "inputs": [
      {
        "name": "id",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "FactorCapsUpdated",
    "inputs": [
      {
        "name": "caps",
        "type": "tuple",
        "indexed": false,
        "internalType": "struct PositionManager.FactorCaps",
        "components": [
          {
            "name": "maxSideOI",
            "type": "uint96",
            "internalType": "uint96"
          },
          {
            "name": "maxNetOI",
            "type": "uint96",
            "internalType": "uint96"
          }
        ]
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "GuardianCloseOnly",
    "inputs": [
      {
        "name": "on",
        "type": "bool",
        "indexed": false,
        "internalType": "bool"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "IouPaid",
    "inputs": [
      {
        "name": "id",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "traderPaid",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "carryPaid",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "winPaid",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "IouRecorded",
    "inputs": [
      {
        "name": "id",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "trader",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "traderOwed",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "carryOwed",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "winOwed",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "MarginAdded",
    "inputs": [
      {
        "name": "id",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "idxEffective",
        "type": "uint40",
        "indexed": false,
        "internalType": "uint40"
      },
      {
        "name": "newCollateral",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "newLiqPx",
        "type": "uint64",
        "indexed": false,
        "internalType": "uint64"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "MarginCommitted",
    "inputs": [
      {
        "name": "id",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "trader",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "amount",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "idxCommit",
        "type": "uint40",
        "indexed": false,
        "internalType": "uint40"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "MarginRefunded",
    "inputs": [
      {
        "name": "id",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "amount",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "MarketCapsUpdated",
    "inputs": [
      {
        "name": "market",
        "type": "uint8",
        "indexed": true,
        "internalType": "uint8"
      },
      {
        "name": "caps",
        "type": "tuple",
        "indexed": false,
        "internalType": "struct PositionManager.MarketCaps",
        "components": [
          {
            "name": "maxLongOI",
            "type": "uint96",
            "internalType": "uint96"
          },
          {
            "name": "maxShortOI",
            "type": "uint96",
            "internalType": "uint96"
          }
        ]
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "OwnershipTransferStarted",
    "inputs": [
      {
        "name": "previousOwner",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "newOwner",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "OwnershipTransferred",
    "inputs": [
      {
        "name": "previousOwner",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "newOwner",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "ParamsUpdated",
    "inputs": [
      {
        "name": "params",
        "type": "tuple",
        "indexed": false,
        "internalType": "struct ParamsLib.RiskParams",
        "components": [
          {
            "name": "maxLevDefault",
            "type": "uint16",
            "internalType": "uint16"
          },
          {
            "name": "maxLevVerified",
            "type": "uint16",
            "internalType": "uint16"
          },
          {
            "name": "fence",
            "type": "uint8",
            "internalType": "uint8"
          },
          {
            "name": "flaggedFence",
            "type": "uint8",
            "internalType": "uint8"
          },
          {
            "name": "winFeeBps",
            "type": "uint16",
            "internalType": "uint16"
          },
          {
            "name": "carryPerHourE8",
            "type": "uint32",
            "internalType": "uint32"
          },
          {
            "name": "premiumMultE4",
            "type": "uint32",
            "internalType": "uint32"
          },
          {
            "name": "sigmaFloorE8",
            "type": "uint32",
            "internalType": "uint32"
          },
          {
            "name": "maxFillAdjE8",
            "type": "uint32",
            "internalType": "uint32"
          },
          {
            "name": "maxScanPerCall",
            "type": "uint32",
            "internalType": "uint32"
          },
          {
            "name": "minCollateral",
            "type": "uint64",
            "internalType": "uint64"
          },
          {
            "name": "maxPositionNotional",
            "type": "uint96",
            "internalType": "uint96"
          }
        ]
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "PayoutDeferred",
    "inputs": [
      {
        "name": "account",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "amount",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "PendingCancelled",
    "inputs": [
      {
        "name": "id",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "PositionClosed",
    "inputs": [
      {
        "name": "id",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "idxCloseFill",
        "type": "uint40",
        "indexed": false,
        "internalType": "uint40"
      },
      {
        "name": "oraclePx",
        "type": "uint64",
        "indexed": false,
        "internalType": "uint64"
      },
      {
        "name": "exitPx",
        "type": "uint64",
        "indexed": false,
        "internalType": "uint64"
      },
      {
        "name": "pnl",
        "type": "int256",
        "indexed": false,
        "internalType": "int256"
      },
      {
        "name": "carryPaid",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "winFee",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "payout",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "premiumReleased",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "PositionCommitted",
    "inputs": [
      {
        "name": "id",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "trader",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "market",
        "type": "uint8",
        "indexed": true,
        "internalType": "uint8"
      },
      {
        "name": "isLong",
        "type": "bool",
        "indexed": false,
        "internalType": "bool"
      },
      {
        "name": "collateral",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "leverage",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "notional",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "premium",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "idxCommit",
        "type": "uint40",
        "indexed": false,
        "internalType": "uint40"
      },
      {
        "name": "fence",
        "type": "uint8",
        "indexed": false,
        "internalType": "uint8"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "PositionFilled",
    "inputs": [
      {
        "name": "id",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "idxFill",
        "type": "uint40",
        "indexed": false,
        "internalType": "uint40"
      },
      {
        "name": "oraclePx",
        "type": "uint64",
        "indexed": false,
        "internalType": "uint64"
      },
      {
        "name": "midPx",
        "type": "uint64",
        "indexed": false,
        "internalType": "uint64"
      },
      {
        "name": "basisEwmaE8",
        "type": "int32",
        "indexed": false,
        "internalType": "int32"
      },
      {
        "name": "fillPx",
        "type": "uint64",
        "indexed": false,
        "internalType": "uint64"
      },
      {
        "name": "liqPx",
        "type": "uint64",
        "indexed": false,
        "internalType": "uint64"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "PositionLiquidated",
    "inputs": [
      {
        "name": "id",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "idx",
        "type": "uint40",
        "indexed": false,
        "internalType": "uint40"
      },
      {
        "name": "oraclePx",
        "type": "uint64",
        "indexed": false,
        "internalType": "uint64"
      },
      {
        "name": "caller",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "StressUpdated",
    "inputs": [
      {
        "name": "stress",
        "type": "tuple",
        "indexed": false,
        "internalType": "struct ParamsLib.StressParams",
        "components": [
          {
            "name": "btcUpBps",
            "type": "uint16",
            "internalType": "uint16"
          },
          {
            "name": "btcDnBps",
            "type": "uint16",
            "internalType": "uint16"
          },
          {
            "name": "ethUpBps",
            "type": "uint16",
            "internalType": "uint16"
          },
          {
            "name": "ethDnBps",
            "type": "uint16",
            "internalType": "uint16"
          },
          {
            "name": "ratioBps",
            "type": "uint16",
            "internalType": "uint16"
          },
          {
            "name": "maxUtilBps",
            "type": "uint16",
            "internalType": "uint16"
          }
        ]
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "TermsSnapshotted",
    "inputs": [
      {
        "name": "id",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "carryPerHourE8",
        "type": "uint32",
        "indexed": false,
        "internalType": "uint32"
      },
      {
        "name": "winFeeBps",
        "type": "uint16",
        "indexed": false,
        "internalType": "uint16"
      },
      {
        "name": "maxFillAdjE8",
        "type": "uint32",
        "indexed": false,
        "internalType": "uint32"
      }
    ],
    "anonymous": false
  },
  {
    "type": "error",
    "name": "BadCollateral",
    "inputs": []
  },
  {
    "type": "error",
    "name": "BadLeverage",
    "inputs": [
      {
        "name": "leverage",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "maxLev",
        "type": "uint256",
        "internalType": "uint256"
      }
    ]
  },
  {
    "type": "error",
    "name": "BadParams",
    "inputs": [
      {
        "name": "which",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ]
  },
  {
    "type": "error",
    "name": "BadState",
    "inputs": [
      {
        "name": "state",
        "type": "uint8",
        "internalType": "enum IPositionManager.State"
      }
    ]
  },
  {
    "type": "error",
    "name": "BlackoutWindow",
    "inputs": []
  },
  {
    "type": "error",
    "name": "CapExceeded",
    "inputs": [
      {
        "name": "which",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ]
  },
  {
    "type": "error",
    "name": "CloseOnly",
    "inputs": []
  },
  {
    "type": "error",
    "name": "FillAvailable",
    "inputs": []
  },
  {
    "type": "error",
    "name": "MarginTooThin",
    "inputs": [
      {
        "name": "margin",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "notional",
        "type": "uint256",
        "internalType": "uint256"
      }
    ]
  },
  {
    "type": "error",
    "name": "NoPrints",
    "inputs": []
  },
  {
    "type": "error",
    "name": "NotExpired",
    "inputs": []
  },
  {
    "type": "error",
    "name": "NotTrader",
    "inputs": []
  },
  {
    "type": "error",
    "name": "NothingClaimable",
    "inputs": []
  },
  {
    "type": "error",
    "name": "NotionalTooLarge",
    "inputs": []
  },
  {
    "type": "error",
    "name": "OwnableInvalidOwner",
    "inputs": [
      {
        "name": "owner",
        "type": "address",
        "internalType": "address"
      }
    ]
  },
  {
    "type": "error",
    "name": "OwnableUnauthorizedAccount",
    "inputs": [
      {
        "name": "account",
        "type": "address",
        "internalType": "address"
      }
    ]
  },
  {
    "type": "error",
    "name": "PremiumAboveMax",
    "inputs": [
      {
        "name": "premium",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "maxPremium",
        "type": "uint256",
        "internalType": "uint256"
      }
    ]
  },
  {
    "type": "error",
    "name": "PremiumExceedsCollateral",
    "inputs": [
      {
        "name": "premium",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "collateral",
        "type": "uint256",
        "internalType": "uint256"
      }
    ]
  },
  {
    "type": "error",
    "name": "ReentrancyGuardReentrantCall",
    "inputs": []
  },
  {
    "type": "error",
    "name": "SafeCastOverflowedUintDowncast",
    "inputs": [
      {
        "name": "bits",
        "type": "uint8",
        "internalType": "uint8"
      },
      {
        "name": "value",
        "type": "uint256",
        "internalType": "uint256"
      }
    ]
  },
  {
    "type": "error",
    "name": "SafeERC20FailedOperation",
    "inputs": [
      {
        "name": "token",
        "type": "address",
        "internalType": "address"
      }
    ]
  },
  {
    "type": "error",
    "name": "StaleFeed",
    "inputs": []
  },
  {
    "type": "error",
    "name": "UnknownMarket",
    "inputs": [
      {
        "name": "market",
        "type": "uint8",
        "internalType": "uint8"
      }
    ]
  }
] as const;

export const positionLensAbi = [
  {
    "type": "constructor",
    "inputs": [
      {
        "name": "pm_",
        "type": "address",
        "internalType": "contract PositionManager"
      }
    ],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "pm",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "contract PositionManager"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "quoteOpen",
    "inputs": [
      {
        "name": "market",
        "type": "uint8",
        "internalType": "uint8"
      },
      {
        "name": "isLong",
        "type": "bool",
        "internalType": "bool"
      },
      {
        "name": "collateral",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "leverage",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "notional",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "prem",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "margin",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "indicativeLiqPx",
        "type": "uint64",
        "internalType": "uint64"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "ring",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "contract IPriceRing"
      }
    ],
    "stateMutability": "view"
  }
] as const;

export const priceRingAbi = [
  {
    "type": "constructor",
    "inputs": [
      {
        "name": "signer_",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "owner_",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "config_",
        "type": "tuple",
        "internalType": "struct PriceRing.Config",
        "components": [
          {
            "name": "maxAgeBlocks",
            "type": "uint32",
            "internalType": "uint32"
          },
          {
            "name": "maxAgeSec",
            "type": "uint32",
            "internalType": "uint32"
          },
          {
            "name": "maxJumpE8",
            "type": "uint32",
            "internalType": "uint32"
          },
          {
            "name": "maxMidDevE8",
            "type": "uint32",
            "internalType": "uint32"
          },
          {
            "name": "basisAlphaE6",
            "type": "uint32",
            "internalType": "uint32"
          },
          {
            "name": "varAlphaE6",
            "type": "uint32",
            "internalType": "uint32"
          },
          {
            "name": "maxFutureSkewMs",
            "type": "uint32",
            "internalType": "uint32"
          },
          {
            "name": "maxPastSkewMs",
            "type": "uint32",
            "internalType": "uint32"
          },
          {
            "name": "maxBasisInnovationE8",
            "type": "uint32",
            "internalType": "uint32"
          },
          {
            "name": "varFastAlphaE6",
            "type": "uint32",
            "internalType": "uint32"
          },
          {
            "name": "varSlowAlphaE6",
            "type": "uint32",
            "internalType": "uint32"
          },
          {
            "name": "maxPrintAgeSec",
            "type": "uint32",
            "internalType": "uint32"
          }
        ]
      },
      {
        "name": "initialSigmaE8",
        "type": "uint64",
        "internalType": "uint64"
      }
    ],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "MAX_FUTURE_SKEW_MS",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint32",
        "internalType": "uint32"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "MAX_PAST_SKEW_MS",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint32",
        "internalType": "uint32"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "NUM_MARKETS",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint8",
        "internalType": "uint8"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "PRICE_UPDATE_TYPEHASH",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "acceptOwnership",
    "inputs": [],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "basisEwmaE8",
    "inputs": [
      {
        "name": "",
        "type": "uint8",
        "internalType": "uint8"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "int256",
        "internalType": "int256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "chunkOf",
    "inputs": [
      {
        "name": "market",
        "type": "uint8",
        "internalType": "uint8"
      },
      {
        "name": "chunkIdx",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "min",
        "type": "uint64",
        "internalType": "uint64"
      },
      {
        "name": "max",
        "type": "uint64",
        "internalType": "uint64"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "config",
    "inputs": [],
    "outputs": [
      {
        "name": "maxAgeBlocks",
        "type": "uint32",
        "internalType": "uint32"
      },
      {
        "name": "maxAgeSec",
        "type": "uint32",
        "internalType": "uint32"
      },
      {
        "name": "maxJumpE8",
        "type": "uint32",
        "internalType": "uint32"
      },
      {
        "name": "maxMidDevE8",
        "type": "uint32",
        "internalType": "uint32"
      },
      {
        "name": "basisAlphaE6",
        "type": "uint32",
        "internalType": "uint32"
      },
      {
        "name": "varAlphaE6",
        "type": "uint32",
        "internalType": "uint32"
      },
      {
        "name": "maxFutureSkewMs",
        "type": "uint32",
        "internalType": "uint32"
      },
      {
        "name": "maxPastSkewMs",
        "type": "uint32",
        "internalType": "uint32"
      },
      {
        "name": "maxBasisInnovationE8",
        "type": "uint32",
        "internalType": "uint32"
      },
      {
        "name": "varFastAlphaE6",
        "type": "uint32",
        "internalType": "uint32"
      },
      {
        "name": "varSlowAlphaE6",
        "type": "uint32",
        "internalType": "uint32"
      },
      {
        "name": "maxPrintAgeSec",
        "type": "uint32",
        "internalType": "uint32"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "eip712Domain",
    "inputs": [],
    "outputs": [
      {
        "name": "fields",
        "type": "bytes1",
        "internalType": "bytes1"
      },
      {
        "name": "name",
        "type": "string",
        "internalType": "string"
      },
      {
        "name": "version",
        "type": "string",
        "internalType": "string"
      },
      {
        "name": "chainId",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "verifyingContract",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "salt",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "extensions",
        "type": "uint256[]",
        "internalType": "uint256[]"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "findBreaches",
    "inputs": [
      {
        "name": "market",
        "type": "uint8",
        "internalType": "uint8"
      },
      {
        "name": "fromIdx",
        "type": "uint40",
        "internalType": "uint40"
      },
      {
        "name": "toIdx",
        "type": "uint40",
        "internalType": "uint40"
      },
      {
        "name": "level",
        "type": "uint64",
        "internalType": "uint64"
      },
      {
        "name": "below",
        "type": "bool",
        "internalType": "bool"
      },
      {
        "name": "maxCount",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "idxs",
        "type": "uint40[]",
        "internalType": "uint40[]"
      },
      {
        "name": "scannedTo",
        "type": "uint40",
        "internalType": "uint40"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "firstPrintAtOrAfter",
    "inputs": [
      {
        "name": "market",
        "type": "uint8",
        "internalType": "uint8"
      },
      {
        "name": "fromIdx",
        "type": "uint40",
        "internalType": "uint40"
      },
      {
        "name": "ms",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "found",
        "type": "bool",
        "internalType": "bool"
      },
      {
        "name": "idx",
        "type": "uint40",
        "internalType": "uint40"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getPrint",
    "inputs": [
      {
        "name": "market",
        "type": "uint8",
        "internalType": "uint8"
      },
      {
        "name": "idx",
        "type": "uint40",
        "internalType": "uint40"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "tuple",
        "internalType": "struct IPriceRing.Print",
        "components": [
          {
            "name": "oraclePx",
            "type": "uint64",
            "internalType": "uint64"
          },
          {
            "name": "midPx",
            "type": "uint64",
            "internalType": "uint64"
          },
          {
            "name": "srcTimeMs",
            "type": "uint48",
            "internalType": "uint48"
          },
          {
            "name": "arbBlock",
            "type": "uint40",
            "internalType": "uint40"
          },
          {
            "name": "basisEwmaE8",
            "type": "int32",
            "internalType": "int32"
          }
        ]
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "hashUpdate",
    "inputs": [
      {
        "name": "u",
        "type": "tuple",
        "internalType": "struct IPriceRing.PriceUpdate",
        "components": [
          {
            "name": "seq",
            "type": "uint64",
            "internalType": "uint64"
          },
          {
            "name": "srcTimeMs",
            "type": "uint64",
            "internalType": "uint64"
          },
          {
            "name": "btcOraclePx",
            "type": "uint64",
            "internalType": "uint64"
          },
          {
            "name": "btcMidPx",
            "type": "uint64",
            "internalType": "uint64"
          },
          {
            "name": "ethOraclePx",
            "type": "uint64",
            "internalType": "uint64"
          },
          {
            "name": "ethMidPx",
            "type": "uint64",
            "internalType": "uint64"
          }
        ]
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "isFresh",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "bool",
        "internalType": "bool"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "lastPostArbBlock",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint64",
        "internalType": "uint64"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "lastPostTimestamp",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint64",
        "internalType": "uint64"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "lastSeq",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint64",
        "internalType": "uint64"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "lastSrcTimeMs",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint64",
        "internalType": "uint64"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "latestPrint",
    "inputs": [
      {
        "name": "market",
        "type": "uint8",
        "internalType": "uint8"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "tuple",
        "internalType": "struct IPriceRing.Print",
        "components": [
          {
            "name": "oraclePx",
            "type": "uint64",
            "internalType": "uint64"
          },
          {
            "name": "midPx",
            "type": "uint64",
            "internalType": "uint64"
          },
          {
            "name": "srcTimeMs",
            "type": "uint48",
            "internalType": "uint48"
          },
          {
            "name": "arbBlock",
            "type": "uint40",
            "internalType": "uint40"
          },
          {
            "name": "basisEwmaE8",
            "type": "int32",
            "internalType": "int32"
          }
        ]
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "marketFresh",
    "inputs": [
      {
        "name": "market",
        "type": "uint8",
        "internalType": "uint8"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "bool",
        "internalType": "bool"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "owner",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "address"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "pendingOwner",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "address"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "postPrices",
    "inputs": [
      {
        "name": "u",
        "type": "tuple",
        "internalType": "struct IPriceRing.PriceUpdate",
        "components": [
          {
            "name": "seq",
            "type": "uint64",
            "internalType": "uint64"
          },
          {
            "name": "srcTimeMs",
            "type": "uint64",
            "internalType": "uint64"
          },
          {
            "name": "btcOraclePx",
            "type": "uint64",
            "internalType": "uint64"
          },
          {
            "name": "btcMidPx",
            "type": "uint64",
            "internalType": "uint64"
          },
          {
            "name": "ethOraclePx",
            "type": "uint64",
            "internalType": "uint64"
          },
          {
            "name": "ethMidPx",
            "type": "uint64",
            "internalType": "uint64"
          }
        ]
      },
      {
        "name": "sig",
        "type": "bytes",
        "internalType": "bytes"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "printCount",
    "inputs": [
      {
        "name": "market",
        "type": "uint8",
        "internalType": "uint8"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "uint40",
        "internalType": "uint40"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "renounceOwnership",
    "inputs": [],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "scanPair",
    "inputs": [
      {
        "name": "market",
        "type": "uint8",
        "internalType": "uint8"
      },
      {
        "name": "fromIdx",
        "type": "uint40",
        "internalType": "uint40"
      },
      {
        "name": "toIdx",
        "type": "uint40",
        "internalType": "uint40"
      },
      {
        "name": "level",
        "type": "uint64",
        "internalType": "uint64"
      },
      {
        "name": "below",
        "type": "bool",
        "internalType": "bool"
      },
      {
        "name": "prevBreach",
        "type": "bool",
        "internalType": "bool"
      }
    ],
    "outputs": [
      {
        "name": "firstBreach",
        "type": "uint40",
        "internalType": "uint40"
      },
      {
        "name": "pairEnd",
        "type": "uint40",
        "internalType": "uint40"
      },
      {
        "name": "scannedTo",
        "type": "uint40",
        "internalType": "uint40"
      },
      {
        "name": "lastIsBreach",
        "type": "bool",
        "internalType": "bool"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "setConfig",
    "inputs": [
      {
        "name": "config_",
        "type": "tuple",
        "internalType": "struct PriceRing.Config",
        "components": [
          {
            "name": "maxAgeBlocks",
            "type": "uint32",
            "internalType": "uint32"
          },
          {
            "name": "maxAgeSec",
            "type": "uint32",
            "internalType": "uint32"
          },
          {
            "name": "maxJumpE8",
            "type": "uint32",
            "internalType": "uint32"
          },
          {
            "name": "maxMidDevE8",
            "type": "uint32",
            "internalType": "uint32"
          },
          {
            "name": "basisAlphaE6",
            "type": "uint32",
            "internalType": "uint32"
          },
          {
            "name": "varAlphaE6",
            "type": "uint32",
            "internalType": "uint32"
          },
          {
            "name": "maxFutureSkewMs",
            "type": "uint32",
            "internalType": "uint32"
          },
          {
            "name": "maxPastSkewMs",
            "type": "uint32",
            "internalType": "uint32"
          },
          {
            "name": "maxBasisInnovationE8",
            "type": "uint32",
            "internalType": "uint32"
          },
          {
            "name": "varFastAlphaE6",
            "type": "uint32",
            "internalType": "uint32"
          },
          {
            "name": "varSlowAlphaE6",
            "type": "uint32",
            "internalType": "uint32"
          },
          {
            "name": "maxPrintAgeSec",
            "type": "uint32",
            "internalType": "uint32"
          }
        ]
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "setSigner",
    "inputs": [
      {
        "name": "signer_",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "sigmaE8",
    "inputs": [
      {
        "name": "market",
        "type": "uint8",
        "internalType": "uint8"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "uint64",
        "internalType": "uint64"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "signer",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "address"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "transferOwnership",
    "inputs": [
      {
        "name": "newOwner",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "varEwmaE16",
    "inputs": [
      {
        "name": "",
        "type": "uint8",
        "internalType": "uint8"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "varFastE16",
    "inputs": [
      {
        "name": "",
        "type": "uint8",
        "internalType": "uint8"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "varSlowE16",
    "inputs": [
      {
        "name": "",
        "type": "uint8",
        "internalType": "uint8"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "event",
    "name": "ConfigUpdated",
    "inputs": [
      {
        "name": "config",
        "type": "tuple",
        "indexed": false,
        "internalType": "struct PriceRing.Config",
        "components": [
          {
            "name": "maxAgeBlocks",
            "type": "uint32",
            "internalType": "uint32"
          },
          {
            "name": "maxAgeSec",
            "type": "uint32",
            "internalType": "uint32"
          },
          {
            "name": "maxJumpE8",
            "type": "uint32",
            "internalType": "uint32"
          },
          {
            "name": "maxMidDevE8",
            "type": "uint32",
            "internalType": "uint32"
          },
          {
            "name": "basisAlphaE6",
            "type": "uint32",
            "internalType": "uint32"
          },
          {
            "name": "varAlphaE6",
            "type": "uint32",
            "internalType": "uint32"
          },
          {
            "name": "maxFutureSkewMs",
            "type": "uint32",
            "internalType": "uint32"
          },
          {
            "name": "maxPastSkewMs",
            "type": "uint32",
            "internalType": "uint32"
          },
          {
            "name": "maxBasisInnovationE8",
            "type": "uint32",
            "internalType": "uint32"
          },
          {
            "name": "varFastAlphaE6",
            "type": "uint32",
            "internalType": "uint32"
          },
          {
            "name": "varSlowAlphaE6",
            "type": "uint32",
            "internalType": "uint32"
          },
          {
            "name": "maxPrintAgeSec",
            "type": "uint32",
            "internalType": "uint32"
          }
        ]
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "EIP712DomainChanged",
    "inputs": [],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "OwnershipTransferStarted",
    "inputs": [
      {
        "name": "previousOwner",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "newOwner",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "OwnershipTransferred",
    "inputs": [
      {
        "name": "previousOwner",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "newOwner",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "PricesPosted",
    "inputs": [
      {
        "name": "seq",
        "type": "uint64",
        "indexed": true,
        "internalType": "uint64"
      },
      {
        "name": "srcTimeMs",
        "type": "uint64",
        "indexed": false,
        "internalType": "uint64"
      },
      {
        "name": "arbBlock",
        "type": "uint40",
        "indexed": false,
        "internalType": "uint40"
      },
      {
        "name": "changedMask",
        "type": "uint8",
        "indexed": false,
        "internalType": "uint8"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "PrintAppended",
    "inputs": [
      {
        "name": "market",
        "type": "uint8",
        "indexed": true,
        "internalType": "uint8"
      },
      {
        "name": "idx",
        "type": "uint40",
        "indexed": true,
        "internalType": "uint40"
      },
      {
        "name": "oraclePx",
        "type": "uint64",
        "indexed": false,
        "internalType": "uint64"
      },
      {
        "name": "midPx",
        "type": "uint64",
        "indexed": false,
        "internalType": "uint64"
      },
      {
        "name": "srcTimeMs",
        "type": "uint48",
        "indexed": false,
        "internalType": "uint48"
      },
      {
        "name": "basisEwmaE8",
        "type": "int32",
        "indexed": false,
        "internalType": "int32"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "PrintRejected",
    "inputs": [
      {
        "name": "market",
        "type": "uint8",
        "indexed": true,
        "internalType": "uint8"
      },
      {
        "name": "prevOraclePx",
        "type": "uint64",
        "indexed": false,
        "internalType": "uint64"
      },
      {
        "name": "oraclePx",
        "type": "uint64",
        "indexed": false,
        "internalType": "uint64"
      },
      {
        "name": "boundE8",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "SignerUpdated",
    "inputs": [
      {
        "name": "signer",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      }
    ],
    "anonymous": false
  },
  {
    "type": "error",
    "name": "BadConfig",
    "inputs": []
  },
  {
    "type": "error",
    "name": "BadSequence",
    "inputs": [
      {
        "name": "expected",
        "type": "uint64",
        "internalType": "uint64"
      },
      {
        "name": "got",
        "type": "uint64",
        "internalType": "uint64"
      }
    ]
  },
  {
    "type": "error",
    "name": "BadSignature",
    "inputs": []
  },
  {
    "type": "error",
    "name": "ECDSAInvalidSignature",
    "inputs": []
  },
  {
    "type": "error",
    "name": "ECDSAInvalidSignatureLength",
    "inputs": [
      {
        "name": "length",
        "type": "uint256",
        "internalType": "uint256"
      }
    ]
  },
  {
    "type": "error",
    "name": "ECDSAInvalidSignatureS",
    "inputs": [
      {
        "name": "s",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ]
  },
  {
    "type": "error",
    "name": "InvalidShortString",
    "inputs": []
  },
  {
    "type": "error",
    "name": "OwnableInvalidOwner",
    "inputs": [
      {
        "name": "owner",
        "type": "address",
        "internalType": "address"
      }
    ]
  },
  {
    "type": "error",
    "name": "OwnableUnauthorizedAccount",
    "inputs": [
      {
        "name": "account",
        "type": "address",
        "internalType": "address"
      }
    ]
  },
  {
    "type": "error",
    "name": "SourceTimeOverflow",
    "inputs": [
      {
        "name": "srcTimeMs",
        "type": "uint64",
        "internalType": "uint64"
      }
    ]
  },
  {
    "type": "error",
    "name": "SourceTimeSkew",
    "inputs": [
      {
        "name": "srcTimeMs",
        "type": "uint64",
        "internalType": "uint64"
      },
      {
        "name": "chainTimeMs",
        "type": "uint256",
        "internalType": "uint256"
      }
    ]
  },
  {
    "type": "error",
    "name": "StaleSourceTime",
    "inputs": [
      {
        "name": "last",
        "type": "uint64",
        "internalType": "uint64"
      },
      {
        "name": "got",
        "type": "uint64",
        "internalType": "uint64"
      }
    ]
  },
  {
    "type": "error",
    "name": "StringTooLong",
    "inputs": [
      {
        "name": "str",
        "type": "string",
        "internalType": "string"
      }
    ]
  },
  {
    "type": "error",
    "name": "UnknownMarket",
    "inputs": [
      {
        "name": "market",
        "type": "uint8",
        "internalType": "uint8"
      }
    ]
  },
  {
    "type": "error",
    "name": "ZeroPrice",
    "inputs": []
  }
] as const;

export const houseVaultAbi = [
  {
    "type": "constructor",
    "inputs": [
      {
        "name": "quote_",
        "type": "address",
        "internalType": "contract IERC20"
      },
      {
        "name": "team_",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "maxDailyDrawdownBps_",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "maxOutflowBpsPerHour_",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "BUCKETS",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "BUCKET_SEC",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "MIN_CLOSE_ONLY_SEC",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "closeOnlyUntil",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "dayIndex",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "dayStartEquity",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "deployer",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "address"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "depositSeed",
    "inputs": [
      {
        "name": "amount",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "equity",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "isCloseOnly",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "bool",
        "internalType": "bool"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "lastBucket",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "maxDailyDrawdownBps",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "maxOutflowBpsPerHour",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "outflowRoom",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "payOut",
    "inputs": [
      {
        "name": "positionId",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "maxAmount",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "paid",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "positionManager",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "address"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "premiumsReceived",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "quote",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "contract IERC20"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "seedDeposited",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "seedOutstanding",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "seedWithdrawn",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "setPositionManager",
    "inputs": [
      {
        "name": "pm",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "settle",
    "inputs": [
      {
        "name": "positionId",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "delta",
        "type": "int256",
        "internalType": "int256"
      },
      {
        "name": "premium",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "team",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "address"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "tradingInflow",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "tradingOutflow",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "withdrawSeed",
    "inputs": [
      {
        "name": "amount",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "event",
    "name": "CloseOnlyTripped",
    "inputs": [
      {
        "name": "day",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "dayStartEquity",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "equity",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "PaidOut",
    "inputs": [
      {
        "name": "positionId",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "requested",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "paid",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "PositionManagerSet",
    "inputs": [
      {
        "name": "pm",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "SeedDeposited",
    "inputs": [
      {
        "name": "team",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "amount",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "SeedWithdrawn",
    "inputs": [
      {
        "name": "team",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "amount",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "Settled",
    "inputs": [
      {
        "name": "positionId",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "vaultDelta",
        "type": "int256",
        "indexed": false,
        "internalType": "int256"
      },
      {
        "name": "premium",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "error",
    "name": "AlreadySet",
    "inputs": []
  },
  {
    "type": "error",
    "name": "BelowRequiredCapital",
    "inputs": [
      {
        "name": "equityAfter",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "required",
        "type": "uint256",
        "internalType": "uint256"
      }
    ]
  },
  {
    "type": "error",
    "name": "BreakerLatched",
    "inputs": []
  },
  {
    "type": "error",
    "name": "ExceedsSeed",
    "inputs": [
      {
        "name": "outstanding",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "requested",
        "type": "uint256",
        "internalType": "uint256"
      }
    ]
  },
  {
    "type": "error",
    "name": "NegativeInflow",
    "inputs": []
  },
  {
    "type": "error",
    "name": "NotDeployer",
    "inputs": []
  },
  {
    "type": "error",
    "name": "NotPositionManager",
    "inputs": []
  },
  {
    "type": "error",
    "name": "NotTeam",
    "inputs": []
  },
  {
    "type": "error",
    "name": "ReentrancyGuardReentrantCall",
    "inputs": []
  },
  {
    "type": "error",
    "name": "SafeERC20FailedOperation",
    "inputs": [
      {
        "name": "token",
        "type": "address",
        "internalType": "address"
      }
    ]
  }
] as const;

export const feeRouterAbi = [
  {
    "type": "constructor",
    "inputs": [
      {
        "name": "quote_",
        "type": "address",
        "internalType": "contract IERC20"
      },
      {
        "name": "legMask_",
        "type": "uint8",
        "internalType": "uint8"
      },
      {
        "name": "opsRecipient_",
        "type": "address",
        "internalType": "address"
      }
    ],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "accruedByType",
    "inputs": [
      {
        "name": "feeType",
        "type": "uint8",
        "internalType": "enum IFeeRouter.FeeType"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "adapter",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "contract IBuybackAdapter"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "bufferedFees",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "buybackExecutor",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "address"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "collectFee",
    "inputs": [
      {
        "name": "feeType",
        "type": "uint8",
        "internalType": "enum IFeeRouter.FeeType"
      },
      {
        "name": "trader",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "positionId",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "amount",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "deployer",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "address"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "executeBuyback",
    "inputs": [
      {
        "name": "amount",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "minOut",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "burned",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "executeKntqBuyback",
    "inputs": [
      {
        "name": "amount",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "minOut",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "bought",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "kntqAdapter",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "contract IBuybackAdapter"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "legAccrued",
    "inputs": [
      {
        "name": "leg",
        "type": "uint8",
        "internalType": "enum IFeeRouter.Leg"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "legAvailable",
    "inputs": [
      {
        "name": "leg",
        "type": "uint8",
        "internalType": "enum IFeeRouter.Leg"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "legCount",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "legMask",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint8",
        "internalType": "uint8"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "legSpent",
    "inputs": [
      {
        "name": "leg",
        "type": "uint8",
        "internalType": "enum IFeeRouter.Leg"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "maxPerBuyback",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "maxPerKntqBuyback",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "opsRecipient",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "address"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "payOps",
    "inputs": [
      {
        "name": "amount",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "positionManager",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "address"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "quote",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "contract IERC20"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "setAdapter",
    "inputs": [
      {
        "name": "a",
        "type": "address",
        "internalType": "contract IBuybackAdapter"
      },
      {
        "name": "executor",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "maxPerCall",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "setExecutor",
    "inputs": [
      {
        "name": "executor",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "setKntqAdapter",
    "inputs": [
      {
        "name": "a",
        "type": "address",
        "internalType": "contract IBuybackAdapter"
      },
      {
        "name": "maxPerCall",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "setPositionManager",
    "inputs": [
      {
        "name": "pm",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "totalFeesAccrued",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "totalFeesSpent",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "event",
    "name": "AdapterSet",
    "inputs": [
      {
        "name": "adapter",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "BuybackExecuted",
    "inputs": [
      {
        "name": "usdcSpent",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "tokensBurned",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "ExecutorSet",
    "inputs": [
      {
        "name": "executor",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "FeeCollected",
    "inputs": [
      {
        "name": "feeType",
        "type": "uint8",
        "indexed": true,
        "internalType": "enum IFeeRouter.FeeType"
      },
      {
        "name": "trader",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "positionId",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "amount",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "KntqAdapterSet",
    "inputs": [
      {
        "name": "adapter",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "KntqBuybackExecuted",
    "inputs": [
      {
        "name": "usdcSpent",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "kntqBought",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "LegSpent",
    "inputs": [
      {
        "name": "leg",
        "type": "uint8",
        "indexed": true,
        "internalType": "enum IFeeRouter.Leg"
      },
      {
        "name": "to",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "amount",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "PositionManagerSet",
    "inputs": [
      {
        "name": "pm",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      }
    ],
    "anonymous": false
  },
  {
    "type": "error",
    "name": "AboveMaxPerBuyback",
    "inputs": [
      {
        "name": "amount",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "max",
        "type": "uint256",
        "internalType": "uint256"
      }
    ]
  },
  {
    "type": "error",
    "name": "AdapterMisbehaved",
    "inputs": []
  },
  {
    "type": "error",
    "name": "AlreadySet",
    "inputs": []
  },
  {
    "type": "error",
    "name": "BadSplit",
    "inputs": []
  },
  {
    "type": "error",
    "name": "Insufficient",
    "inputs": [
      {
        "name": "available",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "requested",
        "type": "uint256",
        "internalType": "uint256"
      }
    ]
  },
  {
    "type": "error",
    "name": "NoAdapter",
    "inputs": []
  },
  {
    "type": "error",
    "name": "NoOpsRecipient",
    "inputs": []
  },
  {
    "type": "error",
    "name": "NotDeployer",
    "inputs": []
  },
  {
    "type": "error",
    "name": "NotExecutor",
    "inputs": []
  },
  {
    "type": "error",
    "name": "NotPositionManager",
    "inputs": []
  },
  {
    "type": "error",
    "name": "ReentrancyGuardReentrantCall",
    "inputs": []
  },
  {
    "type": "error",
    "name": "SafeERC20FailedOperation",
    "inputs": [
      {
        "name": "token",
        "type": "address",
        "internalType": "address"
      }
    ]
  },
  {
    "type": "error",
    "name": "SameAdapter",
    "inputs": []
  },
  {
    "type": "error",
    "name": "ZeroCap",
    "inputs": []
  }
] as const;

export const tierRegistryAbi = [
  {
    "type": "constructor",
    "inputs": [
      {
        "name": "attester_",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "owner_",
        "type": "address",
        "internalType": "address"
      }
    ],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "ELIGIBLE_TYPEHASH",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "acceptOwnership",
    "inputs": [],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "attester",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "address"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "eip712Domain",
    "inputs": [],
    "outputs": [
      {
        "name": "fields",
        "type": "bytes1",
        "internalType": "bytes1"
      },
      {
        "name": "name",
        "type": "string",
        "internalType": "string"
      },
      {
        "name": "version",
        "type": "string",
        "internalType": "string"
      },
      {
        "name": "chainId",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "verifyingContract",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "salt",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "extensions",
        "type": "uint256[]",
        "internalType": "uint256[]"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "entries",
    "inputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "tier",
        "type": "uint8",
        "internalType": "enum ITierRegistry.Tier"
      },
      {
        "name": "expiry",
        "type": "uint64",
        "internalType": "uint64"
      },
      {
        "name": "nonce",
        "type": "uint64",
        "internalType": "uint64"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "hashEligible",
    "inputs": [
      {
        "name": "account",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "tier",
        "type": "uint8",
        "internalType": "enum ITierRegistry.Tier"
      },
      {
        "name": "expiry",
        "type": "uint64",
        "internalType": "uint64"
      },
      {
        "name": "nonce",
        "type": "uint64",
        "internalType": "uint64"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "owner",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "address"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "pendingOwner",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "address"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "renounceOwnership",
    "inputs": [],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "setAttester",
    "inputs": [
      {
        "name": "attester_",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "setTier",
    "inputs": [
      {
        "name": "account",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "tier",
        "type": "uint8",
        "internalType": "enum ITierRegistry.Tier"
      },
      {
        "name": "expiry",
        "type": "uint64",
        "internalType": "uint64"
      },
      {
        "name": "nonce",
        "type": "uint64",
        "internalType": "uint64"
      },
      {
        "name": "sig",
        "type": "bytes",
        "internalType": "bytes"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "tierOf",
    "inputs": [
      {
        "name": "account",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "uint8",
        "internalType": "enum ITierRegistry.Tier"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "transferOwnership",
    "inputs": [
      {
        "name": "newOwner",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "event",
    "name": "AttesterUpdated",
    "inputs": [
      {
        "name": "attester",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "EIP712DomainChanged",
    "inputs": [],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "OwnershipTransferStarted",
    "inputs": [
      {
        "name": "previousOwner",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "newOwner",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "OwnershipTransferred",
    "inputs": [
      {
        "name": "previousOwner",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "newOwner",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "TierSet",
    "inputs": [
      {
        "name": "account",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "tier",
        "type": "uint8",
        "indexed": false,
        "internalType": "enum ITierRegistry.Tier"
      },
      {
        "name": "expiry",
        "type": "uint64",
        "indexed": false,
        "internalType": "uint64"
      },
      {
        "name": "nonce",
        "type": "uint64",
        "indexed": false,
        "internalType": "uint64"
      }
    ],
    "anonymous": false
  },
  {
    "type": "error",
    "name": "BadSignature",
    "inputs": []
  },
  {
    "type": "error",
    "name": "ECDSAInvalidSignature",
    "inputs": []
  },
  {
    "type": "error",
    "name": "ECDSAInvalidSignatureLength",
    "inputs": [
      {
        "name": "length",
        "type": "uint256",
        "internalType": "uint256"
      }
    ]
  },
  {
    "type": "error",
    "name": "ECDSAInvalidSignatureS",
    "inputs": [
      {
        "name": "s",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ]
  },
  {
    "type": "error",
    "name": "Expired",
    "inputs": []
  },
  {
    "type": "error",
    "name": "InvalidShortString",
    "inputs": []
  },
  {
    "type": "error",
    "name": "OwnableInvalidOwner",
    "inputs": [
      {
        "name": "owner",
        "type": "address",
        "internalType": "address"
      }
    ]
  },
  {
    "type": "error",
    "name": "OwnableUnauthorizedAccount",
    "inputs": [
      {
        "name": "account",
        "type": "address",
        "internalType": "address"
      }
    ]
  },
  {
    "type": "error",
    "name": "StaleNonce",
    "inputs": [
      {
        "name": "last",
        "type": "uint64",
        "internalType": "uint64"
      },
      {
        "name": "got",
        "type": "uint64",
        "internalType": "uint64"
      }
    ]
  },
  {
    "type": "error",
    "name": "StringTooLong",
    "inputs": [
      {
        "name": "str",
        "type": "string",
        "internalType": "string"
      }
    ]
  }
] as const;

export const testUSDCAbi = [
  {
    "type": "constructor",
    "inputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "FAUCET_MAX",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "allowance",
    "inputs": [
      {
        "name": "owner",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "spender",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "approve",
    "inputs": [
      {
        "name": "spender",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "value",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "bool",
        "internalType": "bool"
      }
    ],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "balanceOf",
    "inputs": [
      {
        "name": "account",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "decimals",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint8",
        "internalType": "uint8"
      }
    ],
    "stateMutability": "pure"
  },
  {
    "type": "function",
    "name": "mint",
    "inputs": [
      {
        "name": "to",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "amount",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "name",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "string",
        "internalType": "string"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "symbol",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "string",
        "internalType": "string"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "totalSupply",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "transfer",
    "inputs": [
      {
        "name": "to",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "value",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "bool",
        "internalType": "bool"
      }
    ],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "transferFrom",
    "inputs": [
      {
        "name": "from",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "to",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "value",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "bool",
        "internalType": "bool"
      }
    ],
    "stateMutability": "nonpayable"
  },
  {
    "type": "event",
    "name": "Approval",
    "inputs": [
      {
        "name": "owner",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "spender",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "value",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "Transfer",
    "inputs": [
      {
        "name": "from",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "to",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "value",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "error",
    "name": "ERC20InsufficientAllowance",
    "inputs": [
      {
        "name": "spender",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "allowance",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "needed",
        "type": "uint256",
        "internalType": "uint256"
      }
    ]
  },
  {
    "type": "error",
    "name": "ERC20InsufficientBalance",
    "inputs": [
      {
        "name": "sender",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "balance",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "needed",
        "type": "uint256",
        "internalType": "uint256"
      }
    ]
  },
  {
    "type": "error",
    "name": "ERC20InvalidApprover",
    "inputs": [
      {
        "name": "approver",
        "type": "address",
        "internalType": "address"
      }
    ]
  },
  {
    "type": "error",
    "name": "ERC20InvalidReceiver",
    "inputs": [
      {
        "name": "receiver",
        "type": "address",
        "internalType": "address"
      }
    ]
  },
  {
    "type": "error",
    "name": "ERC20InvalidSender",
    "inputs": [
      {
        "name": "sender",
        "type": "address",
        "internalType": "address"
      }
    ]
  },
  {
    "type": "error",
    "name": "ERC20InvalidSpender",
    "inputs": [
      {
        "name": "spender",
        "type": "address",
        "internalType": "address"
      }
    ]
  }
] as const;
