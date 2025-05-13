import "./env"
import { getRandom } from "random-useragent"
import { chromium, type Page } from "playwright"
import fs from "node:fs"
import * as v from "valibot"

const BASE_URL = "https://fintual.cl/app"
const USER_EMAIL = process.env.FINTUAL_USER_EMAIL || ""
const USER_PASSWORD = process.env.FINTUAL_USER_PASSWORD || ""
const GOAL_ID = process.env.FINTUAL_GOAL_ID || ""

async function login(page: Page) {
	const emailInput = await page.waitForSelector('input[name="user[email]"]')
	const passwordInput = await page.waitForSelector(
		'input[name="user[password]"]',
	)
	const loginButton = await page.waitForSelector('button[type="submit"]')

	await emailInput.fill(USER_EMAIL)
	await passwordInput.fill(USER_PASSWORD)
	await loginButton.click()
	await page.waitForTimeout(2000)
	const url = page.url()
	if (url === `${BASE_URL}/login`) {
		console.log("Login failed")
		return false
	}
	console.log("Login successful")
	await page.waitForTimeout(2000)

	return true
}

const performanceSchema = v.object({
	name: v.string(),
	identifier: v.string(),
	data: v.array(
		v.object({
			date: v.number(),
			value: v.number(),
		}),
	),
	balance: v.number(),
})

const goalPerformanceSchema = v.object({
	data: v.object({
		id: v.string(),
		type: v.string(),
		attributes: v.object({
			id: v.number(),
			performance: v.array(performanceSchema),
		}),
	}),
})

async function getPerformance(page: Page) {
	const responsePromise = page.waitForResponse(
		(response) =>
			response.url() === `${BASE_URL}/goals/${GOAL_ID}/performance` &&
			response.status() === 200,
	)

	await page.goto(`${BASE_URL}/goals/${GOAL_ID}`)

	const response = await responsePromise

	if (!response) {
		console.error("No response received")
		return null
	}

	const data = await response.json()
	const parsed = v.safeParse(goalPerformanceSchema, data)
	if (parsed.success) {
		return parsed.output
	}

	console.error(
		"Validation failed:",
		parsed.issues.map((issue) => issue.message),
	)
	return null
}

async function main() {
	try {
		const USER_AGENT = getRandom()

		const browser = await chromium.launch({ headless: true })
		const context = await browser.newContext({ userAgent: USER_AGENT })
		const page = await context.newPage()
		await page.setDefaultTimeout(30000)
		await page.setViewportSize({ width: 800, height: 600 })
		await page.goto(`${BASE_URL}/login`)

		const success = await login(page)
		if (!success) {
			console.log("Login failed")
			await browser.close()
			return
		}

		await page.waitForTimeout(2000)

		const goalPerformance = await getPerformance(page)
		if (!goalPerformance) {
			console.error("Failed to get performance data")
			await browser.close()
			return
		}

		console.log(goalPerformance)

		const balance = goalPerformance.data.attributes.performance.find(
			(p) => p.identifier === "fintual",
		)
		if (!balance) {
			console.error("Balance not found")
		}

		// for each balance get the difference between a date and the previous date
		let diffTotal = 0
		const balanceData = balance?.data.map((d, i) => {
			if (i === 0) {
				return {
					date: d.date,
					value: d.value,
					difference: 0,
					realDifference: 0, // Add realDifference for the first entry
				}
			}
			const previousValue = balance.data[i - 1].value
			const difference = d.value - previousValue
			diffTotal += difference
			return {
				date: d.date,
				value: d.value,
				difference,
				realDifference: difference, // Temporary, will be adjusted later
			}
		})
		console.log("Difference total:", diffTotal)

		const deposits = goalPerformance.data.attributes.performance.find(
			(p) => p.identifier === "deposits",
		)
		if (!deposits) {
			console.error("Deposits not found")
		}

		// for each deposit get the difference between a date and the previous date
		const depositsData = deposits?.data.map((d, i) => {
			if (i === 0) {
				return {
					date: d.date,
					value: d.value,
					difference: 0,
				}
			}
			const previousValue = deposits.data[i - 1].value
			const difference = d.value - previousValue
			return {
				date: d.date,
				value: d.value,
				difference,
			}
		})

		// Map deposits by date for quick lookup
		const depositsByDate = new Map(
			depositsData?.map((d) => [d.date, d.difference]) || [],
		)
		if (!balanceData) {
			console.error("Balance data not found")
			return
		}

		let realDiff = 0
		// Calculate the real difference by subtracting deposit difference
		const balanceWithRealDifference = balanceData.map((b) => {
			const depositDifference = depositsByDate.get(b.date) || 0
			realDiff += b.difference - depositDifference
			return {
				...b,
				realDifference: b.difference - depositDifference,
			}
		})
		console.log("Real difference total:", realDiff)

		const perf = {
			balance: balanceWithRealDifference,
			deposits: depositsData,
		}

		// Save the balance data to a file
		if (!fs.existsSync("./tmp/fintual-data")) {
			fs.mkdirSync("./tmp/fintual-data", { recursive: true })
		}
		fs.writeFileSync(
			"./tmp/fintual-data/balance.json",
			JSON.stringify(perf, null, 2),
			"utf-8",
		)
		console.log("Balance data saved to tmp/fintual-data/balance.json")

		await browser.close()
	} catch (error) {
		console.error("Error:", error)
		process.exit(1)
	}
}

main()
