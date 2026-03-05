# MigraineCast - Intelligente Migräne-Vorhersage

Eine vollständige Next.js-Applikation zur Vorhersage und Nachverfolgung von Migräneereignissen basierend auf Wetterdaten, Luftqualität und persönlichen Faktoren.

## Features

- 🎯 **KRII-Index**: Personalisierter Kopfschmerzrisiko-Index, der Wetter und persönliche Faktoren kombiniert
- 📊 **Dashboard**: Echtzeit-Risikobewertung mit 72-Stunden und 5-Tages-Vorschau
- 📝 **Migräne-Tagebuch**: Dreistufiges Erfassungsformular für Ereignisse
- 📈 **Datenanalyse**: Korrelationen, Schweregrad-Verteilung und Lag-Analyse
- 📧 **E-Mail-Benachrichtigungen**: Tägliche Risiko-Warnungen
- 🌍 **Geolokation**: Automatische Erfassung und Anpassung des Standorts
- 🚀 **Zero-Auth**: Entwickelt für eine einzelne Person, kein Authentifizierungssystem erforderlich

## Tech Stack

- **Frontend**: Next.js 14+ (App Router), TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes
- **Datenbank**: Supabase (PostgreSQL)
- **Wetterdaten**: Open-Meteo API (kostenlos, kein API-Key erforderlich)
- **E-Mail**: Nodemailer (SMTP)
- **Hosting**: Vercel

## Voraussetzungen

- Node.js 18+
- Ein Supabase-Projekt
- SMTP-Konfiguration (Gmail, Outlook, etc.)

## Installation

### 1. Supabase einrichten

