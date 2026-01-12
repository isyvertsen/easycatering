# WYSIWYG Alternativer for Rapportdesign (Open Source)

**VIKTIG:** Ingen Microsoft-teknologi eller betalte programmer!

## Nåværende løsning (anbefalt å starte med)

### HTML + CSS direkte redigering
- ✅ **100% gratis og open source**
- ✅ Full kontroll over design
- ✅ Versjonskontroll med Git
- ✅ Ingen avhengigheter

**Workflow:**
```bash
# 1. Rediger HTML i VS Code / Cursor
code app/templates/reports/produktliste.html

# 2. Åpne i nettleser for preview
open app/templates/reports/produktliste.html

# 3. Test PDF-generering via API
curl http://localhost:8000/api/v1/report-generator/produktliste-pdf
```

---

## Open Source WYSIWYG Alternativer

Hvis dere MÅ ha visuell editor, her er **gratis** alternativer:

### Alternativ 1: GrapesJS (Anbefalt for web)

**Hva er det:**
- Open source HTML/CSS editor
- Drag-and-drop komponenter
- Kan integreres i admin-panel

**Implementering:**
```javascript
// Frontend: Admin-panel for template-redigering
import grapesjs from 'grapesjs'

const editor = grapesjs.init({
  container: '#gjs',
  fromElement: true,
  storageManager: false,
  plugins: ['gjs-preset-newsletter'], // For rapport-layout
})

// Lagre HTML til backend
const html = editor.getHtml()
const css = editor.getCss()
```

**Pros:**
- ✅ Gratis og open source (BSD-3)
- ✅ Kan bygges inn i LKC admin-panel
- ✅ Live preview
- ✅ Responsive design

**Cons:**
- ❌ Krever utviklingstid (1-2 dager)
- ❌ Bruker må lære grensesnitt

**Estimat:** 2-3 dager implementering

---

### Alternativ 2: Unlayer (Gratis versjon)

**Hva er det:**
- Email/rapport designer
- Drag-and-drop
- Export til HTML

**Implementering:**
```javascript
unlayer.init({
  displayMode: 'email',
  appearance: {
    theme: 'light',
  }
})

unlayer.exportHtml((data) => {
  const { html } = data
  // Send til backend for lagring
})
```

**Pros:**
- ✅ Gratis tier tilgjengelig
- ✅ Veldig enkel å bruke
- ✅ Ferdig løsning

**Cons:**
- ⚠️ Gratis versjon har begrensninger
- ⚠️ Ikke helt open source (proprietær)

**Estimat:** 1 dag implementering

---

### Alternativ 3: LibreOffice som template designer

**Hva er det:**
- Open source Office-pakke
- Kan lage templates i Writer/Calc
- Konverter til PDF via LibreOffice headless

**Implementering:**
```python
# Installer LibreOffice headless
# apt-get install libreoffice --no-install-recommends

# Python-kode
import subprocess

def generate_pdf_from_odt(template_path: str, data: dict) -> bytes:
    """Generer PDF fra LibreOffice template."""
    # 1. Fyll ut template med data (via python-docx eller odfpy)
    # 2. Konverter til PDF med LibreOffice
    subprocess.run([
        'libreoffice',
        '--headless',
        '--convert-to', 'pdf',
        '--outdir', output_dir,
        filled_template_path
    ])

    return pdf_bytes
```

**Pros:**
- ✅ 100% gratis og open source
- ✅ Ikke-teknikere kan bruke LibreOffice Writer
- ✅ Lik Microsoft Word (kjent grensesnitt)

**Cons:**
- ❌ Krever LibreOffice installert på server
- ❌ Tungvint å fylle ut templates programmatisk
- ❌ Mindre fleksibelt enn HTML

**Estimat:** 2-3 dager implementering

---

### Alternativ 4: Paged.js + Visual HTML Editor

**Hva er det:**
- HTML → PDF med Paged.js
- Bruk standard HTML-editor (f.eks. TinyMCE)
- Bedre CSS-støtte enn weasyprint

**Implementering:**
```python
# Installer Paged.js CLI
# npm install -g pagedjs-cli

# Python-kode
import subprocess

def generate_pdf_with_pagedjs(html: str) -> bytes:
    """Generer PDF med Paged.js."""
    subprocess.run([
        'pagedjs-cli',
        input_html,
        '-o', output_pdf
    ])

    return pdf_bytes
```

**Frontend: TinyMCE editor**
```javascript
import { Editor } from '@tinymce/tinymce-react'

<Editor
  apiKey='opensource' // Gratis open source versjon
  init={{
    height: 500,
    menubar: false,
    plugins: ['table', 'lists', 'code'],
    toolbar: 'undo redo | formatselect | bold italic | table'
  }}
  onEditorChange={(content) => {
    // Send HTML til backend
  }}
/>
```

**Pros:**
- ✅ 100% open source
- ✅ Bedre CSS-støtte enn weasyprint
- ✅ Kjent HTML-editor for brukere

**Cons:**
- ❌ Mer kompleks setup
- ❌ Krever Node.js på server

**Estimat:** 3-4 dager implementering

---

## Sammenligning

| Alternativ | Kostnad | Open Source | Brukervennlighet | Implementeringstid | Vedlikehold |
|-----------|---------|-------------|------------------|-------------------|-------------|
| **HTML direkte** | Gratis | ✅ 100% | ⭐⭐ | 0 dager (ferdig) | Lavt |
| **GrapesJS** | Gratis | ✅ 100% | ⭐⭐⭐⭐ | 2-3 dager | Medium |
| **LibreOffice** | Gratis | ✅ 100% | ⭐⭐⭐⭐⭐ | 2-3 dager | Høyt |
| **Paged.js + TinyMCE** | Gratis | ✅ 100% | ⭐⭐⭐⭐ | 3-4 dager | Medium |

