# Project Context — Antarious Psychometric Profiling

Hand this file to Claude at the start of any new session to get full context instantly.

---

## What This App Is

A mobile-first loan officer tool for PKSF/BURO-Bangladesh microfinance POs. Loan officers screen applicants using psychometric assessment. Demo officer: **Kamrul Hossain** (Loan Officer ID 21047). UI is fully bilingual — Bengali primary, English secondary throughout.

---

## Tech Stack

| Layer | Package | Version |
|---|---|---|
| Framework | Expo | ~54.0.0 |
| Runtime | React Native | 0.81.5 |
| React | React + React DOM | 19.1.0 |
| Routing | expo-router | ~6.0.23 |
| Styling | NativeWind + Tailwind | ^4.1.23 + ^3.4.17 |
| Animation | react-native-reanimated | ~4.1.1 |
| Fonts | @expo-google-fonts (×5) | ^0.2.3 |
| Storage | @react-native-async-storage | 2.2.0 |
| Image pick | expo-image-picker | ~17.0.10 |

---

## Repo

```
https://github.com/foysal-mahmud-hasan/antarious-psychometric-profiling.git
```

Private repo. SSH deploy key needed for server access.

---

## Project Structure

```
app/
  _layout.js              # Root: loads 11 Google Fonts, wraps AppProvider
  index.js                # Redirects → /login
  login.js                # Phone + PIN login screen
  otp.js                  # OTP verification
  intake.js               # New applicant intake form
  assessment.js           # Psychometric question flow
  scoring.js              # Scoring calculation screen
  result.js               # Result / profile report
  kyc.js                  # Digital KYC module
  credit.js               # Credit scoring module
  repayment.js            # Repayment prediction module
  fieldvisit.js           # GPS field visit module
  (tabs)/
    _layout.js            # Tab shell + BottomNav
    dashboard.js          # Main dashboard (stats, applicants, modules)
    history.js            # Assessment history
    analytics.js          # Analytics screen

components/
  BrandHeader.js          # Page header with back button + right slot
  ApplicantRow.js         # Applicant list row (score, status, flags)
  BilingualLabel.js       # Bengali + English stacked label
  BottomNav.js            # Tab navigation bar
  FreyaButton.js          # Floating AI assistant button
  FreyaChat.js            # AI chat overlay
  FreyaOrb.js             # Animated AI orb
  FreyaHint.js            # Contextual hint bubble
  FreyaGenericHint.js
  Field.js                # Form input field
  PrimaryBtn.js           # Primary action button
  Chip.js                 # Status chip
  Banners.js              # Offline + Training mode banners
  RadarChart.js           # Psychometric radar chart (react-native-svg)
  AntariousLogo.js        # Brand logo
  
context/
  AppContext.js           # Global state: applicantId, answers, tweaks, profilePhoto

utils/
  storage.js              # AsyncStorage wrapper; keys in K constant
  format.js               # Formatting helpers

constants/
  tokens.js               # Design tokens: colors (T.navy, T.teal...), font names
  
data/
  questions.js            # Psychometric question bank
  dimensions.js           # Scoring dimensions config
  scoring.js              # Scoring logic
  personas.js             # Persona definitions

assets/
  images/
    antarious-dark.png
    antarious-white.png
    freya-coin.png
```

---

## Key Config Files

**`babel.config.js`**
```js
presets: [['babel-preset-expo', { jsxImportSource: 'nativewind' }], 'nativewind/babel'],
plugins: ['react-native-reanimated/plugin'],
```

**`metro.config.js`**
```js
withNativeWind(config, { input: './global.css' })
```

**`app.json`** notable settings:
- `newArchEnabled: false` — disabled for Expo Go compatibility
- `web.output: "static"` — Expo web builds to `dist/` folder
- `scheme: "antarious"` — deep link scheme

---

## Production / Supabase rollout

See **`PRODUCTION_SETUP.md`** for migration `003`, RLS, **`finalize-assessment`** Edge deploy, OAuth/OTP checklist, and UI/UX backlog ideas.

---

## Critical Known Issues

### 1. Always use `--legacy-peer-deps`
```bash
npm install --legacy-peer-deps
```
`react-native-worklets` has a peer dep conflict with React 19. Plain `npm install` fails.

### 2. Never remove `react-native-worklets`
This package is required by `react-native-css-interop` (NativeWind's engine) as a **build-time babel plugin** (`react-native-worklets/plugin`). It is loaded unconditionally in `react-native-css-interop/babel.js`. Removing it breaks Metro bundling.

### 3. Ngrok tunnel is broken
`@expo/ngrok` uses ngrok v2 binary which is deprecated — server rejects all connections. Use:
- `npx expo start --lan` (same WiFi)
- `adb reverse tcp:8081 tcp:8081 && npx expo start --localhost` (USB)

### 4. Expo Go must be SDK 54
Device must have Expo Go updated from Play Store to SDK 54 version. Older Expo Go shows "something went wrong" even on LAN.

---

## AppContext State

```js
{
  applicantId,       // string — current applicant ('nasrin', 'rafiq', 'shima')
  setApplicant,
  answers,           // object — psychometric answers keyed by question id
  setAnswers,
  tweaks,            // { offline: bool, trainingMode: bool }
  setTweaks,
  showFreya,         // bool — Freya AI chat open
  openFreya,
  closeFreya,
  currentQContext,   // current question for Freya context
  setCurrentQContext,
  pendingSync,       // count of answers pending sync in offline mode
  hydrated,          // bool — AsyncStorage loaded
  resetAll,          // clears all storage
  profilePhoto,      // string | null — local URI of officer's profile photo
  setProfilePhoto,   // saves to AsyncStorage
}
```

---

## Storage Keys (`utils/storage.js` → `K`)

```js
K.applicant      // 'ant.applicant'
K.answers        // 'ant.answers'
K.tweaks         // 'ant.tweaks'
K.screen         // 'ant.screen'
K.profilePhoto   // 'ant.profilePhoto'
```

---

## Design Tokens (quick ref)

```js
// Colors
T.navy   = '#0F1829'   T.teal  = '#2EC4B6'   T.gold  = '#B5874F'
T.cream  = '#F7F6F2'   T.coral = '#E04F4F'   T.ink   = '#1A1A2E'
T.ink3   = '#6B7280'   T.border = '#E2DED6'

// Font names (use in fontFamily style)
T.fHead    = 'PlayfairDisplay_800ExtraBold'
T.fBody    = 'Inter_500Medium'
T.fBn      = 'NotoSansBengali_600SemiBold'
T.fBnBold  = 'NotoSansBengali_700Bold'
T.fBnBlack = 'NotoSansBengali_800ExtraBold'
T.fMono    = 'JetBrainsMono_600SemiBold'
```

---

## Deployment

- **Domain:** `pmp.antarious.com`
- **Server:** Ubuntu + Nginx, user `foysal`, path `/home/foysal/antarious/`
- **Build:** `npx expo export --platform web` → `dist/` static folder
- **Nginx:** SPA mode — `try_files $uri /index.html`
- **SSL:** Certbot
- **Full guide:** `SERVER_DEPLOY.md` in this repo

---

## Development Commands

```bash
# Start dev server (LAN — same WiFi as device)
npx expo start --lan --clear

# Start dev server (USB — adb reverse first)
adb reverse tcp:8081 tcp:8081
npx expo start --localhost

# Build static web export
npx expo export --platform web

# Install packages (always use legacy-peer-deps)
npm install --legacy-peer-deps
npx expo install <package>   # then npm install --legacy-peer-deps
```
