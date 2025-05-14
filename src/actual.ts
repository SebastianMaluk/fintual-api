import * as api from "@actual-app/api"
import * as fs from "node:fs"
import type { TransactionEntity } from "@actual-app/api/@types/loot-core/types/models"
import * as v from "valibot"
import type { InitConfig } from "@actual-app/api/@types/loot-core/server/main"
import "./env"

const SERVER_URL = process.env.ACTUAL_SERVER_URL ?? ""
const PASSWORD = process.env.ACTUAL_PASSWORD ?? ""
const SYNC_ID = process.env.ACTUAL_SYNC_ID ?? ""
const BUDGET_ID = process.env.ACTUAL_BUDGET_ID ?? ""
const FINTUAL_ACCOUNT = process.env.ACTUAL_FINTUAL_ACCOUNT ?? ""
const STARTING_DATE = process.env.STARTING_DATE ?? "2024-03-01"
const PAYEE = process.env.ACTUAL_PAYEE ?? "Fintual"

if (
	!SERVER_URL ||
	!PASSWORD ||
	!SYNC_ID ||
	!BUDGET_ID ||
	!FINTUAL_ACCOUNT ||
	!STARTING_DATE ||
	!PAYEE
) {
	console.error("Missing environment variables")
	process.exit(1)
}

const balanceFileSchema = v.object({
	balance: v.array(
		v.object({
			date: v.number(),
			value: v.number(),
			difference: v.number(),
			realDifference: v.number(),
		}),
	),
	deposits: v.array(
		v.object({
			date: v.number(),
			value: v.number(),
			difference: v.number(),
		}),
	),
})
async function dailyVariation() {
	await api.init({
		dataDir: "./tmp/actual-data",
		serverURL: SERVER_URL,
		password: PASSWORD,
	} satisfies InitConfig)

	await api.downloadBudget(SYNC_ID)

	const transactions = await api.getTransactions(
		FINTUAL_ACCOUNT,
		undefined,
		undefined,
	)
	console.log("Transactions count:", transactions.length)

	let total = 0
	for (const element of transactions) {
		total += element.amount
	}
	console.log("Total:", total)

	// open balance.json file
	const balanceFile = fs.readFileSync(
		"./tmp/fintual-data/balance.json",
		"utf-8",
	)
	const balance = JSON.parse(balanceFile)
	// validate balance file
	const balanceValidation = v.safeParse(balanceFileSchema, balance)
	if (!balanceValidation.success) {
		console.error("Balance file is invalid:", balanceValidation.issues)
		return
	}

	// for each balance entry, create a transaction
	const balanceData = balanceValidation.output.balance
	// filter balance data to only include entries after STARTING_DATE
	const filteredBalanceData = balanceData.filter(
		(b) => b.date >= Date.parse(STARTING_DATE),
	)

	const newTransactions: TransactionEntity[] = []
	for (const b of filteredBalanceData) {
		const transaction: TransactionEntity = {
			id: b.date.toString(),
			account: FINTUAL_ACCOUNT,
			payee: PAYEE,
			amount: Math.round(b.realDifference * 100),
			date: new Date(b.date).toISOString().split("T")[0],
			imported_id: b.date.toString(),
			notes: "Variation",
		}

		newTransactions.push(transaction)
	}

	const { added, updated, errors } = await api.importTransactions(
		FINTUAL_ACCOUNT,
		newTransactions,
	)

	console.log("Added transactions:", added.length)
	console.log("Updated transactions:", updated.length)
	console.log("Errors:", errors?.length)

	await api.shutdown()
}

async function baseVariation() {
	await api.init({
		dataDir: "./tmp/actual-data",
		serverURL: SERVER_URL,
		password: PASSWORD,
	} satisfies InitConfig)

	await api.downloadBudget(SYNC_ID)

	// sum up all real differences from the balance.json file
	const balanceFile = fs.readFileSync(
		"./tmp/fintual-data/balance.json",
		"utf-8",
	)
	const balance = JSON.parse(balanceFile)
	// validate balance file
	const balanceValidation = v.safeParse(balanceFileSchema, balance)
	if (!balanceValidation.success) {
		console.error("Balance file is invalid:", balanceValidation.issues)
		return
	}
	const balanceData = balanceValidation.output.balance

	// sum up all real differences before march 2024
	const filteredBalanceData = balanceData.filter(
		(b) => b.date < Date.parse(STARTING_DATE),
	)

	let sum = 0
	for (const b of filteredBalanceData) {
		sum += b.realDifference
	}

	const dateInWords = new Date(Date.parse(STARTING_DATE)).toLocaleDateString(
		"es-CL",
	)
	console.log(`Sum of real differences before ${dateInWords}:`, sum)
	// create a transatcion for the sum
	const transaction: TransactionEntity = {
		id: Date.parse(STARTING_DATE).toString(),
		account: FINTUAL_ACCOUNT,
		payee: PAYEE,
		amount: Math.round(sum * 100),
		date: new Date(Date.parse(STARTING_DATE)).toISOString().split("T")[0],
		imported_id: `${Date.parse(STARTING_DATE).toString()}_base`,
		notes: "Base variation",
	}

	const { added, updated, errors } = await api.importTransactions(
		FINTUAL_ACCOUNT,
		[transaction],
	)
	console.log("Added transactions:", added.length)
	console.log("Updated transactions:", updated.length)
	console.log("Errors:", errors?.length)

	await api.shutdown()
}

export async function main() {
	await dailyVariation()
	await baseVariation()
}
