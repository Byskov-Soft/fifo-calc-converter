# Fifo-calc-converter

A commandline tool for converting transaction files (in CSV format) from crypto exchanges to a
format compatible with the `fifo-calc` tool.

`fifo-calc-converter` is part of the `fifo-calc` crypto suite, which consists of the following
tools:

| Tool                                                                      | Description                                                                                                      |
| ------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| [fifo-calc](https://github.com/Byskov-Soft/fifo-calc)                     | Creates FIFO reports based on buy and sell transactions to be used for reporting capital gains.                  |
| [fifo-calc-converter](https://github.com/Byskov-Soft/fifo-calc-converter) | Converts transaction (CSV) files from various crypto exchanges, to a format that can be imported by `fifo-calc`. |
| [fifo-calc-rates](https://github.com/Byskov-Soft/fifo-calc-rates)         | Creates currency rate files to be used with `fifo-calc-converter`.                                               |

## When would I need this tool?

It is pretty much guaranteed that all of the exports from crypto exchanges are incompatible with
`fifo-calc`, so if you have many transactions, using a conversion tool like this is likely better
than manually typing in the records.

**IMPORTANT:** It should be said that if you are not a software engineer `fifo-calc-converter` is
probably useless to you. Only few conversions are supported, so you would likely have to create your
own, by using the existing ones as example. See details from the
[Extending fifo-calc-converter](#extending-fifo-calc-converter) section below.

## When would I NOT need this tool?

If you already have CSV files (or spreadsheets) with values close what is needed by `fifo-calc`, it
may be simple to rearrange existing data, making this tool redundant.

## Installation

- Install the [Deno runtime](https://deno.com/)

  If you are on Linux or Mac, using [DVM](https://deno.land/x/dvm@v1.9.1) (Deno version manager) is
  recommended

- Clone this [GitHub repository](https://github.com/Byskov-Soft/fifo-calc-converter.git):

  `git clone https://github.com/Byskov-Soft/fifo-calc-converter.git`

- Compile the binary:
  ```
  cd fifo-calc-converter
  deno task compile
  ```
- Copy the compiled binary to a directory in your path

  For example: `sudo cp ./fifo-calc-converter /usr/local/bin/`

## Usage

```
Usage: fifo-calc-convert <command> <options>

 Command : (bybit-spot-pre-unified | bybit-spot-unified | pionex-trading | pionex-coin-tracker | help)

 Options:
  [--t-currency <currency>]       : Transaction currency - defaults to USD

  --tax-currency <currency>       : Taxable currency

  (--fixed-rate <rate> |          : Used a fixed rate or rate file
   --rate-file <rate-json-file>)    for taxable currency conversion

  --input <input-csv-file>        : The file to convert

  --output <output-csv-file>      : The output file
```

## Supported Exchanges and exports

**Note:** Only simple buy and sell transactions are supported by `fifo-calc`, and only transactions
from and to a stable coin pegged to a fiat currency. If you have earning from staking, mining,
liquidity pools, etc. You would need somethings else besides the `fifo-calc` tools.

| Exchange | Export type        | Description                                                                |
| -------- | ------------------ | -------------------------------------------------------------------------- |
| Bybit    | Unified spot       | Spot trading from before Bybit introduced their new "unified" account type |
| Bybit    | Pre-unified spot   | Spot trading from a "unified" account                                      |
| Pionex   | Pionex trading     |                                                                            |
| Pionex   | Pionex cointracker |                                                                            |

## Rate files

If you are not using a fixed rate to convert to the taxable currency (e.g. USD to EUR), but need the
rate on the date of each transaction, you must provide a rate file.

Example contents of a EUR/USD rate file. Each line contains the USD cost of one EUR on specific
days.

```
{
  "2024-01-01": 1.105,
  "2024-01-02": 1.0956,
  "2024-01-03": 1.0919,
  "2024-01-04": 1.0953,
  "2024-01-05": 1.0921,
  ...
}
```

## Extending fifo-calc-converter

If you know basic programming, it should be simple to clone this repository and create a converter
for your needs.

To extend the converter, you would need to:

1. Add a new exchange specific converter in `src/` (use an existing one as example).

1. Expand the commandline parsing in `main.ts` to include the new converter (and call it when
   selected).

## Fifo-calc input format

The following is an example of the target format we want to convert to (the `fifo-calc` input
format)

```csv
t_currency,tax_currency,date,type,symbol,tcur_cost,item_count,tcur_conversion_rate,symbol_fee,tcur_fee
USD,EUR,2024-09-23T12:30:32.000Z,B,RENDER,105.31035,16.35,1.1119,0.01635,0
USD,EUR,2024-09-25T05:41:22.000Z,S,RENDER,49.059,7.9,1.1194,0,0.049059
```

Column descriptions

| Column               | Description                                                                                                                                                                                                                                |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| t_currency           | Transaction currency                                                                                                                                                                                                                       |
| tax_currency         | Taxable currency                                                                                                                                                                                                                           |
| date                 | When did you buy or sell? Different date formats will work as long as they can be parsed by JavaScript. Preferably use an ISO format such as `YYYY-MM-DD HH:mm:ss`                                                                         |
| type                 | Transaction type: B = Buy, S = Sell                                                                                                                                                                                                        |
| symbol               | What did you buy? BTC, SOL, etc                                                                                                                                                                                                            |
| tcur_cost            | What was the price (fee excluded) of the purchase in the transaction currency?                                                                                                                                                             |
| item_count           | How many did you buy (this may be fractional)?                                                                                                                                                                                             |
| tcur_conversion_rate | How much did the taxable currentcy cost in the transaction currency on the transaction date? Example: on `October 17th 2024` the cost of `1 EUR` was `1.0866 USD`. If the transaction currency and taxable currency are the same, put `1`. |
| symbol_fee           | Eventual fee in the "symbol" currency or "0"                                                                                                                                                                                               |
| tcur_fee             | Eventual fee in the transaction currency or "0"                                                                                                                                                                                            |
