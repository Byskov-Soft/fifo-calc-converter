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

const pionexTrackerInputColumns = [
  'date',
  'received_quantity',
  'received_currency',
  'sent_quantity',
  'sent_currency',
  'fee_amount',
  'fee_currency',
  'tag',
]

const PionexTrackerInputRecord = z.object({
  date: z.string().transform((v: string) => utcDateStringToISOString(v)),
  received_quantity: z.string().transform((v: string) => parseFloat(v)),
  received_currency: z.string(),
  sent_quantity: z.string().transform((v: string) => parseFloat(v)),
  sent_currency: z.string(),
  fee_amount: z.string().transform((v: string) => parseFloat(v)),
  fee_currency: z.string(),
  tag: z.string(),
})

type PionexInputRecord = z.TypeOf<typeof PionexTrackerInputRecord>

const parseCsvToInputRecord = async (
  csvFilePath: string,
  outputFilePath: string,
): Promise<PionexInputRecord[]> => {
  const dataTxt = await Deno.readTextFile(csvFilePath)
  const dataJSON = parse(dataTxt, { columns: pionexTrackerInputColumns, skipFirstRow: true })
  const invalids: Record<string, unknown>[] = []

  const parsed = dataJSON.map((row) => {
    const record = PionexTrackerInputRecord.parse(row)

    const conditions = [
      !isNaN(record.received_quantity),
      !isNaN(record.sent_quantity),
      !isNaN(record.fee_amount),
      record.received_quantity > 0,
      record.sent_quantity > 0,
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
        pionexTrackerInputColumns.join(','),
        ...invalids.map((row) => Object.values(row).join(',')),
      ].join('\n'),
    )

    console.error(
      `\nWrote ${invalids.length} zero quantity (received or sent) records to ${filePath}\n`,
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

  return rawRecords.map((record) => {
    const date = record.date
    const type = record.received_currency !== 'USDT' ? TRANSACTION_TYPE.B : TRANSACTION_TYPE.S
    const symbol = type === TRANSACTION_TYPE.B ? record.received_currency : record.sent_currency
    const tcur_cost = type === TRANSACTION_TYPE.B ? record.sent_quantity : record.received_quantity
    const item_count = type === TRANSACTION_TYPE.B ? record.received_quantity : record.sent_quantity
    const tcur_conversion_rate = config.rateFile
      ? getTargetCurrencyRate(record.date)
      : (config.fixedRate ?? 1)
    const symbol_fee = 0
    const tcur_fee = record.fee_amount

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

export const convertPionexTracker = async (
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
