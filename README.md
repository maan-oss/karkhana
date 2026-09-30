# Karkhana · कारखाना

Open shop-floor know-how for small Indian factories, in Hindi and English. Live at **https://karkhana.vercel.app**

- 55 guides: surface finish, chatter, alarms, tooling, quality, maintenance, safety, pricing, getting paid — causes most-likely-first, with the number to change
- Calculators: cutting speed → RPM, surface finish, job cost / quote, tap drills, fits, ISO 2768 tolerances
- Government schemes matched to Udyam size (Udyam, ZED, CGTMSE, Samadhaan, TReDS, PMEGP)
- Machine logbook, pins, share to WhatsApp, voice input, works offline, installable
- An advisor that answers free-text questions using free models on OpenRouter, grounded on the guides

No account, no tracking. Everything the user enters stays in their browser; Settings has export/import/delete.

## Run it
It is a static site: `index.html` is the whole app. Open it, or drop the folder on any static host.

## The advisor
`api/ask.js` is a Vercel Edge function that relays a question to a free OpenRouter model (Space Bunny Alpha, Gemma 4, Qwen 3.8, Nemotron 3, or the free router) and streams the answer. Only free models are allowed, so the key owner can never be billed. To enable it: add `OPENROUTER_API_KEY` in the Vercel project settings and redeploy. Free-tier keys allow 50 requests/day (1,000/day once the account has ever bought $10 of credits). Users can also paste their own free key in Settings; it stays on their phone and goes only to OpenRouter.

## Contribute
- Wrong number? Every guide has "Report a wrong number" → opens a prefilled issue here.
- New guide? "Add what you know" → "Propose for everyone" opens a prefilled issue.
- Corrections applied so far: see CORRECTIONS.md in the project history.

## License
MIT for the code. The guides are CC BY 4.0 — copy them, translate them, print them on the wall.
