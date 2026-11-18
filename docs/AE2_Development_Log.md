# GreenShare — AE2 Development Log

## Project Information

- Project: GreenShare Community Tool Library
- Module: Contemporary Web Applications
- Module code: QH0640
- Framework: Next.js App Router, React, TypeScript
- Styling: Tailwind CSS 4
- Authentication: Firebase Authentication
- Database: Cloud Firestore
- Administrative tooling: Firebase Admin SDK
- Version control: Git and GitHub
- Development environment: Visual Studio Code, Windows, PowerShell
- Project type: Individual academic demonstration application
- Development period: November 2026 – February 2027
- AE2 submission deadline: 5 February 2027, 16:00

---

## Development Approach

GreenShare follows an iterative development approach.

Each development stage involves:

1. Identifying the relevant requirements.
2. Analysing the expected user interactions.
3. Selecting appropriate application components.
4. Implementing the functionality.
5. Performing TypeScript and ESLint checks.
6. Testing the feature in the browser.
7. Investigating and resolving identified defects.
8. Recording design decisions and verification results.
9. Creating logical Git commits at tested development milestones.

The implementation is developed alongside the AE1 analysis and design
report to maintain consistency between the proposed architecture
and the working application.

Completed demonstration functionality is distinguished from
production-ready functionality.

Technical limitations are documented rather than concealed.

---

# Development History

## DEV-001 — Initial Project Setup

**Date:** 15 November 2026

**Status:** Completed

The Next.js application was initialised using TypeScript,
Tailwind CSS and the App Router.

The application was tested locally using:

`npm run dev`

A public GitHub repository was established to support incremental
version control and document the development process.

### Issue encountered

The original project directory name contained uppercase characters,
which prevented Next.js project initialisation.

### Resolution

The project directory was renamed using lowercase characters.

### Verification

- Application initialisation: PASS
- Local development server: PASS
- Git repository configuration: PASS
- Initial commit and push: PASS

---

## DEV-002 — Firebase SDK Installation and Dependency Audit

**Date:** 15 November 2026

**Status:** Firebase integration completed; dependency security review open

A Firebase project named `greenshare-community-library` was created
using the Spark plan.

The web application was registered as `GreenShare Web App`.

The Firebase JavaScript SDK was installed using:

`npm install firebase`

### Issues encountered

npm reported:

- Deprecated transitive dependencies.
- Node.js engine compatibility warnings.
- Twelve reported vulnerabilities:
  - Eight moderate.
  - Four high.

### Investigation

The following commands were used:

- `npm audit`
- `npm ls`
- `npm audit fix --dry-run`

The investigation identified advisories involving:

- `@grpc/grpc-js`
- `minimatch`
- Related Firebase and ESLint dependency chains

The development environment used Node.js 22.22.3 during the
investigation.

Some installed dependencies indicated compatibility requirements
for a newer Node.js version.

### Decision

Forced dependency upgrades were not applied because npm proposed
potentially incompatible major-version changes.

### Remaining limitation

The current dependency tree requires a fresh security audit
before final deployment.

The installation of Firebase Admin SDK may have changed
the dependency tree since the initial investigation.

### Verification

- Firebase SDK installation: PASS
- Dependency audit performed: PASS
- Dependency tree inspected: PASS
- Dry-run upgrade assessment: PASS
- Forced incompatible updates avoided: PASS

---

## DEV-003 — Firebase Authentication and Login Interface

**Date:** 15 November 2026

**Status:** Completed

Three demonstration accounts were created using Firebase Authentication:

- One Administrator.
- Two Workers.

Corresponding Firestore user profiles were created using Firebase
Authentication UIDs as document identifiers.

The login interface includes:

- Username or email input.
- Password input.
- Authentication feedback.
- Demonstration account selection.
- Automatic demonstration credential population.

Authentication credentials are managed by Firebase Authentication.

Application passwords are not manually compared against Firestore data.

### Verification

- Administrator authentication: PASS
- Worker 1 authentication: PASS
- Worker 2 authentication: PASS
- Demonstration account selection: PASS

