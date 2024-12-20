import { convertBybitSpotPreUnified } from './src/bybitSpotPreUnified.ts'
import { convertBybitSpotUnified } from './src/bybitSpotUnified.ts'
import {
  getArgAt,
  getOptValue,
  parseAppOptions,
  setUsage,
  showUsageAndExit,
} from './src/helpers/cmdOptions.ts'

import type { ConversionConfig, ConversionFunction, Usage } from './src/helpers/otherModels.ts'
import { convertPionexTracker } from './src/pionexTracker.ts'
import { convertPionexTrading } from './src/pionexTrading.ts'

enum CONVERSION_TYPE {
  HELP = 'help',
  BYBIT_SPOT_PRE_UNIFIED = 'bybit-spot-pre-unified',
  BYBIT_SPOT_UNIFIED = 'bybit-spot-unified',
  PIONEX_TRADING = 'pionex-trading',
  PIONEX_COIN_TRACKER = 'pionex-coin-tracker',
}

const usage: Usage = {
  option: `<command>`,
  arguments: [
    `Command : (${Object.values(CONVERSION_TYPE).join(' | ')})`,
    'Options:',
    ' [--t-currency <currency>]       : Transaction currency - defaults to USD',
    ' --tax-currency <currency>       : Taxable currency',
    ' (--fixed-rate <rate> |          : Used a fixed rate\n ' +
    '  --rate-file <rate-json-file>)    or a rate file',
    ' --input <input-csv-file>        : The file to convert',
    ' --output <output-csv-file>      : The output file',
  ],
}

parseAppOptions()
setUsage(usage)

let convert: ConversionFunction | null = null
const arg = getArgAt(0) ?? ''

switch (arg.toString().toLocaleLowerCase()) {
  case CONVERSION_TYPE.BYBIT_SPOT_PRE_UNIFIED: {
    convert = convertBybitSpotPreUnified
    break
  }
  case CONVERSION_TYPE.BYBIT_SPOT_UNIFIED: {
    convert = convertBybitSpotUnified
    break
  }
  case CONVERSION_TYPE.PIONEX_TRADING: {
    convert = convertPionexTrading
    break
  }
  case CONVERSION_TYPE.PIONEX_COIN_TRACKER: {
    convert = convertPionexTracker
    break
  }
  case CONVERSION_TYPE.HELP: {
    showUsageAndExit({ exitWithError: false })
    break
  }
  default: {
    showUsageAndExit()
  }
}

const transactionCurrency = (getOptValue('t-currency') as string) ?? 'USD'
const taxCurrency = getOptValue('tax-currency') as string
const fixedRate = getOptValue('fixed-rate') as number
const rateFile = getOptValue('rate-file') as string
const input = getOptValue('input') as string
const output = getOptValue('output') as string

const optionsValidated = transactionCurrency && taxCurrency && (fixedRate || rateFile) &&
  input && output

if (!optionsValidated) {
  showUsageAndExit()
} else {
  const config: ConversionConfig = {
    transactionCurrency,
    taxCurrency,
    fixedRate,
    rateFile,
    input,
    output,
  }

  await convert!(config)
  console.log(`\nOutput file written to ${output}\n`)
}
