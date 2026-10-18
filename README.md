This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Automatic task reminders

The Node.js server starts a reminder scheduler that checks MongoDB every minute and sends
Telegram reminders at each task's selected time. To keep reminders running, deploy the app on
an always-on Node.js host, configure `MONGODB_URI`, `TOKEN`, `CHAT_ID`, and optional `THREAD_ID`
and `TASK_REMINDER_TIMEZONE`, then run `npm run build` followed by `npm start`. Keep that process
running with your host's process manager.

The scheduler checks every minute, but each task can send at most one alert per calendar day.
MongoDB enforces this with a unique task-and-date delivery record, so repeated or overlapping
checks do not send the same task's alert again. Apply the Prisma schema with `npx prisma db push`
before running the scheduler so MongoDB has the unique index.

Vercel runs serverless functions and does not keep the Node.js process alive between requests,
so its deployment cannot run this in-process scheduler. The scheduler logs a warning and skips
startup on Vercel. Use an always-on Node.js host if reminders must follow the exact selected
task times.