### Initial limitation

The initial implementation displayed authentication feedback without
integrating the session into the homepage.

This limitation was addressed in subsequent development stages.

---

## DEV-004 — Firestore User Profiles and Role Identification

**Date:** 15 November 2026

**Status:** Completed

The authentication process was extended to retrieve user profiles
from Cloud Firestore.

The application checks:

- Authenticated Firebase UID.
- Profile document existence.
- Username.
- Assigned role.
- Active account status.

Two roles were defined:

- `admin`
- `worker`

New public accounts receive the `worker` role.

Administrative privileges cannot be selected through the public
registration interface.

### Security decision

Authentication and authorisation are treated as separate responsibilities.

Firebase Authentication identifies the user.

Firestore profiles identify the user's application role.

Administrative operations must independently verify permissions
on the server.

### Verification

- Administrator role identification: PASS
- Worker 1 role identification: PASS
- Worker 2 role identification: PASS
- Firestore profile retrieval: PASS
- Logout functionality: PASS
- TypeScript validation: PASS

### Limitation

Client-side role checks improve the interface but do not provide
authoritative protection for server-side operations.

Administrative equipment operations were subsequently implemented
using server-side verification.

---

## DEV-005 — Public Homepage and Promotional Catalogue

**Date:** 16 November 2026

**Status:** Completed

A public GreenShare homepage was implemented with:

- Responsive navigation.
- Promotional carousel.
- Automatic slide rotation.
- Manual carousel controls.
- Equipment listings.
- Daily borrowing prices.
- Equipment search.
- Category filtering.
- Service information.
- About section.
- Contact information.
- Login and registration navigation.

The homepage allows visitors to explore available equipment
without authenticating.

### Design decision

The initial login-first design was replaced with public browsing.

Authentication is required when users attempt protected operations
rather than merely viewing equipment.

### Issue encountered

Visual Studio Code reported Tailwind CSS warnings involving:

- `bg-gradient-to-br`
- `bg-gradient-to-r`

### Resolution

The affected classes were replaced with Tailwind CSS 4 equivalents:

- `bg-linear-to-br`
- `bg-linear-to-r`

### Verification

- Homepage navigation: PASS
- Promotional carousel: PASS
- Category filtering: PASS
- Search interaction: PASS
- Tailwind class corrections: PASS

---

## DEV-006 — Collection Point Data Model

**Date:** 16 November 2026

**Status:** Completed

The initial single-library concept was expanded into a network
of physical collection points.

Seven fictional collection points were created in Firestore.

Collection:

`libraries`

Distribution:

- Leeds: 3 collection points.
- Manchester: 3 collection points.
- Sheffield: 1 collection point.

Document identifiers:

- `LDS-001`
- `LDS-002`
- `LDS-003`
- `MAN-001`
- `MAN-002`
- `MAN-003`
- `SHF-001`

Each collection point includes:

- Name.
- Address.
- City.
- Postcode.
- Geographical coordinates.
- Active status.

The geographical field is named `location` and uses
Firestore's native `GeoPoint` type.

### Design decision

Collection points represent individual physical locations
rather than cities.

This enables equipment collection, return and inventory tracking
to reference specific branches.

### Verification

- Seven Firestore location documents: PASS
- GeoPoint fields: PASS
- Public location retrieval: PASS
- City filtering: PASS
- Collection point selection: PASS

### Note

The collection point names and addresses are fictional.

Coordinates are approximate demonstration locations.

---

## DEV-007 — Equipment Ownership and Inspection Requirements

**Date:** 16 November 2026

**Status:** Design completed; implemented and verified in DEV-016–DEV-018

Two equipment ownership models were defined:

- `greenshare`
- `community`

GreenShare-owned equipment may be returned to another authorised
collection point.

Privately owned community equipment must be returned to its
original collection point.

A multi-stage approval workflow was designed:

