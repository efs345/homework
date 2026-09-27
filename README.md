# Friends Included Finance System

Day 4 homework project.

## What is included

- Next.js website hosted on Vercel
- Supabase as the source of truth
- Demonstration role selector
- Sales and expense forms
- Manager approvals/corrections
- Commission calculations
- Financial dashboard
- Telegram webhook submissions and decision notifications
- Google Sheets automatic synchronization
- Sync retry and notification retry endpoints
- Telegram manager linking screen

## Required Vercel environment variables

Copy the names from `.env.example` into Vercel:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `TELEGRAM_BOT_TOKEN`
- `NEXT_PUBLIC_TELEGRAM_BOT_URL`
- `GOOGLE_SHEETS_ID`
- `GOOGLE_SERVICE_ACCOUNT_EMAIL`
- `GOOGLE_PRIVATE_KEY`
- `NEXT_PUBLIC_STUDENT_NAME`

Never commit real secrets.

## Telegram command formats

A linked salesperson can send:

`/sale S01 | Olivia Rose | A | One proud uncle and an emotional grandmother | 1000 | 50 | 30 | 20`

Kevin can send:

`/expense E01 | Rented suit and fake pearl necklace for the relatives | Materials | 120 | A`

Use `/whoami` to see your Telegram user ID and chat ID.

## Google Sheets

Create one spreadsheet. The app automatically ensures two tabs:

- Sales
- Expenses

Share the spreadsheet with the Google service account email as Editor.

## Telegram webhook

After deployment, choose Svetlana in the demonstration role selector.
In Manager setup, enter the deployed base URL and click **Set Telegram webhook**.

Example base URL:

`https://friends-included-finance.vercel.app`

## Test 1 and Test 2

Enter the exact references and figures from the homework.
Do not hard-code results.