1. Erstellen Sie ein Projekt auf [supabase.com](https://supabase.com)
2. Gehen Sie zum SQL-Editor
3. Kopieren Sie den Inhalt von `supabase_migration.sql` und führen Sie das Skript aus
4. Notieren Sie Ihre `SUPABASE_URL` und `SUPABASE_ANON_KEY` aus den Projekteinstellungen

### 2. Environment-Variablen konfigurieren

Erstellen Sie eine `.env.local` Datei im Projektroot:

```env
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key

# SMTP (E-Mail)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Vercel Cron Secret (für Vercel Cron Jobs)
CRON_SECRET=your-secure-random-secret
```

### 3. Dependencies installieren

```bash
npm install
```

### 4. Entwicklungsserver starten

```bash
npm run dev
```

Öffnen Sie [http://localhost:3000](http://localhost:3000) in Ihrem Browser.

## SMTP-Konfiguration

### Gmail-Beispiel

1. Aktivieren Sie 2-Faktor-Authentifizierung in Ihrem Google-Konto
2. Generieren Sie ein [App-Passwort](https://myaccount.google.com/apppasswords)
3. Verwenden Sie dann:
   ```
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your-email@gmail.com
   SMTP_PASS=your-16-character-app-password
   ```

### Outlook-Beispiel

```
SMTP_HOST=smtp.outlook.com
SMTP_PORT=587
SMTP_USER=your-email@outlook.com
SMTP_PASS=your-password
```

## Deployment auf Vercel

### 1. GitHub-Repository vorbereiten

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/your-username/migrainecast.git
git push -u origin main
```

### 2. Auf Vercel deployen

1. Gehen Sie zu [vercel.com](https://vercel.com)
2. Importieren Sie Ihr GitHub-Repository
3. Konfigurieren Sie die Umgebungsvariablen:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `SMTP_HOST`
   - `SMTP_PORT`
   - `SMTP_USER`
   - `SMTP_PASS`
   - `NEXT_PUBLIC_APP_URL` (Ihre Vercel-Domain)
   - `CRON_SECRET` (Sicheres Passwort für Cron-Jobs)
4. Deployen Sie

### 3. Cron-Jobs aktivieren

Die tägliche Risiko-Warnung läuft automatisch unter `/api/cron/daily-warning`

Der Cron-Job ist für **täglich um 8:00 UTC** konfiguriert (siehe `vercel.json`)

## Datenschutz & Sicherheit

- **Keine Cloud-Analyse**: Alle Daten bleiben in Ihrer Supabase-Instanz
- **Offline-First**: Viele Berechnungen laufen lokal
- **Einfache Sicherheit**: Für Single-User-Setup. Für Multi-User verwenden Sie Supabase Authentication
- **KRII-Transparenz**: Die Gewichtungen sind öffentlich (konfigurierbar in `lib/krii-config.ts`)

## KRII-Kurzbuch

Der **KRII (Kopfschmerzrisiko-Index)** kombiniert mehrere Faktoren:

### Wetterfaktoren (~60%)
- **Luftdruck**: Lag-gewichtete Änderungen (48h > 24h > 6h)
- **Temperatur**: Absolute Hitzeauswirkung + Veränderungen
- **Luftqualität**: PM2.5, NO2, Ozone
- **Weiteres**: UV-Index, Windgeschwindigkeit, Luftfeuchtigkeit

### Persönliche Faktoren (~40%)
- **Schlaf**: Sigmoid-normalisierte Abweichung vom Durchschnitt
- **Stress**: 1-5 Skala
- **Neurodivergenz**: Sensorische Überlastung, Masking, soziale Erschöpfung, Überreizung
- **Weiteres**: Alkohol, Koffeinentzug, Mahlzeiten, Flüssigkeitszufuhr

**Risikostufen**:
- 🟢 **Niedrig**: < 30%
- 🟡 **Mittel**: 30-60%
- 🔴 **Hoch**: > 60%

## Projektstruktur

```
app/
├── page.tsx              # Dashboard
├── journal/page.tsx      # Tagebuch
├── analysis/page.tsx     # Analyse
├── settings/page.tsx     # Einstellungen
└── api/
	├── weather/route.ts
	├── air-quality/route.ts
	├── send-email/route.ts
	└── cron/daily-warning/route.ts

components/
├── dashboard/
│   ├── MigraineIndicator.tsx
│   ├── WeatherSummary.tsx
│   ├── RiskAlert.tsx
│   ├── HourlyTable.tsx
│   └── DailyForecast.tsx
├── journal/
│   ├── JournalForm.tsx
│   ├── JournalList.tsx
│   └── EventDetail.tsx
└── analysis/
	├── CorrelationTable.tsx
	├── SeverityChart.tsx
	├── LagAnalysis.tsx
	└── NeurodivergenceChart.tsx

lib/
├── krii.ts              # KRII-Berechnung
├── krii-config.ts       # Konfigurationen
├── supabase.ts          # Datenbank-Utilities
├── weather.ts           # Wetter-API
├── air-quality.ts       # Luftqualität-API
└── email.ts             # E-Mail-Utilities

types/
└── index.ts             # TypeScript-Interfaces
```

## FAQ

### Was ist der KRII?
Der KRII ist ein proprietary Risiko-Index, der Ihre persönlichen Migräne-Muster mit Wetterdaten kombiniert. Er wird personalisiert, je mehr Einträge Sie machen.

### Können meine Daten offline gespeichert werden?
Derzeit nicht, aber Sie könnten einen lokalen IndexedDB-Layer hinzufügen. Supabase speichert alle Daten verschlüsselt.

### Kann ich das Modell verbessern?
Ja! Nach ~50 Einträgen können Sie XGBoost oder ein ähnliches ML-Modell trainieren, um die KRII-Gewichte zu optimieren.

## Lizenz

MIT License - siehe LICENSE Datei für Details

## Support & Kontakt

Für Fragen oder Probleme erstellen Sie ein Issue im GitHub-Repository. Für größere Änderungen öffnen Sie bitte zuerst ein Issue zur Diskussion.

---

Viel Erfolg mit MigraineCast! 💜

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
