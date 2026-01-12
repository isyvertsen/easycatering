# Plan: Fikse API Proxy + localStorage lokalt

## Situasjonen akkurat nå:

**Hvor er vi:**
- Branch: `feature/api-proxy-all-endpoints`
- Backend: kjører på port 8000
- Frontend: stoppet

**Hva som fungerer:**
- ✅ API proxy routes er laget (/api/v1, /api/admin, /api/anonymization)
- ✅ API-kall går via Next.js proxy (testet med curl)

**Hva som IKKE fungerer:**
- ❌ UI får 500 error når du åpner http://localhost:3000/
- ❌ Årsak: localStorage-feil under server-side rendering

---

## PLAN for å fikse dette LOKALT:

### Steg 1: Fiks localStorage i sidebar.tsx (på denne branchen)
- Legg til `typeof window !== 'undefined'` sjekk før alle localStorage-kall
- Fil: `src/components/layout/sidebar.tsx`

### Steg 2: Sett NEXT_PUBLIC_AUTH_BYPASS=true i .env.development
- Slik at vi slipper login-problemer under testing
- Fil: `.env.development`

### Steg 3: Slett all cache og restart frontend
```bash
rm -rf .next
npm run dev
```

### Steg 4: Test LOKALT at:
- [ ] http://localhost:3000/ laster (200 OK)
- [ ] Dashboard vises
- [ ] Menyer fungerer via API proxy
- [ ] Produkter fungerer via API proxy
- [ ] Health check viser grønn status

### Steg 5: Når ALT fungerer lokalt -> STOPP
- **VENT på at brukeren sier jeg skal sjekke inn**
- Ikke sjekk inn før du får beskjed!

---

## Etter at lokal testing er OK:

1. Commit alle endringer på `feature/api-proxy-all-endpoints`
2. Push branch
3. Vent på merge
4. Checkout main
5. Pull main
6. Start ny branch for neste oppgave

---

**VIKTIG:** Jobb LOKALT først, test at ALT fungerer, DERETTER sjekk inn.
