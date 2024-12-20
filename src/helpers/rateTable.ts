import { RateRecord } from './otherModels.ts'

let rateTable: RateRecord = {}
let rateFile: string

export const loadRateTable = async (rateFilePath: string) => {
  rateFile = rateFilePath
  const fileInfo = await Deno.stat(rateFile)

  if (!fileInfo.isFile) {
    console.error(`\nRate table file ${rateFile} was not found.\n`)
    Deno.exit(1)
  }

  const data = await Deno.readTextFile(rateFile)
  rateTable = RateRecord.parse(JSON.parse(data))
}

export const getTargetCurrencyRate = (transactionDate: string): number => {
  const date = transactionDate.substring(0, 10)

  if (!rateTable) {
    console.error(`Rate table has not been loaded`)
    Deno.exit(1)
  }

  const rate = rateTable[date]

  if (!rate) {
    console.error(`\nNo rate found for ${date} in ${rateFile}\n`)
    Deno.exit(1)
  }

  return rate
}
