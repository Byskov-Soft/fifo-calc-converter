import z from 'zod'
import { ISO8601DateString } from './otherModels.ts'

export const FifoCalcInputColumns = [
  't_currency',
  'tax_currency',
  'date',
  'type',
  'symbol',
  'tcur_cost',
  'item_count',
  'tcur_conversion_rate',
  'symbol_fee',
  'tcur_fee',
]

export enum TRANSACTION_TYPE {
  B = 'B',
  S = 'S',
}

export const TransctionType = z.enum([TRANSACTION_TYPE.B, TRANSACTION_TYPE.S])
export type TransctionType = z.TypeOf<typeof TransctionType>

export const FifoCalcInputTransaction = z.object({
  t_currency: z.string(),
  tax_currency: z.string(),
  date: ISO8601DateString,
  type: TransctionType,
  symbol: z.string(),

  // The cost of the transaction (price of all items)
  tcur_cost: z.number(), // tcur = transaction currency

  // How many items were bought or sold
  item_count: z.number(),

  // The cost of the taxable currency in the transaction currency
  tcur_conversion_rate: z.number(),

  // Typically for buy transactions (although some exchanges only have USD fees)
  symbol_fee: z.number(),

  // Typically for sell transactions
  tcur_fee: z.number(),
})

export type FifoCalcInputTransaction = z.TypeOf<typeof FifoCalcInputTransaction>