1. Worker submits equipment.
2. Administrator reviews the submission.
3. Administrator requests physical equipment deposit.
4. Equipment is received at a GreenShare collection point.
5. Physical functionality and safety checks are performed.
6. Equipment receives condition grade A, B or C.
7. Administrator evaluates the proposed borrowing price.
8. Owner accepts or declines the valuation.
9. Accepted and approved equipment becomes publicly available.

Approval states include:

- `submitted`
- `awaiting_deposit`
- `under_inspection`
- `awaiting_owner_approval`
- `approved`
- `rejected`
- `withdrawn`
- `inactive`

### Design rationale

Allowing privately owned equipment to become available immediately
after submission was considered insufficient.

Self-reported condition may not accurately reflect functionality,
physical damage or safety.

The staged workflow improves:

- Equipment quality control.
- Borrower safety.
- Owner accountability.
- Pricing transparency.
- Administrative oversight.

### Implementation update

The complete demonstration submission, inspection, valuation
and publication workflow was subsequently implemented.

See DEV-016, DEV-017 and DEV-018.

---

## DEV-008 — Revised Equipment Categories and Battery Model

**Date:** 16 November 2026

**Status:** Data model completed

The equipment model was extended to support six categories:

- Power Tools.
- Garden Equipment.
- Generators.
- Compressors.
- Batteries & Chargers.
- Solar & Energy.

Subcategories identify more specific equipment types.

Supported power sources include:

- Battery.
- Corded.
- Petrol.
- Diesel.
- Solar.
- Manual.

Battery-powered equipment may reference a shared battery platform.

Batteries and chargers are treated as separately rentable
equipment records.

This supports independent:

- Inventory quantities.
- Borrowing prices.
- Equipment identifiers.
- Collection locations.
- Compatibility checks.

### Design decision

A Worker may borrow a cordless tool without a battery or charger
when compatible accessories are already available.

### Demonstration data

Fictional manufacturer names were introduced, including:

- Makiro.
- Borsh.
- DeVolt.
- Millwork.

These names represent demonstration products rather than
real manufacturers.

### Remaining limitation

Transactional multi-item reservations have not yet been implemented.

---

## DEV-009 — Automated Firestore Equipment Seeding

**Date:** 16 November 2026

**Status:** Completed

Manual equipment creation through Firebase Console was considered
inefficient for establishing a demonstration catalogue.

A Node.js seeding script was introduced:

`scripts/seed-equipment.mjs`

The script uses Firebase Admin SDK.

Twelve fictional equipment documents were imported into Firestore.

The demonstration catalogue includes:

- Cordless drills.
- Impact drivers.
- Corded power tools.
- Garden equipment.
- Generator.
- Compressor.
- Battery.
- Charger.
- Solar equipment.

Equipment documents contain:

- Name and description.
- Fictional brand and model.
- Category and subcategory.
- Power source.
- Battery platform.
- Daily rental price in pence.
- Stock quantity.
- Collection point.
- Ownership.
- Condition grade.
- Approval status.
- Timestamps.

### Safety measures

The script supports preview-only execution.

Writes require the explicit `--apply` argument.

Existing identifiers are checked to reduce accidental overwriting.

Firestore batch operations are used for the import.

### Credential management

Firebase administrative credentials are stored outside the
Git repository.

The private service-account key is not included in project code.

### Verification

- Preview mode: PASS
- Product import: PASS
- Twelve equipment documents created: PASS
- Firestore product fields inspected: PASS

---

## DEV-010 — Public Firestore Catalogue Integration

**Date:** 16 November 2026

**Status:** Completed

The homepage was integrated with the Firestore equipment collection.

Public equipment queries use:

- `active == true`
- `approvalStatus == "approved"`

Firestore security rules restrict public access to approved
and active equipment.

The catalogue supports:

- Live equipment retrieval.
- Search by name.
- Search by brand and model.
- Description search.
- Category filtering.
- City filtering.
- Collection point filtering.
- Daily price display.
- Condition grading.
- Power source information.
- Battery platform details.
- Collection point information.

### Verification

- Firestore catalogue retrieval: PASS
- Category filtering: PASS
- Location filtering: PASS
- Homepage integration: PASS
- TypeScript validation: PASS

