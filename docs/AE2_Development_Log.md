# GreenShare — AE2 Development Log

## Project Information

- Project: GreenShare Community Tool Library
- Module: Contemporary Web Applications
- Framework: Next.js, React, TypeScript
- Styling: Tailwind CSS
- Backend services: Firebase (integration in progress)
- Version control: GitHub

## Development History

### DEV-001 — Initial Project Setup
**Date:** 15 November 2026
**Status:** Completed

The Next.js application was successfully initialised with TypeScript, Tailwind CSS and App Router. The application was tested locally using `npm run dev`. A public GitHub repository was established, and the initial project files were committed and pushed.

**Issue encountered:** The initial project directory name contained uppercase characters, which were rejected by the Next.js project initialisation process.

**Resolution:** The directory was renamed to use lowercase characters, allowing project initialisation to proceed successfully.

### DEV-002 — Firebase SDK Installation
**Date:** 15 November 2026
**Status:** Installed — security review pending

A Firebase project named `greenshare-community-library` was created using the free Spark plan. The web application was registered as `GreenShare Web App`.

The Firebase JavaScript SDK was installed using `npm install firebase`.

**Issue encountered:** npm reported deprecated dependencies, engine compatibility warnings and 12 security vulnerabilities (8 moderate and 4 high).

**Investigation:** The `npm audit` command identified advisories affecting `@grpc/grpc-js`, `minimatch` and related dependency chains.

**Current decision:** Avoid `npm audit fix --force` until the installed package versions and compatibility implications have been investigated.

**Resolution:** Pending.

Further investigation: The dependency audit confirmed that the reported vulnerabilities originate from transitive dependencies used by Firebase and ESLint. The audit also revealed that some Firebase packages require Node.js 24.12.0 or newer, while the development environment currently uses Node.js 22.22.3.Decision: Automatic forced updates were rejected because npm proposed potentially incompatible major-version changes. The issues remain open and will be revisited before deployment. The next development stage will focus on Firebase configuration and functional verification.Verification: npm audit, npm ls and npm audit fix --dry-run completed. No dependency changes were applied as part of the investigation.

## Future Entries

Additional implementation decisions, technical problems, corrective actions and verification results will be documented as development progresses.

DEV-003 — Firebase Authentication and Login Interface
Date: 15 November 2026
Status: Initial authentication tests passedThree demonstration accounts were created using Firebase Authentication: one Administrator and two Workers. Corresponding user profiles were added to Cloud Firestore using Firebase Authentication UIDs as document identifiers.A login interface was implemented using Next.js, React and Tailwind CSS. The interface includes username/email input, password input, authentication feedback and quick-selection buttons for the demonstration accounts.Testing: All three accounts were successfully authenticated through Firebase Authentication. The application displayed confirmation messages containing the authenticated email addresses.Known limitations: Role-based access control, protected routes, logout functionality and server-side session verification have not yet been implemented.Next step: Implement secure Firestore profile access and verify user roles after authentication.

DEV-004 — User Profiles and Role Identification
Date: 15 November 2026
Status: Completed — initial functionality verifiedImplementation: The authentication module was extended to retrieve user profiles from Cloud Firestore after successful Firebase Authentication. Profile validation checks the authenticated UID, username, account status and assigned role.Firestore security rules were configured to allow authenticated users to read their own profiles while preventing client-side profile modifications.Tests performed:- Administrator authentication and role identification: PASS
- Worker 1 authentication and role identification: PASS
- Worker 2 authentication and role identification: PASS
- Firestore profile retrieval: PASS
- Demo credential autofill: PASS
- Logout functionality: PASS
- TypeScript validation (npx tsc --noEmit): PASS
Remaining limitations: Protected server-side sessions, route authorisation and administrative operation permissions have not yet been implemented. Dependency security warnings recorded in DEV-002 also remain unresolved.Next step: Create protected application navigation and separate Worker/Admin dashboards.