import { CronJob } from "cron"
import { runJob } from "./job"
import "./env"

const CRON_SCHEDULE = process.env.CHRON_SCHEDULE ?? "0 0 0 * * *"


const job = CronJob.from({
	cronTime: CRON_SCHEDULE,
	onTick: (() => {
		let running = false
		return async () => {
			if (running) {
				console.log("Job is already running, skipping this tick.")
				return
			}
			running = true
			try {
				await runJob()
			} finally {
				running = false
			}
		}
	})(),
	onComplete: null,
	start: false,
	timeZone: "America/Santiago",
})

console.log("Waiting for job to start...")
job.start()
