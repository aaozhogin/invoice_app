#!/usr/bin/env node

/**
 * Jira CLI - Interact with your Jira instance
 * 
 * Usage:
 *   node scripts/jira-cli.js list                    # List all tickets
 *   node scripts/jira-cli.js list --status "To Do"   # Filter by status
 *   node scripts/jira-cli.js show IA-123             # Show ticket details
 *   node scripts/jira-cli.js create "Title" "Description" --type Story
 *   node scripts/jira-cli.js comment IA-123 "My comment"
 */

require('dotenv').config({ path: '.env.local' });

const JIRA_HOST = process.env.JIRA_HOST || 'https://ozhogin.atlassian.net';
const JIRA_EMAIL = process.env.JIRA_EMAIL;
const JIRA_API_TOKEN = process.env.JIRA_API_TOKEN;
const JIRA_PROJECT_KEY = process.env.JIRA_PROJECT_KEY || 'IA';

if (!JIRA_EMAIL || !JIRA_API_TOKEN) {
  console.error('❌ Error: JIRA_EMAIL and JIRA_API_TOKEN must be set in .env.local');
  process.exit(1);
}

const auth = Buffer.from(`${JIRA_EMAIL}:${JIRA_API_TOKEN}`).toString('base64');

async function jiraRequest(endpoint, options = {}) {
  const url = `${JIRA_HOST}/rest/api/3${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'Authorization': `Basic ${auth}`,
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Jira API error: ${response.status} ${response.statusText}\n${text}`);
  }

  return response.json();
}

async function listTickets(statusFilter = null) {
  const jql = statusFilter 
    ? `project = ${JIRA_PROJECT_KEY} AND status = "${statusFilter}" ORDER BY updated DESC`
    : `project = ${JIRA_PROJECT_KEY} ORDER BY updated DESC`;

  const data = await jiraRequest(`/search/jql?jql=${encodeURIComponent(jql)}&maxResults=50`);
  
  console.log(`\n📋 Tickets in project ${JIRA_PROJECT_KEY}:\n`);
  
  if (!data.values || data.values.length === 0) {
    console.log('  No tickets found\n');
    return [];
  }
  
  data.values.forEach(issue => {
    console.log(`  ${issue.key}: ${issue.fields.summary}`);
    console.log(`    Status: ${issue.fields.status.name}`);
    console.log(`    Type: ${issue.fields.issuetype.name}`);
    console.log(`    Updated: ${new Date(issue.fields.updated).toLocaleDateString()}`);
    console.log('');
  });
  
  console.log(`Total: ${data.total} tickets\n`);
  return data.values;
}

async function showTicket(ticketKey) {
  const issue = await jiraRequest(`/issue/${ticketKey}`);
  
  console.log(`\n🎫 ${issue.key}: ${issue.fields.summary}`);
  console.log(`Status: ${issue.fields.status.name}`);
  console.log(`Type: ${issue.fields.issuetype.name}`);
  console.log(`Priority: ${issue.fields.priority?.name || 'None'}`);
  console.log(`Assignee: ${issue.fields.assignee?.displayName || 'Unassigned'}`);
  console.log(`Created: ${new Date(issue.fields.created).toLocaleString()}`);
  console.log(`Updated: ${new Date(issue.fields.updated).toLocaleString()}`);
  
  if (issue.fields.description) {
    console.log(`\nDescription:`);
    console.log(issue.fields.description.content?.[0]?.content?.[0]?.text || issue.fields.description);
  }
  
  if (issue.fields.comment?.comments?.length > 0) {
    console.log(`\nComments (${issue.fields.comment.total}):`);
    issue.fields.comment.comments.slice(-3).forEach(comment => {
      console.log(`  - ${comment.author.displayName} (${new Date(comment.created).toLocaleString()}):`);
      console.log(`    ${comment.body.content?.[0]?.content?.[0]?.text || comment.body}`);
    });
  }
  
  console.log('');
  return issue;
}

async function createTicket(summary, description, issueType = 'Task') {
  const payload = {
    fields: {
      project: { key: JIRA_PROJECT_KEY },
      summary,
      description: {
        type: 'doc',
        version: 1,
        content: [
          {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: description,
              },
            ],
          },
        ],
      },
      issuetype: { name: issueType },
    },
  };

  const result = await jiraRequest('/issue', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  console.log(`\n✅ Created ticket: ${result.key}`);
  console.log(`   URL: ${JIRA_HOST}/browse/${result.key}\n`);
  return result;
}

async function addComment(ticketKey, commentText) {
  const payload = {
    body: {
      type: 'doc',
      version: 1,
      content: [
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: commentText,
            },
          ],
        },
      ],
    },
  };

  await jiraRequest(`/issue/${ticketKey}/comment`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  console.log(`\n✅ Added comment to ${ticketKey}\n`);
}

// CLI handling
const command = process.argv[2];

(async () => {
  try {
    switch (command) {
      case 'list': {
        const statusArg = process.argv.indexOf('--status');
        const status = statusArg > -1 ? process.argv[statusArg + 1] : null;
        await listTickets(status);
        break;
      }
      
      case 'show': {
        const ticketKey = process.argv[3];
        if (!ticketKey) {
          console.error('Usage: node scripts/jira-cli.js show <TICKET-KEY>');
          process.exit(1);
        }
        await showTicket(ticketKey);
        break;
      }
      
      case 'create': {
        const summary = process.argv[3];
        const description = process.argv[4] || '';
        const typeArg = process.argv.indexOf('--type');
        const issueType = typeArg > -1 ? process.argv[typeArg + 1] : 'Task';
        
        if (!summary) {
          console.error('Usage: node scripts/jira-cli.js create "Summary" "Description" --type Story');
          process.exit(1);
        }
        await createTicket(summary, description, issueType);
        break;
      }
      
      case 'comment': {
        const ticketKey = process.argv[3];
        const comment = process.argv[4];
        if (!ticketKey || !comment) {
          console.error('Usage: node scripts/jira-cli.js comment <TICKET-KEY> "Comment text"');
          process.exit(1);
        }
        await addComment(ticketKey, comment);
        break;
      }
      
      default:
        console.log(`
🔧 Jira CLI for Invoice App

Usage:
  node scripts/jira-cli.js list                           # List all tickets
  node scripts/jira-cli.js list --status "To Do"          # Filter by status
  node scripts/jira-cli.js show IA-123                    # Show ticket details
  node scripts/jira-cli.js create "Title" "Description"   # Create ticket
  node scripts/jira-cli.js create "Title" "Desc" --type Story
  node scripts/jira-cli.js comment IA-123 "My comment"    # Add comment

Environment variables (set in .env.local):
  JIRA_HOST          - Your Jira instance URL
  JIRA_EMAIL         - Your Jira email
  JIRA_API_TOKEN     - Your Jira API token
  JIRA_PROJECT_KEY   - Project key (default: IA)
`);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
})();
