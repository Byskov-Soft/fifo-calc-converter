// Converts from Pionex trading.csv to fifo-calc's format
import { parse } from '@std/csv/parse'
import { parseISO } from 'date-fns'
import { z } from 'zod'
import { utcDateStringToISOString } from './helpers/date.ts'
import type { ConversionConfig } from './helpers/otherModels.ts'
import { getTargetCurrencyRate, loadRateTable } from './helpers/rateTable.ts'
import {
  FifoCalcInputColumns,
  type FifoCalcInputTransaction,
  TRANSACTION_TYPE,
} from './helpers/transactionModel.ts'

// Bybit CSV header columns
const bybitSpotPreUnifiedColumns = [
  'filled_local_time',
  'spot_pair',
  'order_type',
  'direction',
  'filled_value',
  'filled_price',
  'filled_quantity',
  'fees',
  'transaction_id',
  'order_no',
  'timestamp_utc',
]

// Parser for the Bybit records (after they have been parsed from CSV)
const BybitSpotPreUnifiedInputRecord = z.object({
  filled_local_time: z.string().transform((v: string) => utcDateStringToISOString(v)),
  spot_pair: z.string(),
  order_type: z.string(),
  direction: z.enum(['Buy', 'Sell']),
  filled_value: z.string().transform((v: string) => parseFloat(v)),
  filled_price: z.string().transform((v: string) => parseFloat(v)),
  filled_quantity: z.string().transform((v: string) => parseFloat(v)),
  fees: z.string().transform((v: string) => parseFloat(v)),
  transaction_id: z.string(),
  order_no: z.string(),
  timestamp_utc: z.string().transform((v: string) => utcDateStringToISOString(v)),
})

type BybitSpotPreUnifiedInputRecord = z.TypeOf<typeof BybitSpotPreUnifiedInputRecord>

// Convert the Bybit CSV to JSON
const parseCsvToInputRecord = async (
  csvFilePath: string,
): Promise<BybitSpotPreUnifiedInputRecord[]> => {
  const dataTxt = await Deno.readTextFile(csvFilePath)
  const dataJSON = parse(dataTxt, { columns: bybitSpotPreUnifiedColumns, skipFirstRow: true })
  return dataJSON.map((row) => BybitSpotPreUnifiedInputRecord.parse(row))
}

// Convert the Bybit JSON to FIFO-calc's InputTransaction format
const convertToInputRecord = async (
  rawRecords: BybitSpotPreUnifiedInputRecord[],
  config: ConversionConfig,
): Promise<FifoCalcInputTransaction[]> => {
  if (config.rateFile) {
    await loadRateTable(config.rateFile)
  }

  return rawRecords.map((record) => {
    const date = record.filled_local_time
    const type = record.direction === 'Buy' ? TRANSACTION_TYPE.B : TRANSACTION_TYPE.S
    const symbol = record.spot_pair.split('/')[0]
    const tcur_cost = record.filled_value
    const item_count = record.filled_quantity
    const tcur_conversion_rate = config.rateFile
      ? getTargetCurrencyRate(record.filled_local_time)
      : (config.fixedRate ?? 1)
    const symbol_fee = type === TRANSACTION_TYPE.B ? record.fees : 0
    const tcur_fee = type === TRANSACTION_TYPE.S ? record.fees : 0

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

export const convertBybitSpotPreUnified = async (
  config: ConversionConfig,
) => {
  const rawRecords = await parseCsvToInputRecord(config.input)
  const outputRecords = await convertToInputRecord(rawRecords, config)

  const sorted = outputRecords.sort((a, b) =>
    parseISO(a.date).getTime() - parseISO(b.date).getTime()
  )

  const outputData = [
    FifoCalcInputColumns.join(','),
    ...sorted.map((record) => Object.values(record).join(',')),
  ].join('\n')

  await Deno.writeTextFile(config.output, outputData)
}
