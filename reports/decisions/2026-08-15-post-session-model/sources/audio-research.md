# Audio Daily Briefing — Feasibility Research
Researched 2026-08-15 (web-verified where noted). Target: 1–3 min (~200–450 words, ~2,500 chars) nightly briefing for one listener (Jeremy), generated on a Mac (Darwin 23.6 / Sonoma), hosted via jwildfire.github.io/obot.roadmap.

---

## 1. Spotify — verdict: NO, still can't add your own RSS feed

Jeremy's half-memory ("spotify has a way to do personal feeds now") is **almost certainly a garbled version of Spotify's *paid-podcast* private feeds — which run the other direction** and don't help here.

What IS true:
- **Subscribers to a paid podcast on Spotify get a private RSS feed** they can take *out* of Spotify into other apps ([Spotify support: "Paid podcasts: Using your private RSS feed"](https://support.spotify.com/us/creators/article/paid-podcasts-using-your-private-rss-feed/)). That page even says: for apps Spotify doesn't distribute to, "we recommend listening to your subscription through Spotify" — i.e., Spotify itself consumes no external feeds.
- Creators can distribute a *public* show to Spotify by submitting its RSS feed through Spotify for Creators (formerly Anchor) — that's public-catalog submission, reviewed, not a private feed ([RSS.com guide](https://rss.com/blog/how-to-upload-a-podcast-to-spotify/)).

What is NOT possible (verified Aug 2026):
- **A listener cannot paste an arbitrary/private RSS URL into the Spotify app.** No setting exists; it's a perennially open Community "Live Idea" ([Spotify Community request](https://community.spotify.com/t5/Live-Ideas/All-Platforms-Podcasts-Add-Podcasts-from-RSS-URL-for-Patreon-and/idi-p/4866848); [Community thread](https://community.spotify.com/t5/Your-Library/how-do-I-add-rss-feed-podcast-to-my-spotify/td-p/5807244); [Transistor's add-podcast guide](https://transistor.fm/add-podcast/): "Spotify doesn't allow you to add an RSS feed URL to their podcast player manually").
- No 2025/2026 announcement changes this. Third-party guides written in 2026 ([Podtastic](https://podtastic.app/blog/posts/how-to-listen-to-private-podcast-feeds), [Hello Audio](https://helloaudio.fm/add-rss-feed-to-spotify/)) all say the same: use Apple Podcasts/Overcast/Pocket Casts for private feeds.

Getting the briefing into Spotify would mean submitting it to Spotify's **public catalog** — reviewable, indexed, world-visible. Not appropriate for a personal briefing.

## 2. Apple Podcasts — YES, plain unlisted RSS works

- iOS Podcasts app: **Library → "…" menu → "Follow a Show by URL" → paste feed URL** ([Transistor guide](https://transistor.fm/add-podcast/), [Hello Audio](https://help.helloaudio.fm/en/articles/12261382-how-do-i-use-apple-podcasts-to-listen-to-private-podcasts), [Patreon help](https://support.patreon.com/hc/en-us/articles/115000877506-Add-my-private-RSS-feed-to-the-Apple-Podcast-app)). Same feature exists on macOS Podcasts (File → Add a Show by URL).
- Auth: works with plain HTTPS URLs (no auth), and also supports HTTP Basic auth (username/password prompt) if the feed is password-protected ([Blubrry](https://blubrry.com/support/powerpress-documentation/premium-podcasting-content/how-to-subscribe-to-private-podcasts/)). GitHub Pages can't do Basic auth anyway, so the plain-URL path is the one that matters — and it works. One-time setup on Jeremy's phone, then episodes appear like any podcast (auto-download, CarPlay, watch, speed controls).
- Overcast and Pocket Casts also accept pasted private feed URLs (Overcast: "Add URL"), if Jeremy prefers.

## 3. Private-ish RSS on GitHub Pages — workable

- Feed = one static `feed.xml` (RSS 2.0 + `<enclosure>` mp3 URLs) + mp3s in a directory of the hub repo. Unlisted-by-obscurity: the repo is already public, so "private" means *not indexed/advertised*, not secret. For a project-status briefing on an already-public program, that's fine; nothing new leaks that isn't in hub issues already. (Don't put anything in it you wouldn't put in a public issue.)
- Podcast directories only list what's submitted; Apple's "Follow by URL" subscription is device-local and does NOT submit the feed to the Apple directory.
- GitHub Pages limits ([docs](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits)): published site ≤ **1 GB**; **soft 100 GB/month bandwidth**; soft 10 builds/hour (waived with Actions deploy, which the hub already uses). Repo file hard limit 100 MB (recommend <50 MB) — irrelevant at mp3 scale.
- Cost math: 64 kbps mono mp3 ≈ 0.48 MB/min → a 2–3 min briefing ≈ **1–1.5 MB**. 365/year ≈ **~400–550 MB/yr** — a year fits under the 1 GB site cap, two years doesn't. Trivial fix: the RSS generator keeps only the last N (e.g., 60–90) episodes' mp3s and prunes older ones (a daily briefing has zero archival value). Bandwidth for one listener: ~45 MB/month, noise.
- Practical note: mp3s in the hub repo do bloat git history over time; pruning files doesn't shrink history. Acceptable at ~0.5 GB/yr, or use a dedicated tiny repo (e.g., `obot.briefing`) with its own Pages site to keep the hub clean — same effort.

## 4. TTS options ranked (per briefing ≈ 2,500 chars ≈ 2–2.5 min audio)

| Option | Quality (honest) | Cost / briefing | Cost / month | Effort |
|---|---|---|---|---|
| **OpenAI `gpt-4o-mini-tts`** | Very good, natural, steerable tone via prompt ("energetic morning-brief newsreader") | ~$0.03 (≈$0.015/min audio; $0.60/1M input + $12/1M audio tokens) | **~$1** | Low — one API call, key likely already on the machine |
| macOS `say` -v "Ava (Premium)" | Fair. Ava Premium / Evan Enhanced (both already installed, verified locally) are the old neural Vocalizer voices: clearly better than default Samantha, but flat prosody, occasional odd emphasis. "Listenable utility", not "pleasant podcast". Output is AIFF → needs `ffmpeg`/`afconvert` to mp3/m4a | $0 | $0 | Zero deps, fully offline |
| ElevenLabs | Best-in-class expressiveness (v3 GA in 2026) | free tier: 10k credits/mo ≈ 10 min high-quality TTS → covers only ~4–5 briefings/mo; Starter $5/mo ≈ 30 min → NOT enough for daily 2–3 min (needs ~75 min/mo); Creator $22/mo ≈ 100 min works | $22/mo for daily | Overkill: 20× OpenAI's cost for marginal gain on a status briefing |
| Amazon Polly (neural $16/1M chars; generative $30/1M) | Good, slightly behind OpenAI/ElevenLabs naturalness | ~$0.04 (neural) | ~$1.20 + AWS account friction | Free tier (1M neural chars/mo) is first-12-months only |
| Google Cloud TTS (Neural2 $16/1M; Chirp 3 HD $30/1M) | Chirp 3 HD is genuinely good | ~$0.04–0.075 | ~$1–2 + GCP setup | Free monthly tier (1M chars WaveNet-class) would actually cover it at $0, but GCP project/auth setup is the tax |
| **New in 2026 (verified)**: Gemini 3.1 Flash TTS (70+ languages, LLM-native, batch not streaming); ElevenLabs v3 GA; open-weight local models — **Kokoro-82M** (Apache 2.0, runs on CPU/Apple Silicon, near-API quality for narration), Chatterbox (MIT), Fish Audio S2 (research license) | Kokoro on the Mac = free, local, better than `say`, ~API-adjacent quality for plain narration | $0 | $0 | Medium: `pip install kokoro` + espeak-ng via brew; a few hrs to wire + voice pick |

**Pick: OpenAI `gpt-4o-mini-tts`** — ~$1/mo, one HTTPS call, no new infra, quality comfortably good enough. `say` is the $0 fallback and fine for a pilot; Kokoro is the $0 upgrade path if API cost/dependency ever matters (it won't at $1/mo).

Sources: [OpenAI TTS pricing roundups](https://texttolab.com/blog/openai-tts-pricing), [tokenmix](https://tokenmix.ai/blog/gpt-4o-mini-tts-cheapest-tts-api-2026), [ElevenLabs pricing](https://bigvu.tv/blog/elevenlabs-pricing-2026-plans-credits-commercial-rights-api-costs/), [Polly pricing](https://aws.amazon.com/polly/pricing/) via [TextToLab](https://texttolab.com/blog/amazon-polly-pricing), [Google TTS pricing](https://cloud.google.com/text-to-speech/pricing) via [TextToLab](https://texttolab.com/blog/google-cloud-tts-pricing), [MarkTechPost 2026 TTS benchmark](https://www.marktechpost.com/2026/05/30/best-text-to-speech-tts-models-in-2026-a-benchmark-based-comparison/), [Pinggy open-source TTS 2026](https://pinggy.io/blog/best_open_source_self_hosted_text_to_speech_models/).

## 5. Alternatives to a podcast feed (lower/zero infra)

- **Overcast Premium file upload ($15/yr)** — nightly job uploads the mp3 to overcast.fm (web upload; scriptable but no official API — fragile). 2 GB/account. Gets podcast-app UX without hosting a feed, but the upload automation is the weak link. Cheaper in effort to just host the feed.
- **iOS Shortcut "read my briefing"** — Shortcut fetches the briefing *text* (already on the Pages site or raw.githubusercontent) and uses `Speak Text` / `Make Audio From Text` (Siri voice, on-device, free). Zero server-side work beyond the text file that presumably exists anyway. Can be triggered by "Hey Siri, obot briefing" or a Time-of-Day automation, works on HomePod/AirPods. **This is the true near-zero-infra option** — no TTS pipeline, no mp3, no feed. Downsides: Siri voice, no scrubbing/speed UI, no "it's just there in my podcast queue" passivity. ([RoutineHub example](https://routinehub.co/shortcut/9953/), [Speech Central + Shortcuts](https://speechcentral.net/2025/08/05/automate-web-article-text-to-speech-using-ios-shortcuts/))
- **Push the mp3 directly**: nightly job drops briefing.m4a somewhere Jeremy's phone sees it — iCloud Drive folder, AirDrop (manual), Telegram/Messages bot. Telegram bot voice-note is genuinely low-effort if a bot lane ever exists; today no such lane is set up, and "a file in a chat" lacks the play-while-locked/CarPlay ergonomics of a podcast app.
- **Skip audio generation entirely, phone does everything**: the Shortcut option above is this. Strictly dominates the "send a file" options for effort.

---

## (a) Build estimate — simplest credible pipeline

TTS call (OpenAI, curl) → mp3 into `reports/briefing/` in the hub repo → `feed.xml` regenerated by a ~60-line node/bash script (RSS 2.0 is trivial; keep last 60 episodes, prune old mp3s) → existing Pages deploy picks it up → one-time "Follow a Show by URL" on Jeremy's phone.

- Script (TTS + mp3 + RSS gen + prune): **2 hrs**
- Wire into the existing nightly briefing job + first deploy + validate feed (podba.se/validate, follow on phone, confirm auto-download): **1.5–2 hrs**
- Buffer for the usual (feed MIME type, GUID/pubDate quirks, artwork png): **1 hr**
- **Total: ~4–5 hours.** The `say`-voiced pilot version (no API key handling) is ~3 hours.
- The iOS-Shortcut alternative is **~30–60 minutes** total and $0 — but it's built on Jeremy's phone, not in the agent pipeline.

## (b) Ongoing cost

- **~$1/month** (OpenAI TTS at ~$0.03/day) + $0 hosting. `say` or Kokoro variant: **$0/month**. Maintenance: near-zero once the feed validates; the only recurring risk is the nightly job silently failing (same monitoring story as the text briefing).

## (c) Honest verdict: **later — gated on the text briefing proving itself. Do not build now.**

- The core risk isn't technical — every technical question above resolves cleanly (Apple Podcasts yes, Spotify no, hosting trivial, TTS ~$1/mo). The risk is **audience**: Jeremy ignored daily text summaries in a previous era, and the nightly text briefing this would voice is itself unproven. Audio is a *renderer* for a habit that doesn't exist yet; a nicer voice doesn't create the habit, and a podcast queue filling with unplayed episodes is just the ignored-email problem with extra infrastructure.
- Cheap falsification first: run the **text** briefing for 2–3 weeks. If Jeremy actually reads it and says "I'd rather hear this over coffee," build the 4–5-hour pipeline then — it's small enough to be a single evening increment, and nothing about waiting makes it harder.
- If an audio experiment is wanted *now* anyway, do the **$0, ~1-hour version**: iOS Shortcut that speaks the existing briefing text on request ("Hey Siri, obot briefing"). It tests the actual hypothesis — "will he listen while making coffee" — with zero pipeline, and its usage answers whether the podcast build is ever worth doing.
- Spotify specifically: off the table for a private feed, period. If Jeremy's listening life is Spotify-only, that's a further argument for the Shortcut/HomePod lane over a podcast feed he'd need a second app for.
