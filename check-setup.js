#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Check the database setup files for the actual code format
const setupFile = fs.readFileSync(path.join(__dirname, 'SETUP_INVOICES_TABLE.md'), 'utf8');
console.log('=== Line Item Code Setup Info ===');
console.log(setupFile.substring(0, 2000));