### Limitation

Displayed stock currently represents total inventory.

Date-specific available capacity will be calculated during
reservation implementation.

---

## DEV-011 — Shared Reservation Calculation Utilities

**Date:** 16 November 2026

**Status:** Implemented; reservation integration pending

A reservation utility module was introduced:

`src/lib/reservation-utils.ts`

The module provides reusable calculations and validation
helpers for:

- Available stock.
- Requested quantities.
- Accessory compatibility.
- Daily rental prices.
- Multi-item totals.
- Equipment eligibility.
- Return location restrictions.
- Reservation selection validation.

Prices are represented as integer pence to avoid unnecessary
floating-point currency errors.

### Verification

- TypeScript validation: PASS

### Important limitation

These calculations do not provide authoritative booking protection.

Reservation creation and modification require trusted
server-side operations and Firestore transactions.

No operational reservation workflow has yet been completed.

---

## DEV-012 — Persistent Authentication Context

**Date:** 16 November 2026

**Status:** Completed

A shared React authentication context was implemented:

`src/lib/auth-context.tsx`

The context uses Firebase Authentication's
`onAuthStateChanged` observer.

It provides:

- Authenticated Firebase user.
- Firestore user profile.
- Username.
- Assigned role.
- Loading state.
- Authentication errors.
- Logout function.

The provider was integrated into:

`src/app/layout.tsx`

Application metadata was updated to use GreenShare branding.

### Issue encountered

After successful authentication, the homepage continued showing
public login controls.

### Cause

The homepage was not consuming the shared authentication context.

### Resolution

Homepage navigation and equipment interactions were connected
to the shared authentication state.

---

## DEV-013 — Login Redirect and Session Management

**Date:** 16 November 2026

**Status:** Completed

The login interface was updated to recognise authenticated sessions.

Authenticated users opening `/login` are redirected to the homepage.

The application waits for Firebase session verification before
deciding whether to show the login form.

### Issue encountered

An authenticated user could open the login page in another tab
and authenticate as a different demonstration account without
first signing out.

### Resolution

The login interface was updated to:

- Wait for authentication state resolution.
- Identify existing authenticated sessions.
- Redirect authenticated users.
- Prevent display of the login form during session checks.

A visible logout control was retained.

### Verification

- Login redirect: PASS
- Session persistence: PASS
- Existing session detection: PASS
- Logout: PASS
- Switching between demonstration accounts: PASS
- TypeScript validation: PASS

### Observation

The Next.js development indicator was visible in the browser.

This was identified as development tooling rather than
an application defect.

---

## DEV-014 — Authenticated Homepage Navigation

**Date:** 16 November 2026

**Status:** Completed

A reusable navigation component was introduced:

`src/components/AuthNavigation.tsx`

Anonymous visitors receive authentication and registration links.

Authenticated users see:

- Username.
- Assigned role.
- Avatar.
- Account dropdown.
- Logout control.

Navigation options depend on the authenticated user's role.

Worker accounts can access equipment management.

Administrator accounts can access equipment approvals.

### Verification

- Administrator identification: PASS
- Worker identification: PASS
- Logout: PASS
- Account switching: PASS
- Session persistence: PASS
- Homepage integration: PASS
- TypeScript validation: PASS

---

## DEV-015 — Public Worker Registration and Role-Based Navigation

**Date:** 17–18 November 2026

**Status:** Completed — functional verification passed

Public account registration was implemented using Firebase Authentication
and Cloud Firestore.

Newly registered users are assigned the `worker` role automatically.

Administrative privileges cannot be selected during registration.

The registration process creates a Firebase Authentication account
and a corresponding Firestore user profile.

The navigation component was extended with an account dropdown
containing role-specific options.

Workers can access equipment submissions.

Administrators can access the equipment approval interface.

### Technical decisions

- Firebase Authentication manages credentials.
- Firestore stores usernames, roles and account status.
- Navigation reflects the authenticated user's role.
- Protected operations verify permissions on the server.

### Verification

