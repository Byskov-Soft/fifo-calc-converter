// Converts from Pionex trading.csv to fifo-calc's format
import { parse } from '@std/csv/parse'
import { all, identity } from 'rambda'
import { z } from 'zod'
import { utcDateStringToISOString } from './helpers/date.ts'
import type { ConversionConfig } from './helpers/otherModels.ts'
import { getTargetCurrencyRate, loadRateTable } from './helpers/rateTable.ts'
import {
  FifoCalcInputColumns,
  type FifoCalcInputTransaction,
  TRANSACTION_TYPE,
} from './helpers/transactionModel.ts'

const pionexTradingInputColumns = [
  'date',
  'amount',
  'price',
  'order_type',
  'side',
  'symbol',
  'state',
  'fee',
  'strategy_type',
]

const PionexTradingInputRecord = z.object({
  date: z.string().transform((v: string) => utcDateStringToISOString(v)),
  amount: z.string().transform((v: string) => parseFloat(v)),
  price: z.string().transform((v: string) => parseFloat(v)),
  side: z.enum(['BUY', 'SELL']),
  symbol: z.string().transform((v: string) => v.split('_')[0]),
  fee: z.string().transform((v: string) => parseFloat(v)),
})

type PionexInputRecord = z.TypeOf<typeof PionexTradingInputRecord>

const parseCsvToInputRecord = async (
  csvFilePath: string,
  outputFilePath: string,
): Promise<PionexInputRecord[]> => {
  const dataTxt = await Deno.readTextFile(csvFilePath)
  const dataJSON = parse(dataTxt, { columns: pionexTradingInputColumns, skipFirstRow: true })
  const invalids: Record<string, unknown>[] = []

  const parsed = dataJSON.map((row) => {
    const record = PionexTradingInputRecord.parse(row)

    const conditions = [
      !isNaN(record.price),
      !isNaN(record.amount),
      record.price > 0,
      record.amount > 0,
    ]

    if (!all(identity, conditions)) {
      invalids.push(row)
      return null
    }

    return record
  }).filter((record) => record !== null)

  if (invalids.length) {
    const filePath = `${outputFilePath.replace('.csv', '')}.invalid.csv`

    await Deno.writeTextFile(
      filePath,
      [
        pionexTradingInputColumns.join(','),
        ...invalids.map((row) => Object.values(row).join(',')),
      ].join('\n'),
    )

    console.error(
      `\nWrote ${invalids.length} zero price/amount records to ${filePath}\n`,
      '\nNote:\n',
      'These records may not be strictly invalid as they could\n',
      'be deposits, withdrawals or internal Pionex transfers.\n',
    )
  }

  return parsed
}

const convertToInputRecord = async (
  rawRecords: PionexInputRecord[],
  config: ConversionConfig,
): Promise<FifoCalcInputTransaction[]> => {
  if (config.rateFile) {
    await loadRateTable(config.rateFile)
  }

  /** Pionex data:
   *  - amount = the cost of the trade
   *  - price = the price of the asset
   */

  return rawRecords.map((record) => {
    const date = record.date
    const type = record.side === 'BUY' ? TRANSACTION_TYPE.B : TRANSACTION_TYPE.S
    const symbol = record.symbol
    const tcur_cost = record.amount // Read comment above
    const item_count = record.amount / record.price
    const tcur_conversion_rate = config.rateFile
      ? getTargetCurrencyRate(record.date)
      : (config.fixedRate ?? 1)
    const symbol_fee = type === TRANSACTION_TYPE.B ? record.fee : 0
    const tcur_fee = type === TRANSACTION_TYPE.S ? record.fee : 0

    return {
      t_currency: config.transactionCurrency,
      tax_currency: config.taxCurrency,
      date,
      type,
      symbol,
      tcur_cost,
      item_count,
      tcur_conversion_rate,
      symbol_fee,
      tcur_fee,
    }
  })
}

export const convertPionexTrading = async (
  config: ConversionConfig,
) => {
  const rawRecords = await parseCsvToInputRecord(config.input, config.output)
  const outputRecords = await convertToInputRecord(rawRecords, config)

  const outputData = [
    FifoCalcInputColumns.join(','),
    ...outputRecords.map((record) => Object.values(record).join(',')),
  ].join('\n')

  await Deno.writeTextFile(config.output, outputData)
}
