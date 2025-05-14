import { runJob } from "./job"
import "./env"

async function main() {
	console.log("Running task once...")
	await runJob()
	console.log("Task completed.")
}

main().catch((error) => {
	console.error("Error running task:", error)
	process.exit(1)
})
