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

const bybitSpotUnifiedInputColumns = [
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

const BybitSpotUnifiedInputRecord = z.object({
  spot_pair: z.string(),
  order_type: z.string(),
  direction: z.enum(['BUY', 'SELL']),
  filled_value: z.string().transform((v: string) => parseFloat(v)),
  filled_price: z.string().transform((v: string) => parseFloat(v)),
  filled_quantity: z.string().transform((v: string) => parseFloat(v)),
  fees: z.string().transform((v: string) => parseFloat(v)),
  transaction_id: z.string(),
  order_no: z.string(),
  timestamp_utc: z.string().transform((v: string) => utcDateStringToISOString(v)),
})

type BybitSpotUnifiedInputRecord = z.TypeOf<typeof BybitSpotUnifiedInputRecord>

const parseCsvToInputRecord = async (
  csvFilePath: string,
): Promise<BybitSpotUnifiedInputRecord[]> => {
  const dataTxt = await Deno.readTextFile(csvFilePath)
  const dataJSON = parse(dataTxt, { columns: bybitSpotUnifiedInputColumns, skipFirstRow: true })
  return dataJSON.map((row) => BybitSpotUnifiedInputRecord.parse(row))
}

const convertToInputRecord = async (
  rawRecords: BybitSpotUnifiedInputRecord[],
  config: ConversionConfig,
): Promise<FifoCalcInputTransaction[]> => {
  if (config.rateFile) {
    await loadRateTable(config.rateFile)
  }

  return rawRecords.map((record) => {
    const date = record.timestamp_utc
    const type = record.direction === 'BUY' ? TRANSACTION_TYPE.B : TRANSACTION_TYPE.S
    const symbol = record.spot_pair.slice(0, -4)
    const tcur_cost = record.filled_value
    const item_count = record.filled_quantity
    const tcur_conversion_rate = config.rateFile
      ? getTargetCurrencyRate(record.timestamp_utc)
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

export const convertBybitSpotUnified = async (
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
