import { type Args, parseArgs } from '@std/cli/parse-args'
import type { Usage } from './otherModels.ts'

let args: Args
let usageString: string = 'ERROR: Usage not set'

const checkArgs = () => {
  if (!args) {
    throw new Error('parseAppArgs() must be called before getArg()')
  }
}

export const parseAppOptions = () => {
  args = parseArgs(Deno.args)
}

export const getOptValue = (option: string) => {
  checkArgs()
  return args[option]
}

export const hasOption = (option: string) => {
  checkArgs()
  return args[option] !== undefined
}

export const getArgAt = (index: number) => {
  checkArgs()
  return args._[index]
}

export const hasArg = (arg: string) => {
  checkArgs()
  return args._.includes(arg)
}

export const setUsage = (usage: Usage) => {
  if (usage.arguments.length) {
    usageString = [
      `Usage: fifo-calc-convert ${usage.option} <options>`,
      '',
      ...usage.arguments.map((arg) => ` ${arg}\n`),
    ].join('\n')
  } else {
    usageString = `\nUsage: fifo-calc-convert ${usage.option}\n`
  }
}

interface UsageParams {
  extras?: string | null
  exitWithError: boolean
}

export const showUsageAndExit = (
  params: UsageParams = { extras: null, exitWithError: true },
) => {
  const { extras, exitWithError } = params
  console.log('---------------------------------')

  if (exitWithError) {
    console.error(`\nInvalid commandline options or arguments\n`)
  }

  console.log(usageString)

  if (extras) {
    console.log(extras)
  }

  console.log('---------------------------------')
  Deno.exit(exitWithError ? 1 : 0)
}
