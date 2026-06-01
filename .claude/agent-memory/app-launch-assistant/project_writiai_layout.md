---
name: WRITI.AI Dashboard Layout Architecture
description: Key layout decisions, design tokens, and functional requirements for the WRITI.AI Next.js 14 App Router dashboard shell
type: project
---

Dashboard shell lives at `app/dashboard/layout.js` (~1240 lines).

**Design tokens (v2 dark SaaS redesign)**
- Background: `#0c0c0e`
- Sidebar: `#111116`, 64px wide, icon-only, desktop only
- Topbar: `#13131a`, 52px tall, breadcrumb left / credits+plan+avatar right
- Borders: `rgba(255,255,255,0.06)`
- Accent: `#7c3aed` (violet), highlight text `#a78bfa`
- No Tailwind — all inline styles + `<style jsx>`

**Functional sections (lines NOT to touch: 1-400)**
- Lines 1–200: auth (fetchProfile, checkAuth, onAuthStateChange, URL param handling)
- Lines 200–310: trial/expiration useEffects + body-scroll lock
- Lines 310–400: handleCheckoutPlan, handleLogout, loading screen JSX

**JSX return structure**
```
<div flex h-100vh>
  <aside class="desktop-sidebar">   // 64px, icon nav + tooltips + logout
  <div flex-col overflow-hidden>    // main wrapper
    <header topbar 52px>            // breadcrumb | credits pill | upgrade btn | avatar dropdown
    <main overflow-y-auto>          // {children}
  </div>
  {sidebarOpen && <MobileOverlay>}  // full-screen, 280px slide-in
  <CreditsModal />
  {showNoCreditsModal && <NoCreditsModal />}
  {isPaymentSuccessModalOpen && <SuccessModal />}
  <style jsx> global styles + responsive
</div>
```

**SuccessModal** — was missing import in original file; added `import SuccessModal from '@/app/components/SuccessModal'`

**Breadcrumb map** — pathname → Spanish label, defined in JSX section just before navItems array.

**Why:** Redesign requested to match app.saleads.ai dark SaaS aesthetic; all logic preserved, only visual layer replaced.

**How to apply:** When editing layout.js, keep lines 1-400 untouched. Only the return() block (after the loading guard) is visual territory.