- Registration interface: PASS
- Worker role assignment: implemented
- Worker navigation: PASS
- Administrator navigation: PASS
- Account switching: PASS
- Logout: PASS
- TypeScript validation: PASS
- ESLint validation: PASS

### Limitation

A complete account management interface remains to be implemented.

---

## DEV-016 — Community Equipment Submission

**Date:** 18 November 2026

**Status:** Completed — functional verification passed

A Worker equipment submission interface was implemented:

`src/app/my-equipment/page.tsx`

Workers may submit privately owned equipment for consideration
by GreenShare administrators.

The form records:

- Equipment name.
- Description.
- Brand and model.
- Category and subcategory.
- Power source.
- Battery platform.
- Battery inclusion.
- Collection point.
- Quantity.
- Proposed daily borrowing price.

Prices are stored as integer pence.

Submitted equipment receives:

- `ownership: "community"`
- `approvalStatus: "submitted"`
- `active: false`

Workers cannot directly approve their own listings.

Firestore security rules permit restricted submission creation
while preventing unauthorised administrative changes.

### Issue encountered

ESLint reported synchronous React state updates inside an Effect.

The warning concerned the `react-hooks/set-state-in-effect` rule.

### Resolution

The effect logic was revised to remove unnecessary synchronous
state updates and avoid cascading renders.

### Verification

- Equipment submission form: PASS
- Firestore document creation: PASS
- Owner-specific equipment list: PASS
- Initial submission status: PASS
- TypeScript validation: PASS
- ESLint validation: PASS

### Demonstration evidence

Worker 2 submitted a fictional Makiro cordless drill
with a requested borrowing price of £12.00 per day.

---

## DEV-017 — Administrative Review and Physical Equipment Inspection

**Date:** 18 November 2026

**Status:** Completed — demonstration workflow verified

The equipment approval interface was implemented:

`src/app/admin/approvals/page.tsx`

Administrative operations use Next.js Server Actions
and Firebase Admin SDK.

Server-side authorisation verifies:

- Firebase ID token.
- Firestore user profile.
- Active account status.
- Administrator role.

The workflow supports:

1. Reviewing new equipment submissions.
2. Requesting physical deposit.
3. Confirming receipt of equipment.
4. Recording functional inspection results.
5. Recording safety inspection results.
6. Assigning an A, B or C condition grade.
7. Proposing a revised daily borrowing price.
8. Recording inspection notes.
9. Rejecting equipment that fails inspection.

Inspection reports are stored in:

`equipmentInspections`

Firestore transactions protect related equipment and
inspection record updates.

### Design rationale

Immediate approval based solely on user-provided information
was considered insufficient.

The staged approach improves:

- Safety.
- Equipment quality control.
- Pricing transparency.
- Accountability.
- Administrative oversight.

### Verification

- Administrator submission retrieval: PASS
- Physical deposit request: PASS
- Equipment receipt confirmation: PASS
- Under Inspection status transition: PASS
- Functional inspection interface: PASS
- Safety inspection interface: PASS
- Condition grading: PASS
- Successful inspection submission: PASS
- Awaiting Owner Approval status transition: PASS
- TypeScript validation: PASS
- ESLint validation: PASS

### Demonstration evidence

The Makiro cordless drill passed both functionality
and safety checks.

The administrator assigned condition grade B.

The original requested daily price was £12.00.

The administrator proposed £10.00 per day.

### Limitations

Physical inspection was simulated for academic demonstration.

Inspection photographs and a comprehensive administrative audit
interface remain future improvements.

---

## DEV-018 — Owner Valuation Acceptance and Equipment Publication

**Date:** 18 November 2026

**Status:** Completed — end-to-end verification passed

A Worker valuation interface was implemented in:

`src/app/my-equipment/page.tsx`

The interface displays:

- Original requested price.
- Administrator's proposed price.
- Functional test result.
- Safety test result.
- Condition grade.
- Inspection notes.
- Accept Valuation button.
- Decline Valuation button.

Server Actions independently verify the authenticated Worker
and equipment ownership.

