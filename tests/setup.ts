import { beforeAll, afterAll } from 'vitest'
import dotenv from 'dotenv'
import { cleanupSeedData, loadSeedData } from './fixtures/seed-loader'

dotenv.config({ path: '.env.test' })

const shouldRunIntegration = process.env.RUN_INTEGRATION_TESTS === 'true'

beforeAll(async () => {
  if (!shouldRunIntegration) return

  const requiredEnvVars = ['SUPABASE_URL', 'SUPABASE_SERVICE_KEY']
  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      throw new Error(`Missing required environment variable: ${envVar}`)
    }
  }

  await loadSeedData()
})

afterAll(async () => {
  if (!shouldRunIntegration) return
  await cleanupSeedData()
})
