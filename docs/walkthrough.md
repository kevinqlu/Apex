# Five-minute walkthrough

A script for showing the portal on a phone. Every step below was run end to end in a browser at 375px wide. Times are a guide.

## Before you start

1. Run `npm run seed` right before the demo. It resets the data and makes the dates relative to now, so the truck is about 40% along its route and the fleet policy is due today.
2. Run `npm run dev`, then open the app.
3. To show it on a real phone, put the phone on the same network, set `APP_ORIGIN` in `.env` to the address you open on the phone (for example `http://192.168.1.20:5173`), and restart.
4. Have a small PDF or a photo on the phone for the upload step.

Say at the start: the company and the drivers are fictional, and everything you see comes from the server, one driver at a time.

## 0:00 Sign in as Marcus

- Type a wrong password first. The error is plain and does not say which part was wrong.
- Tap **Fill in Marcus Reyes (D-1042)**, then **Sign in**.
- Refresh the page. You stay signed in.

## 0:45 Home

- **Two red urgent banners** sit at the top until read. One of them, the lane closure, was sent only to Marcus.
- Tap **Mark as read** on one. The banner goes and the badge on the Alerts tab drops from 3 to 2.
- **Duty status.** Tap **Driving**. Remember this for the signing step later.
- **Active load.** The route strip shows Dallas to Atlanta with the truck about 40% of the way. Tap **Show details** to see pickup, delivery, cargo, weight, equipment and reference.
- Scroll to the **onboarding card**: 5 of 7 steps done, and the next step is due today.

## 1:45 Alerts and loads

- **Alerts.** Try the Urgent and Unread filters. Tap a title that says New. It opens and is marked read.
- **Loads.** Three current loads. The delayed one explains why in a note on the card. The Delivered tab holds the finished one.

## 2:45 Onboarding

- Three phases from a template file. Company steps say **Waiting on Terminal manager** and tell the driver there is nothing to do. They are never shown as the driver's task.
- With duty status on Driving, the signing form shows **Park safely before filling this out**. It is a notice and never blocks.
- Type a wrong name and tap **Sign with my name**. The error is plain and the typed text stays. Type **Marcus Reyes** and sign. The count goes to 6 of 7.
- Point out that the whole checklist comes from `server/config/onboarding.template.json`. Adding a task there changes this screen with no code change.

## 3:45 Documents

- The license is approved and the medical card is under review.
- **Proof of delivery** for load L-48190 is missing, because that load was delivered two days ago. Tap **Upload file** and choose the PDF or photo. It shows Under review. Tap **Replace file** and **Download file** to show both.
- To show the checks, try an `.exe` or a very large file. Both are refused with a plain message.

## 4:30 Help

- The **roadside call button** is first and the biggest thing on the screen. It is a real phone link, and the number is shown as text too.
- Send a short message. It shows a ticket number and appears at the top of the list.

## 4:50 Sign in as Dana, the proof

- Tap **Sign out**, then sign in as **Dana Whitfield (D-2217)**.
- Different loads, different dispatcher, no tickets, and no lane closure alert. Her onboarding and documents screens show real work still to do.
- Marcus reading his alerts earlier changed nothing for her. Each driver's data and read state are separate, and the server enforces it.

## If something goes wrong

- Stuck on a screen or the data looks odd: run `npm run seed`, then refresh.
- Cannot sign in from a phone: check that `APP_ORIGIN` matches the address in the phone's address bar exactly, then restart the server.
- Want a clean start for the next run: `npm run seed` again.
