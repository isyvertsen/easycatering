"""Service for documentation chatbot with OpenAI integration."""
from typing import List, Dict, Any
import openai
from app.core.config import settings


# User documentation content - focused on how to use the system
USER_DOCS = """# Brukerveiledning for LKC-systemet

## Kom i gang

### Innlogging
1. Gå til systemets nettside
2. Klikk "Logg inn med Google" eller skriv inn e-post og passord
3. Første gang må en administrator godkjenne kontoen din

## Navigering
Menyen ligger på venstre side og inneholder:
- **Hjem**: Oversikt og dashboard
- **Kunder**: Kundeadministrasjon
- **Ordrer**: Ordrehåndtering
- **Menyer**: Ukemenyer og menyplanlegging
- **Oppskrifter**: Oppskriftsbibliotek
- **Produkter**: Produktkatalog
- **Etiketter**: Etikettdesign og utskrift
- **Rapporter**: Statistikk og rapporter
- **Innstillinger**: Systeminnstillinger

---

## Oppskrifter

### Opprette en ny oppskrift/rett
1. Klikk på **Oppskrifter** i menyen
2. Klikk på **"Ny oppskrift"**-knappen øverst til høyre
3. Fyll inn oppskriftsinformasjon:
   - **Navn**: Gi retten et beskrivende navn (f.eks. "Kyllinggryte med ris")
   - **Beskrivelse**: Kort beskrivelse av retten
   - **Kategori**: Velg kategori (Hovedrett, Dessert, etc.)
   - **Porsjoner**: Antall porsjoner oppskriften gir

### Legge til ingredienser
1. I oppskriftsskjemaet, finn seksjonen **"Ingredienser"**
2. Klikk **"Legg til ingrediens"**
3. Søk etter produktet i produktkatalogen
4. Angi mengde og enhet (gram, stk, dl, etc.)
5. Gjenta for alle ingredienser

### Næringsverdier
- Næringsverdier beregnes **automatisk** basert på ingrediensene
- Du kan se næringsverdier per 100g og per porsjon
- Allergener vises basert på ingrediensenes informasjon

### Lagre oppskriften
1. Sjekk at all informasjon er korrekt
2. Klikk **"Lagre"**-knappen
3. Oppskriften er nå tilgjengelig i oppskriftsbiblioteket

---

## Menyer

### Opprette ukemeny
1. Klikk på **Menyer** i menyen
2. Velg **"Ukeplan"** eller **"Ny meny"**
3. Velg uke og år
4. Dra oppskrifter inn i ønsket dag, eller klikk for å legge til

### Menyplanlegging
1. Gå til **Menyer** > **Planlegging**
2. Velg periode (uke/måned)
3. Legg til retter fra oppskriftsbiblioteket
4. Juster porsjoner etter behov

---

## Kunder

### Legge til ny kunde
1. Klikk på **Kunder** i menyen
2. Klikk **"Ny kunde"**
3. Fyll inn kundeinformasjon:
   - Navn
   - Adresse
   - Kontaktperson
   - Telefon/e-post
   - Leveringsadresse (hvis annen)
4. Velg kundegruppe
5. Klikk **"Lagre"**

### Redigere kunde
1. Finn kunden i kundelisten
2. Klikk på kundenavnet eller rediger-ikonet
3. Gjør endringer
4. Klikk **"Lagre"**

---

## Ordrer

### Opprette ny ordre
1. Klikk på **Ordrer** i menyen
2. Klikk **"Ny ordre"**
3. Velg kunde fra listen
4. Velg leveringsdato
5. Legg til produkter/retter:
   - Søk eller velg fra listen
   - Angi antall
6. Klikk **"Lagre ordre"**

### Se ordrehistorikk
1. Gå til **Ordrer**
2. Bruk filtere for å finne ordrer:
   - Dato
   - Kunde
   - Status

---

## Produkter

### Søke etter produkter
1. Klikk på **Produkter** i menyen
2. Bruk søkefeltet øverst
3. Filtrer på kategori om ønskelig

### Legge til nytt produkt
1. Klikk **"Nytt produkt"**
2. Fyll inn produktinformasjon:
   - Navn
   - EAN-kode (strekkode)
   - Kategori
   - Pris
   - Enhet
3. Næringsverdier kan hentes automatisk fra Matinfo
4. Klikk **"Lagre"**

### Matinfo-integrasjon
- Søk etter produkter i Matinfo-databasen
- Importer næringsverdier automatisk
- Gå til **Produkter** > **Matinfo-søk**

---

## Etiketter

### Designe etiketter
1. Klikk på **Etiketter** i menyen
2. Velg en eksisterende mal eller lag ny
3. Bruk designverktøyet til å:
   - Legge til tekst
   - Legge til strekkode
   - Legge til næringsverdier
   - Justere layout

### Skrive ut etiketter
1. Velg produktet/oppskriften
2. Klikk **"Skriv ut etikett"**
3. Velg printer (Zebra eller vanlig)
4. Angi antall
5. Klikk **"Skriv ut"**

---

## Rapporter

### Generere rapporter
1. Klikk på **Rapporter** i menyen
2. Velg rapporttype:
   - Salgsrapport
   - Produktrapport
   - Kundestatistikk
3. Velg periode
4. Klikk **"Generer"**
5. Last ned som PDF eller Excel

---

## Innstillinger

### Tilberedelsesinstruksjoner
- Gå til **Innstillinger** > **Tilberedelsesinstruksjoner**
- Administrer standardinstruksjoner for retter

### Skrivere
- Gå til **Innstillinger** > **Skrivere**
- Konfigurer Zebra-skrivere for etiketter

---

## Tips og triks

### Hurtigtaster
- **Escape**: Lukk dialog/modal
- **Enter**: Bekreft handling

### Vanlige spørsmål

**Hvordan endrer jeg en oppskrift?**
Gå til Oppskrifter, finn oppskriften, klikk på den, og klikk "Rediger".

**Hvordan kopierer jeg en oppskrift?**
Åpne oppskriften og klikk "Kopier" for å lage en kopi du kan redigere.

**Hvordan sletter jeg en ordre?**
Åpne ordren og klikk "Slett". Merk: Dette kan ikke angres.

**Hvordan bytter jeg mellom lyst og mørkt tema?**
Klikk på tema-knappen i sidemenyen (sol/måne-ikon).
"""


