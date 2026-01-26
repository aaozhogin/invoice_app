const path = require('path')
const fs = require('fs')
const dotenv = require('dotenv')

let hasLoaded = false

const loadEnv = () => {
  if (!hasLoaded) {
    const envPath = path.resolve(process.cwd(), '.env.local')

    if (fs.existsSync(envPath)) {
      dotenv.config({ path: envPath })
    }

    hasLoaded = true
  }

  const getRequired = (key) => {
    const value = process.env[key]
    if (!value) {
      throw new Error(`Missing required environment variable: ${key}`)
    }
    return value
  }

  return {
    SUPABASE_URL: getRequired('NEXT_PUBLIC_SUPABASE_URL'),
    SUPABASE_ANON_KEY: getRequired('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
    SUPABASE_SERVICE_ROLE_KEY: getRequired('SUPABASE_SERVICE_ROLE_KEY'),
    DATABASE_URL: process.env.DATABASE_URL,
    JIRA_HOST: process.env.JIRA_HOST,
    JIRA_EMAIL: process.env.JIRA_EMAIL,
    JIRA_API_TOKEN: process.env.JIRA_API_TOKEN,
    JIRA_PROJECT_KEY: process.env.JIRA_PROJECT_KEY,
  }
}

module.exports = { loadEnv }