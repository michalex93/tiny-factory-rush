# Review packets

`npm run review:packet` (also run automatically at the end of every loop run) writes `REVIEW-YYYYMMDD-HHMM.md` here: tasks done and blocked, what needs you, overdue and due-soon items, open decisions, latest gates, commits and diffstat — followed by a ready-to-paste prompt for an external reviewer (ChatGPT or Claude).

Daily rhythm: read the newest packet, paste its last section into the external reviewer, turn the useful findings into tasks (status `proposed` → `todo`).

`review/.last` stores the commit of the previous packet so the next one only covers new work.
