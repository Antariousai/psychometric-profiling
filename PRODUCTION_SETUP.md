# Production rollout — Antarious psychometric profiling

This document matches the codebase changes introduced for **migration `003_production_auth_rls.sql`**, the **`finalize-assessment`** Edge Function, and **staff auth** on the Expo client.

## 1. What changed

### Database (`supabase/migrations/003_production_auth_rls.sql`)

- **`staff_profiles`**: mirrors `auth.users` for officer metadata (`role`, `officer_code`, etc.).
- **Trigger `on_staff_auth_signup`**: inserts/updates `staff_profiles` when a Supabase Auth user is created (Supabase-compatible `SECURITY DEFINER` pattern).
- **`created_by` + triggers** on **`applicants`**, **`assessment_sessions`**, **`credit_decisions`**: stamped with `auth.uid()` on insert.
- **RLS tightened**:
  - **`anon`** can read **only** `psychometric_questions` and **`psychometric_dimensions`** (catalog).
  - **`authenticated`** can read/write **only rows tied to sessions they created** (`created_by`), including nested `assessment_responses`.
  - **`psychometric_assessment_results`**: **no INSERT/UPDATE** for JWT roles — only **SELECT** rows for owned sessions (writes go through Edge + **service role**).

Brownfield installs get a **`staff_profiles`** backfill for existing `auth.users` at end of migration.

### Backend (`supabase/functions/finalize-assessment`)

Validates:

1. Bearer JWT (**`verify_jwt` on** in `supabase/config.toml`),
2. `assessment_sessions.created_by === jwt.sub`,
3. Loads questions, dimensions, and responses via **service role**,
4. Runs the same **`computeScore`** logic as the app (**`functions/_shared/psymp-score.ts`** — **keep aligned with `data/scoring.js`**),
5. **Upserts** `psychometric_assessment_results`,
6. Sets **`completed_at`** on the session.

Deploy:

```bash
supabase login
supabase link --project-ref YOUR_REF
supabase db push                     # migrations
supabase functions deploy finalize-assessment
```

Ensure **seed** scripts ran:`supabase/seed_reference_data.sql`, `seed_questions.sql`.

### Frontend

- **`AuthProvider`** + **Supabase Auth** persisted with **`AsyncStorage`**, refresh enabled.
- **Route gate** (`app/_layout.js`): redirects to **`/login`** only when Supabase is configured **and** **`EXPO_PUBLIC_REQUIRE_AUTH=true`** (off by default for demo flows).
- **Login**: sends **SMS OTP** via `signInWithOtp` when Supabase SMS is wired; optional **staging password** login via **`EXPO_PUBLIC_DEV_AUTH_EMAIL` / `_PASSWORD`** (expand “Staff password” panel).
- **OTP** screen reads **`phone` param** from the router and calls **`verifyOtp`**.
- **Results** persistence uses **`persistPsychometricAssessmentAuthoritative`** → Edge first, optional client snapshot only if **`EXPO_PUBLIC_ALLOW_CLIENT_RESULT_SNAPSHOT=true`** (**will fail against migration 003 RLS unless you loosen policies**).

### Operations checklist

| Step | Notes |
|------|--------|
| Enable **Phone Auth** (+ SMS provider) in Supabase | Test with one device number |
| Create **staging staff** via dashboard / invite | Roles in `staff_profiles`; optional **`raw_user_meta_data.role`** |
| Run migrations + seeds | Including dimensions + questions rows |
| Deploy **finalize-assessment** | Set **`EXPO_PUBLIC_PREFER_EDGE_FINALIZE=true`** in EAS/production env |
| CORS | Edge uses `*` for now — lock to **`pmp.antarious.com`** in production (`finalize-assessment` headers) |
| Monitoring | Wire **Sentry** / Logflare later |
| Rotate keys | Remove leaked keys from any committed `.txt` / old docs |

## 2. UI / UX enhancement ideas (recommended backlog)

Design language is already strong (bilingual stacking, teal/navy hierarchy). Next wins:

### Engagement and cognitive load

- **Progress scaffolding**: Fixed “খুশি থাকব · প্রশ্ন ১৪/৪১” breadcrumb bar on **`assessment.js`** reduces anxiety; mirror progress with **estimated minutes** (“প্রায় ৪ মিনিট বাকি”).
- **Answer reassurance**: Brief micro-copy after each scale tap (“উত্তর সংরক্ষিত”) with visible **offline tick** synced state (you expose `pendingSync` — tie it to answered counts).
- **Resume flow**: Surface “এই আবেদনকারীর মূল্যায়ন চলছিল” modal if `answers` persisted + **`assessmentSessionId`** matches — avoids accidental restart.

### Trust and sensitive decisions

- **Decision confirmation sheet**: **`result`** approve/decline should use explicit two-step bilingual confirm with **risk summary chips** (“৩টি ফ্ল্যাগ”, “overall 487”) aligned with cooperative finance norms.
- **Audit affordance**: After decision, toast with **immutable reference** (“সিদ্ধান্ত সংরক্ষিত · শেষ খণ্ড ইউআইডি”).
- **Data minimisation UI**: Mask NID visually in **`intake`** / **`kyc`** with tap-to-expand + short retention tooltip.

### Efficiency for field officers

- **Floating “next applicant” shortcut** from **result → intake** stacked with path for corrections.
- **History tab**: Filters by rating, offline queue, officer name (tie to **`staff_profiles.officer_code`** once populated).
- **Haptics**: Light impact on **`PrimaryBtn`** success paths alongside existing visual reinforcement.

### Accessibility and readability

- **Dynamic type**: Respect **`PixelRatio`/system font scaling** on body copy for Bengali on low-end devices.
- **Touch targets**: Maintain **minimum 44×44** equivalents on **`result`** tabs and **`Chip`** hit areas (audit on small phones).
- **High-contrast toggle** in **`tweaks`** (thin border mode for bright sunlight).

### Web-specific

- **`try_files` SPA** is documented in **`PROJECT_CONTEXT`** — add **`viewport-fit`** and consistent **safe-area** padding for PWAs / notched devices.
- **Keyboard**: Aim for **`assessment`** option lists operable via keyboard on **`react-native-web`**.

Implement **resume flow**, **decision confirmation**, and **explicit sync/error states** before broader polish for production microfinance workloads.
