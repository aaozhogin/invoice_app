const puppeteer = require('puppeteer')
const fs = require('fs')
const path = require('path')
const { loadEnv } = require('./scripts/env')

const { SUPABASE_URL } = loadEnv()
const PROJECT_REF = new URL(SUPABASE_URL).hostname.split('.')[0]
const SUPABASE_EMAIL = 'aaozhogin@gmail.com'

async function executeSQLViaUI() {
  let browser = null
  
  try {
    console.log('🚀 Starting browser automation...\n')
    console.log('📝 This will open Supabase in a browser and execute the SQL.')
    console.log('⚠️  You may need to log in to Supabase when prompted.\n')
    
    // Launch browser
    browser = await puppeteer.launch({
      headless: false, // Show browser so user can log in if needed
      defaultViewport: { width: 1280, height: 800 }
    })
    
    const page = await browser.newPage()
    
    // Navigate to SQL Editor
    console.log('🌐 Opening Supabase SQL Editor...')
    const sqlEditorUrl = `https://app.supabase.com/project/${PROJECT_REF}/sql/new`
    await page.goto(sqlEditorUrl, { waitUntil: 'networkidle2', timeout: 60000 })
    
    // Wait a bit for page to fully load
    await new Promise(resolve => setTimeout(resolve, 3000))
    
    // Check if user needs to log in
    const currentUrl = page.url()
    if (currentUrl.includes('login') || currentUrl.includes('sign-in')) {
      console.log('\n🔐 Please log in to Supabase in the browser window...')
      console.log('   Email: aaozhogin@gmail.com')
      console.log('   (Waiting for you to complete login...)\n')
      
      // Wait for navigation away from login page (max 2 minutes)
      await page.waitForFunction(
        () => !window.location.href.includes('login') && !window.location.href.includes('sign-in'),
        { timeout: 120000 }
      )
      
      console.log('✅ Logged in! Navigating to SQL Editor...')
      await page.goto(sqlEditorUrl, { waitUntil: 'networkidle2' })
      await new Promise(resolve => setTimeout(resolve, 2000))
    }
    
    console.log('📄 Loading SQL migration file...')
    const sqlPath = path.join(__dirname, 'migrations', 'SETUP_SQL_EDITOR.sql')
    const sqlContent = fs.readFileSync(sqlPath, 'utf8')
    
    console.log('✏️  Pasting SQL into editor...')
    
    // Try to find and click into the SQL editor
    // Supabase uses CodeMirror or Monaco editor
    try {
      // Wait for editor to load
      await page.waitForSelector('.monaco-editor, .CodeMirror, [data-testid="sql-editor"]', { timeout: 10000 })
      
      // Try Monaco editor (VS Code editor)
      const monacoEditor = await page.$('.monaco-editor')
      if (monacoEditor) {
        await page.click('.monaco-editor')
        await page.keyboard.down('Meta') // Cmd on Mac
        await page.keyboard.press('A')
        await page.keyboard.up('Meta')
        await page.keyboard.press('Backspace')
        await page.keyboard.type(sqlContent, { delay: 10 })
      } else {
        // Try CodeMirror
        await page.evaluate((sql) => {
          const cm = document.querySelector('.CodeMirror')
          if (cm && cm.CodeMirror) {
            cm.CodeMirror.setValue(sql)
          }
        }, sqlContent)
      }
      
      console.log('✅ SQL pasted into editor')
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      console.log('▶️  Executing SQL...')
      
      // Look for "Run" button
      const runButton = await page.$('button::-p-text(Run)')
      if (runButton) {
        await runButton.click()
        console.log('✅ Clicked Run button')
        
        // Wait for execution to complete
        await new Promise(resolve => setTimeout(resolve, 5000))
        
        // Check for success/error messages
        const pageContent = await page.content()
        if (pageContent.includes('Success') || pageContent.includes('completed')) {
          console.log('✅ SQL executed successfully!')
        } else if (pageContent.includes('Error') || pageContent.includes('error')) {
          console.log('⚠️  There may have been errors. Check the browser window.')
        }
      } else {
        console.log('⚠️  Could not find Run button. Please click it manually.')
        console.log('   Waiting 30 seconds for you to execute...')
        await new Promise(resolve => setTimeout(resolve, 30000))
      }
      
    } catch (err) {
      console.log(`⚠️  Could not automate editor interaction: ${err.message}`)
      console.log('\n📋 SQL has been loaded. Please:')
      console.log('   1. Click into the SQL editor')
      console.log('   2. Paste the SQL from migrations/SETUP_SQL_EDITOR.sql')
      console.log('   3. Click "Run" or press Ctrl+Enter')
      console.log('\n   Keeping browser open for 60 seconds...')
      await new Promise(resolve => setTimeout(resolve, 60000))
    }
    
    console.log('\n✅ Process complete. You can close the browser.')
    console.log('\n📋 Next steps:')
    console.log('   1. Verify tables were created in Supabase')
    console.log('   2. Run: node setup-via-client.js')
    
  } catch (error) {
    console.error('\n❌ Error:', error.message)
    console.error('\n💡 You can manually:')
    console.error('   1. Go to: https://app.supabase.com/project/nnhlaceytkfyvqppzgle/sql/new')
    console.error('   2. Paste: migrations/SETUP_SQL_EDITOR.sql')
    console.error('   3. Run the SQL')
  } finally {
    if (browser) {
      console.log('\nClosing browser in 5 seconds...')
      await new Promise(resolve => setTimeout(resolve, 5000))
      await browser.close()
    }
  }
}

executeSQLViaUI()
