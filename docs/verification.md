# Verification · 29 October 2026

The Git history was reconstructed on 30 October 2026 into six delivery milestones. Author and committer dates approximately span the December 2025–May 2026 project timeline. These milestone dates do not establish when implementation or user studies occurred. The verification dates below and existing migration identifiers retain their actual dates.

Tested locally in production Docker images; no Railway deployment or real research endpoint was available for this verification.

- Fresh PostgreSQL volume: all four committed migrations and automatic seed succeed; 42 credential accounts, 30 students, 5 companies, 12 offers, 6 tutors, two completed simulations, one publication and labelled sample responses.
- Existing volume upgrade: original passwords, profiles, preferences and publication preserved. An aggregate fingerprint of users, credential hashes and application tables was identical before/after a repeated seed and restarting all three persistent services.
- 15 frontend unit tests; 28 Python tests; ESLint, TypeScript and production build pass. Docker `checks` profile also passes.
- HTTP integration against real Next.js Server Actions/PostgreSQL: four role homes and secondary seeded accounts; invalid login/public-signup rejection; account creation, password change, admin reset, session revocation and sign-out; role/record restrictions; protected student identity/qualification/priority; pilot timings; offer copying and optional qualification; dependency constraints; simulation/rerun, comparison, eight CSV exports and a single publication.
- External mode: frontend → backend → separate HTTP example → validated persisted results. Stopping the example produces a FAILED simulation with no fallback assignments. Unit tests also cover bad settings, unauthorized requests, upstream errors/redirects/timeouts, malformed/oversized responses and invalid allocations.
- Browser check: company offer copy opens with existing details, saves a distinct inactive offer, accepts an empty qualification and retains the original; student identity/qualification fields render read-only with an explanation. Existing Spanish layout and role navigation retained.

Synthetic checks establish software behavior, not the research model's validity, participant-study claims or TRL 6–7. External model integration, real-center trials and a durable background queue remain the documented next stage.

Reproduce automated checks with `docker compose run --rm backend pytest` and `docker compose --profile checks run --build --rm checks`. The deployment guide describes fresh-stack setup and release acceptance. Temporary integration records and the isolated acceptance stack were removed; the primary demo remains on port 3000.

## UI and repository cleanup · 30 October 2026

- Removed unused UI primitives, component branches and exports, an unread sidebar cookie, an empty scripts directory and Finder metadata. Deployment examples remain in use.
- TypeScript now checks unused locals and parameters. A symbol/reference audit found no unused exports in application components, hooks or libraries. No dependencies were added.
- Simulations: grouped criteria with accessible help, collapsible advanced settings, keyboard-operable tutor balance, visible action row and explicit request errors. Corrected outdated descriptions of demonstration/external modes.
- Shared tables: clear search/recovery, live result counts, sort direction, wrapped text and metric explanations. Participant tables omit the viewer's redundant company/tutor column. Forms distinguish saving, saved, unsaved and error states. Navigation has an active-page marker and a visible mobile close control.
- Browser checks against production Docker: all four role homes; help by click/keyboard with Escape and restored focus; simulation advanced controls, tutor balance and all-zero validation; table search/clear/sort; student offer search; company dependency help; profile coordinates and successful save feedback; mobile navigation dismissal. Layout checked at 1280, 390 and 320 pixels, including a corrected overlap at 320 pixels.
- Production Docker build, ESLint, TypeScript, 15 web unit tests and 28 backend tests pass. Backend tests report one upstream Starlette/AnyIO deprecation warning.

Mobbin MCP references were inspected for structure and adapted to the existing SIPA tokens: [Pipedrive disclosure groups](https://mobbin.com/screens/ececb1c7-c036-4aec-b140-2bfa69769e7f), [Docusign action footer](https://mobbin.com/screens/f48ffe3f-dcf9-4167-bdbb-d3c11ab84bdd), [Plain settings groups](https://mobbin.com/screens/4d19fd1b-6159-4cbb-a36d-fa4c3a5fdd77), and [WRITER](https://mobbin.com/screens/72ecb8f8-08a0-4438-9b6a-491413efb06b)/[Delphi](https://mobbin.com/screens/88ae715d-9c12-440f-9bc5-393d6516cc90) search recovery. SIPA-specific wording and accessibility behavior were determined from the application code and tested locally.
