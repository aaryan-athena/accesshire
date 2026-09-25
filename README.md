# AccessHire

Skills-first job matching for neurodivergent people and people with physical and sensory
disabilities.

## How it fits together

```
form/  (employer intake form) ──writes──▶ Firestore `companies`
                                               │  read live, no sync step
                                               ▼
portal (this app) ── src/lib/intakeAdapter.ts ─▶ canonical jobs ─▶ src/lib/matcher.ts ─▶ UI
                      src/lib/assessments.ts  ─▶ candidate profile (Firestore `candidate_profiles/{uid}`,
                                                  or the device when signed out)
```

- **Backend:** Firebase only — Firestore + Firebase Auth (email/password and Google).
- **Jobs:** every role submitted through `form/` (or "Post a role" on /employers) appears on
  the portal immediately. Roles with no job title are held back and listed on /employers.
- **Assessments:** two tracks, `neurodivergent` and `physical-sensory`. Both share one skills
  core (the only input to the capability score) and add a category module. Anyone who fits
  both can add the other module alone via `/assessments/<track>?part=module`.
- **Matching:** capability (skills 65% / interests 20% / experience & education 15%), shown
  separately from physical access, neurodivergent work-style fit, work-type fit and whether the
  employer says it is open to hiring the candidate's category. Access signals never lower the
  capability score or hide a job.

## Setup

```sh
cp .env.example .env    # same Firebase project as form/.env
npm install
npm run dev             # http://localhost:8080
npm test
```

In the Firebase console for the project:

1. **Authentication → Sign-in method:** enable Email/Password and Google. Add your deployed
   domain under *Authorized domains*.
2. **Firestore rules:** deploy `firestore.rules`
   (`firebase deploy --only firestore:rules`). It keeps the intake form working and makes
   candidate data private to each user.
