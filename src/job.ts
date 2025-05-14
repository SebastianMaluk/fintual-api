import { main as mainScraper } from "./scraper"
import { main as mainActual } from "./actual"
import "./env"

export async function runJob() {
	console.log("Running job...")
	await mainScraper()
	await mainActual()
	console.log("Job finished.")
}