class DocumentationChatService:
    """Service for handling documentation chat with OpenAI."""

    def __init__(self):
        self.api_key = settings.OPENAI_API_KEY
        self.model = "gpt-4o"  # Using gpt-4o for faster responses

    def _get_system_prompt(self) -> str:
        """Build system prompt with documentation context."""
        return f"""Du er en hjelpsom brukerstøtte-assistent for Larvik Kommune Catering (LKC) systemet.
Svar alltid på norsk. Vær vennlig, tydelig og hjelpsom.

Du hjelper brukere med å forstå hvordan de bruker systemet i praksis.
Gi steg-for-steg instruksjoner når det er relevant.

{USER_DOCS}

REGLER:
1. Svar basert på brukerdokumentasjonen over
2. Gi praktiske, steg-for-steg instruksjoner
3. Bruk enkel og forståelig norsk
4. Hvis du ikke finner svaret, si det ærlig og foreslå å kontakte support
5. Formater svar med markdown for lesbarhet
6. Hold svar konsise men komplette"""

    async def chat(
        self,
        message: str,
        conversation_history: List[Dict[str, str]] = None
    ) -> Dict[str, Any]:
        """
        Process a chat message and return AI response.

        Args:
            message: User's message
            conversation_history: Previous messages in the conversation

        Returns:
            {
                "success": bool,
                "message": str,
                "error": Optional[str]
            }
        """
        if not self.api_key:
            return {
                "success": False,
                "message": "",
                "error": "AI er ikke konfigurert. Kontakt administrator."
            }

        # Build messages for OpenAI
        messages = [{"role": "system", "content": self._get_system_prompt()}]

        # Add conversation history (limit to last 10 messages to avoid token overflow)
        if conversation_history:
            messages.extend(conversation_history[-10:])

        # Add current user message
        messages.append({"role": "user", "content": message})

        try:
            client = openai.OpenAI(api_key=self.api_key)

            response = client.chat.completions.create(
                model=self.model,
                messages=messages,
                temperature=0.3,  # Low temperature for factual responses
                max_tokens=1000
            )

            ai_response = response.choices[0].message.content

            return {
                "success": True,
                "message": ai_response,
                "error": None
            }

        except openai.APIError as e:
            print(f"[Documentation Chat] OpenAI API error: {e}")
            return {
                "success": False,
                "message": "",
                "error": f"AI-tjenesten er midlertidig utilgjengelig. Prøv igjen senere."
            }

        except Exception as e:
            print(f"[Documentation Chat] Unexpected error: {e}")
            return {
                "success": False,
                "message": "",
                "error": "En uventet feil oppstod. Prøv igjen."
            }


# Singleton
_documentation_chat_service = None


def get_documentation_chat_service() -> DocumentationChatService:
    """Get or create documentation chat service singleton."""
    global _documentation_chat_service
    if _documentation_chat_service is None:
        _documentation_chat_service = DocumentationChatService()
    return _documentation_chat_service
