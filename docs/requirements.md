# MVP coverage and scope

This document records MVP coverage and remaining validation work. Automated tests establish software behavior; participant studies and field validation require separate evidence.

| Requirement                        | Implementation                                                                                                                                                                | Boundary                                                                                                             |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Four profiles, one app             | Database accounts/sessions; role homes and server checks on pages/actions/record ownership                                                                                    | No public signup; coordination provisions or resets access                                                           |
| Data preparation                   | Manual editing, competencies/forms, CSV preview/errors/atomic import and exports                                                                                              | Student/tutor accounts are created before their CSV profiles                                                         |
| Student flow                       | Read-only center-managed name/qualification, personal location/distance, ranked offers, skill levels/development interests, waiting/published state, feedback                 | Name/qualification/priority also protected server-side                                                               |
| Company flow                       | Create, edit, deactivate and copy offers; optional qualification guidance; capacity, location, skills and dependencies                                                        | Copy opens a review form; original assignments/rankings/dependency are not duplicated                                |
| Tutor flow                         | Profile/capacity, assigned students and workload, contacts and feedback                                                                                                       | No access to other tutors' private assignments                                                                       |
| Simulation lifecycle               | Immutable numerical input snapshots, adjustable weights/seed/limits, linked reruns, results, unassigned/free places/tutor load, comparisons, exports, one current publication | In-process background calculation; interrupted runs need relaunch                                                    |
| Three-party assignment             | Students → offers → tutors with capacity validation                                                                                                                           | Demonstration heuristic; no joint optimality claim                                                                   |
| Logistics/social criteria          | Personal/global distance limits, priority flag, competency/development scoring, tutor workplace travel/load balance                                                           | No sensitive reason collected; qualification text is guidance, not eligibility filtering                             |
| Offer dependencies                 | Same-company authoring and CSV; cycle/availability validation; backend enforcement                                                                                            | MVP definition: at least one occupied prerequisite seat                                                              |
| Research algorithm                 | External HTTP endpoint/token and explicit placeholder switch; strict result validation and common metrics                                                                     | Actual validated model/service still needs to be supplied                                                            |
| Evaluation                         | Participant ratings, editable pilot questionnaire, optional current/prior decision minutes, admin views and CSV                                                               | Self-reported timing; synthetic seed responses labelled as examples                                                  |
| Impact indicators                  | Preference satisfaction, coverage, load deviation, priority/other assignment rates, cohort-aware travel comparison                                                            | Straight-line travel proxies; no measured emissions, routes or causal equity claim                                   |
| Deployment/transfer                | Separate frontend/backend images, PostgreSQL volume, migrations, seed, Docker checks, Railway guide                                                    | Cloud deployment requires the owner's Railway project and configuration                                              |
| Real-center validation and TRL 6–7 | Tooling ready for the documented process                                                                                                                                      | Research integration, agreed criteria, durable jobs and field evidence remain next steps |

## Implementation choices

A failing external model produces a failed run: a valid-looking fallback could be mistaken for a research result. The administrator can explicitly enable `USE_PLACEHOLDER_ALGORITHM=true` and relaunch. Successful results identify their algorithm and retain diagnostics.

The existing restrained Spanish interface, role-specific sidebar, direct assignment feedback and visible waiting/publication states are retained. Copying offers, optional qualifications and center-managed student fields support the core role workflows. Coordination prepares the current dataset and saved simulations preserve prior numerical inputs.

## Workflow and data rules

1. Coordination prepares companies, accounts, competencies/forms, locations and capacities.
2. Companies prepare/copy offers; students rank them and self-assess; tutors confirm availability.
3. Coordination launches, reviews and compares proposals, then publishes one. Edits affect future runs; input snapshots remain unchanged.
4. Each participant sees their published assignments and can rate them and complete a questionnaire. Coordination exports data for analysis.

CSV accepts at most 500 records / 500 KB. Student/tutor rows update accounts by email. Company/offer rows update by ID; blank IDs create records. Templates include `program` and `dependsOnId` for offers; use a newly downloaded template after upgrades. Validation repeats at commit and rolls back entirely on failure. Booleans use `true`/`false`, numbers use decimal points, and offer requirements are JSON keyed by competency ID. Exports neutralize spreadsheet formulas.

Offer deactivation retains history. Catalog entries can be removed only when unused; an in-use competency form cannot change membership. Assignment contacts/display names reflect current profiles; numerical comparisons use saved snapshots. Ratings are scoped to current publication/participant, one editable rating per person and assignment. Pilot responses are identified, not anonymous; exports include respondent IDs.

## Metric interpretation

Student distance is one-way Haversine distance per assignment. Tutor travel is one one-way visit per distinct tutor/offer pair, not a route or recurring forecast. Comparison suppresses travel-change claims when inputs or assigned cohorts differ. Missing priority groups display “—”. Computation duration includes application/backend overhead and is separate from self-reported human decision time.

Before field use, connect and validate the research service, agree criteria with centers, establish the current-method baseline, collect actual workflow/travel evidence and document outcomes. A durable queue and real-center trials remain next steps. Official institutional branding also requires the corresponding assets/authorization.
