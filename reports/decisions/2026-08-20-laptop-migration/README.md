# The laptop move: what has to be settled before the weekend

Decision artifact for the new-laptop rebuild. Eleven questions @jwildfire has to answer before the machine changes hands this weekend, led by whether the old machine is copied across or rebuilt clean.

## Provenance

- Source: the new-laptop rebuild guide drafted 2026-08-20 by 👯🤖 W0081 against [obot.roadmap#279](https://github.com/jwildfire/obot.roadmap/issues/279). That guide is a local-only document — it names where credentials live, never what they are — and is not published, committed or quoted here beyond what each choice requires.
- The guide ends with fourteen open questions, each carrying a recommendation. Eleven made this page; two were routed to the workspace-local configuration list; one was deferred by the guide itself.
- Drafted by 👯🤖 W0091 using Claude Opus 5 on 2026-08-20. Not reviewed by @jwildfire.

## What was excluded, and why

| Question | Disposition |
|---|---|
| A settings block describing a separate personal project, currently judging this program's commands | Local configuration list. Publishing the question would describe private family information. |
| How broad the new machine's GitHub permissions should be | Local configuration list. It describes what a live credential is currently allowed to do. |
| Whether the program's memory store belongs in a private repository | Deferred. The guide calls it the least urgent of the set and says it does not need resolving before the move. |

Nothing on the published page names a credential location, a file path, a machine layout detail, or the old machine's current security posture. Two facts that the task required carrying — that no backup of the machine exists anywhere, and that the bot's signing key cannot be re-issued — are stated at the level needed to make the first choice, and no further.

## Assumptions

- The move happens this coming weekend, so "before the migration" means before Saturday 2026-08-22.
- The old machine remains available during and after the changeover. Several recommendations depend on that and one of them says so explicitly.
- The eleven selected questions are those that change what the rebuild steps say, must happen while the old machine is intact, or are set during the new machine's first-run setup. The guide's own split was six "change the steps" and eight "tune them"; this page keeps all six and promotes five of the eight, on the grounds that three of those are set at first boot, one needs hardware bought in advance, and one is a build-time preference that would otherwise default silently.

## Premises

Five are declared in the page head. Four are read-only GitHub reads and all four held when this was published. The fifth — that no backup destination is configured on the old machine — states its command (`tmutil destinationinfo`), but `tmutil` is deliberately absent from the read-only allowlist, so the currency gate reports it as unchecked rather than running it. That is the correct state and not a defect: unchecked and expired are different things and the gate renders them differently. The gate therefore exits non-zero on this artifact by design, with one unchecked premise and zero expired ones.

## Sources checked on 2026-08-20

- `tmutil destinationinfo` → `No destinations configured.`
- `gh issue view 279 -R jwildfire/obot.roadmap` → OPEN
- `gh issue view 260 -R jwildfire/obot.roadmap` → OPEN
- `gh issue view 261 -R jwildfire/obot.roadmap` → OPEN
- `gh pr view 198 -R jwildfire/obot.agent` → OPEN

---

Drafted by 👯🤖 W0091 (worker W0091) using Claude Opus 5.
