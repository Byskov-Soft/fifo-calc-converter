import { parseISO } from 'date-fns'
import z from 'zod'

// Commandline arguments and usage
export interface Usage {
  option: string
  arguments: string[]
}

export interface ConversionConfig {
  transactionCurrency: string
  taxCurrency: string
  fixedRate?: number
  rateFile?: string
  input: string
  output: string
}

export type ConversionFunction = (config: ConversionConfig) => Promise<void>

// ISO8601DateString
export const ISO8601DateString = z.string().refine(
  (arg): boolean => {
    if (parseISO(arg).toString() === 'Invalid Date') {
      console.error(`Parsing of '${arg}' as ISO8601 date failed`)
      return false
    }

    return true
  },
  { message: `Value is not a valid date` },
)

export type ISO8601DateString = z.TypeOf<typeof ISO8601DateString>

// RateRecord
export const RateRecord = z.record(ISO8601DateString, z.number())
export type RateRecord = z.TypeOf<typeof RateRecord>