The accepted valuation updates the equipment price and
publishes the listing.

A declined valuation withdraws the listing.

Firestore transactions synchronise:

- Equipment approval status.
- Owner decision.
- Agreed borrowing price.

### Verification

- Owner valuation retrieval: PASS
- Original price displayed: PASS
- Revised price displayed: PASS
- Inspection results displayed: PASS
- Owner acceptance: PASS
- Equipment status changed to Approved: PASS
- Agreed daily price updated: PASS
- Public catalogue publication: PASS
- Visibility from another Worker account: PASS
- TypeScript validation: PASS
- ESLint validation: PASS

### Demonstration evidence

Worker 2 accepted the administrator's revised valuation
of £10.00 per day.

The Makiro cordless drill changed to Approved.

The equipment appeared in the public catalogue.

The published listing was independently checked
using Worker 1's account.

### Outstanding work

Although approved equipment is publicly discoverable,
the reservation workflow remains incomplete.

---

## DEV-019 — Git Milestones for Authentication and Equipment Workflow

**Date:** 18 November 2026

**Status:** Local commits completed; remote push pending verification

Two logical Git commits were created following
functional verification.

### Commit 1

`a603a51`

`feat(auth): add worker registration and role-based navigation`

This commit records authentication, registration,
navigation and Firebase Admin SDK configuration changes.

### Commit 2

`edf1564`

`feat(equipment): implement community equipment approval workflow`

This commit records community equipment submission,
administrative review, physical inspection, valuation
and publication functionality.

The commits demonstrate incremental progress through
separate implementation milestones.

### Verification

- Git commits created: PASS
- Functional changes separated by responsibility: PASS
- Remote push: Pending verification

---

# Current Implementation Status

## Completed

- Next.js App Router project initialisation.
- TypeScript configuration.
- Tailwind CSS 4 configuration.
- GitHub repository.
- Firebase project configuration.
- Firebase Authentication integration.
- Three demonstration accounts.
- Firestore user profiles.
- Worker and Administrator role identification.
- Public Worker registration implementation.
- Persistent authentication context.
- Login redirects.
- Logout functionality.
- Role-based navigation.
- Public homepage.
- Promotional carousel.
- Firestore collection point database.
- Seven fictional collection points.
- Equipment category model.
- Battery and charger compatibility model.
- Firebase Admin SDK equipment seeding script.
- Twelve demonstration equipment products.
- Public Firestore catalogue.
- Equipment search and filtering.
- Shared reservation calculation utilities.
- Worker community equipment submission.
- Owner-specific equipment listings.
- Administrative equipment review.
- Physical equipment deposit confirmation.
- Functional and safety inspection.
- Equipment condition grading.
- Administrator price proposal.
- Worker valuation acceptance.
- Worker valuation rejection handling.
- Approved equipment publication.
- Public visibility of approved community equipment.
- Server-side authorisation for equipment approval operations.

## Planned or Incomplete

- Full account management interface.
- Complete administrative dashboard.
- Administrator library creation and editing.
- Administrator inventory management.
- Library and equipment deletion.
- Reservation form.
- Reservation dates restricted to 1–3 February 2027.
- Transactional reservation creation.
- Date-specific inventory availability.
- Double-reservation prevention.
- Concurrent booking protection.
- Multi-item accessory reservations.
- Worker reservation history.
- Worker reservation details.
- Reservation editing.
- Reservation cancellation.
- Administrator reservation management.
- Equipment collection and return tracking.
- Inventory transfers between collection points.
- Interactive Leaflet map.
- Map-based borrowing.
- Automated integration tests.
- Complete role and access security testing.
- Final dependency security audit.
- Production deployment verification.
- Final technical evaluation.

---

# Security Considerations

GreenShare separates authentication from authorisation.

Firebase Authentication verifies account identity.

Cloud Firestore stores application profiles and roles.

Client-side role checks control interface presentation.

Administrative Server Actions independently verify
Firebase ID tokens and Firestore roles.

Protected equipment operations use Firebase Admin SDK.