---

## Min anbefaling

### Fase 1: Start med HTML (NÅVÆRENDE)
- Bruk nåværende løsning (HTML + CSS)
- Design templates i VS Code/Cursor
- Preview i nettleser
- Test ofte med API

**Når:** Nå, for de første 5-10 rapportene

### Fase 2: Vurder WYSIWYG senere
- Når dere har 10+ rapporter
- Når ikke-teknikere skal lage rapporter
- Velg **GrapesJS** (enklest å integrere)

**Når:** Om 2-3 måneder, når behovet er klart

---

## Praktisk workflow (uten WYSIWYG)

### Steg 1: Design i nettleser

**Opprett test-HTML med mock data:**

```html
<!-- test_produktliste.html -->
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        /* Kopier CSS fra eksisterende templates */
        @page { size: A4; margin: 2cm; }
        body { font-family: Arial; font-size: 11pt; }
        table { width: 100%; border-collapse: collapse; }
        th { background: #2c5282; color: white; padding: 10px; }
        td { padding: 8px; border-bottom: 1px solid #ddd; }
    </style>
</head>
<body>
    <h1>PRODUKTLISTE</h1>

    <table>
        <tr>
            <th>Produktnavn</th>
            <th>Pris</th>
        </tr>
        <!-- MOCK DATA for design -->
        <tr>
            <td>Ost Norvegia</td>
            <td>kr 89.90</td>
        </tr>
        <tr>
            <td>Melk Helmelk</td>
            <td>kr 25.50</td>
        </tr>
        <tr>
            <td>Brød Grovbrød</td>
            <td>kr 32.00</td>
        </tr>
    </table>
</body>
</html>
```

**Åpne i nettleser:**
```bash
open test_produktliste.html
```

**Juster design:** Rediger CSS, refresh nettleser, gjenta.

### Steg 2: Konverter til Jinja2 template

**Erstatt mock data med Jinja2:**

```html
<table>
    <tr>
        <th>Produktnavn</th>
        <th>Pris</th>
    </tr>
    {% for produkt in produkter %}
    <tr>
        <td>{{ produkt.navn }}</td>
        <td>kr {{ "%.2f"|format(produkt.pris) }}</td>
    </tr>
    {% endfor %}
</table>
```

**Lagre som:**
```
app/templates/reports/produktliste.html
```

### Steg 3: Test med ekte data

```bash
# Start backend
./scripts/start-dev.sh

# Test endpoint
curl -o test.pdf http://localhost:8000/api/v1/report-generator/produktliste-pdf

# Åpne PDF
open test.pdf
```

### Steg 4: Iterer

- Ser noe feil? → Juster HTML/CSS → Test igjen
- Mangler data? → Juster resolver → Test igjen
- Formatering feil? → Juster Jinja2 → Test igjen

---

## VS Code Extensions (Gratis)

For bedre utvikleropplevelse:

### 1. HTML CSS Support
- Autocomplete for CSS i HTML
- `ecmel.vscode-html-css`

### 2. Jinja Template Highlighting
- Syntax highlighting for Jinja2
- `samuelcolvin.jinjahtml`

### 3. Live Server
- Live preview av HTML (med hot reload)
- `ritwickdey.LiveServer`

### 4. HTML Preview
- Preview HTML i VS Code
- `george-alisson.html-preview-vscode`

**Installer:**
```bash
code --install-extension ecmel.vscode-html-css
code --install-extension samuelcolvin.jinjahtml
code --install-extension ritwickdey.LiveServer
```

---

## Hvis dere ABSOLUTT vil ha WYSIWYG nå

Jeg anbefaler **GrapesJS** fordi:

### Implementeringsplan (2-3 dager):

**Dag 1: Backend**
- Lag endpoint for å lagre/hente templates
- Database-tabell for templates
- Validation av HTML/CSS

**Dag 2: Frontend**
- Integrer GrapesJS i admin-panel
- UI for å velge template
- Test lagring/henting

**Dag 3: Testing og polering**
- Test at PDF-generering fungerer
- Dokumentasjon for brukere
- Opplæring

### Kode-eksempel:

**Backend endpoint:**
```python
@router.post("/templates")
async def save_template(
    name: str,
    html: str,
    css: str,
    db: AsyncSession = Depends(get_db)
):
    """Lagre rapport-template."""
    template = Template(
        name=name,
        html=html,
        css=css
    )
    db.add(template)
    await db.commit()
    return {"success": True}
```

**Frontend GrapesJS:**
```typescript
import grapesjs from 'grapesjs'

const editor = grapesjs.init({
  container: '#gjs',
  height: '700px',
  storageManager: {
    type: 'remote',
    autosave: true,
    urlStore: '/api/v1/templates',
    urlLoad: '/api/v1/templates/:id',
  },
})
```

---

## Konklusjon

**For nå:** Bruk HTML-redigering direkte
- Raskest å komme i gang
- Null ekstra kostnader
- Full kontroll

**For fremtiden:** Vurder GrapesJS hvis:
- Ikke-teknikere skal lage mange rapporter
- Trenger rask template-produksjon
- Budget for 2-3 dagers utvikling

**Vil du at jeg implementerer GrapesJS-løsningen?** 🤔