The application prevents Workers from assigning themselves
administrative privileges through public registration.

Worker submissions are initially inactive and require
administrative review.

The inspection workflow prevents equipment that fails
safety checks from being approved.

Owner valuation decisions are restricted to the authenticated
owner of the equipment.

Firestore transactions protect related changes involving
equipment status, inspection records and agreed prices.

Private Firebase administrative credentials are stored
outside the repository.

The service-account private key must not be included
in the public GitHub repository or submitted application code.

Demonstration account credentials are intended only
for controlled academic testing.

---

# Testing Summary

## Static Validation

Development checks include:

- `npx tsc --noEmit`
- `npm run lint`

TypeScript and ESLint checks passed following the
documented authentication and equipment workflow changes.

Static validation does not replace runtime testing.

## Authentication Testing

- Administrator authentication: PASS
- Worker 1 authentication: PASS
- Worker 2 authentication: PASS
- Role identification: PASS
- Session persistence: PASS
- Login redirects: PASS
- Logout: PASS
- Account switching: PASS

## Equipment Catalogue Testing

- Public Firestore retrieval: PASS
- Category filtering: PASS
- Location filtering: PASS
- Approved equipment visibility: PASS
- Daily price display: PASS
- Condition grade display: PASS

## Community Equipment Workflow Testing

- Worker submission: PASS
- Administrator submission retrieval: PASS
- Physical deposit request: PASS
- Equipment receipt confirmation: PASS
- Inspection form: PASS
- Inspection submission: PASS
- Owner valuation display: PASS
- Owner acceptance: PASS
- Final approval: PASS
- Agreed price update: PASS
- Publication in the public catalogue: PASS
- Visibility using a second Worker account: PASS

## Testing Limitations

Automated integration and end-to-end tests have not yet
been completed.

The reservation workflow has not yet been tested because
it remains under development.

Security testing must be expanded before deployment.

---

# Evidence Collection

The following evidence should be retained for the
final AE2 technical report:

1. Successful login using different account roles.
2. Worker registration interface.
3. Role-based account navigation.
4. Worker equipment submission form.
5. Submitted equipment awaiting review.
6. Administrative approval interface.
7. Equipment awaiting physical deposit.
8. Equipment under inspection.
9. Physical inspection form.
10. Administrator's revised daily price.
11. Worker valuation comparison.
12. Worker acceptance of the valuation.
13. Final Approved status.
14. Published equipment visible in the public catalogue.
15. Published equipment visible from a different Worker account.
16. TypeScript validation results.
17. ESLint validation results.
18. Git commit history.

Screenshots should be selected and annotated in the final report
to demonstrate technical decisions and observed results.

---

# Next Development Stage

The next priority is the reservation workflow.

The assessment requires reservation dates to be restricted to:

- 1 February 2027.
- 2 February 2027.
- 3 February 2027.

The booking implementation must:

1. Require an authenticated active Worker.
2. Verify that equipment is approved and active.
3. Validate the selected reservation date.
4. Support equipment quantity selection.
5. Verify date-specific stock availability.
6. Prevent concurrent overbooking.
7. Support compatible battery and charger selection.
8. Calculate rental prices using integer pence.
9. Identify collection and return locations.
10. Apply ownership-specific return restrictions.
11. Create reservations using Firestore transactions.
12. Allow Workers to view their own reservations.
13. Allow Workers to edit permitted reservation details.
14. Allow Workers to cancel reservations.
15. Restore capacity following cancellation.
16. Allow administrators to manage all reservations.

The reservation workflow is essential for satisfying
the original assessment requirements B, C and G.

Further development will also address inventory management
and the interactive Leaflet map required by the brief.

---

# Development Log Maintenance

Development records must reflect functionality that has
actually been implemented and tested.

Planned features must not be described as completed.

Every major development stage should document:

- Implementation objectives.
- Technical decisions.
- Relevant components.
- Problems encountered.
- Corrective actions.
- Verification results.
- Remaining limitations.
- Associated Git milestones.

The development log will continue to be updated alongside
the AE1 design report and AE2 implementation.