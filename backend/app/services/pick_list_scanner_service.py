"""Service for AI-powered pick list scanning using GPT-4o Vision."""
import json
import base64
from typing import Optional, Dict, Any, List
import openai
from app.core.config import settings


class PickListScannerService:
    """Service for analyzing scanned pick lists with AI Vision."""

    def __init__(self):
        self.api_key = settings.OPENAI_API_KEY
        self.model = "gpt-4o"  # GPT-4o has vision capabilities

    async def analyze_pick_list_image(
        self,
        image_base64: str,
        order_lines: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Analyze a scanned pick list image and extract picked quantities.

        Args:
            image_base64: Base64 encoded image (without data:image prefix)
            order_lines: List of order lines with {produktid, unik, produktnavn, antall}

        Returns:
            {
                "success": bool,
                "lines": [{produktid, unik, plukket_antall}, ...],
                "confidence": float,  # 0.0 to 1.0
                "notes": str,  # Any issues or observations
                "error": Optional[str]
            }
        """
        if not self.api_key:
            return {
                "success": False,
                "error": "AI ikke konfigurert. Sett OPENAI_API_KEY i miljøvariabler.",
                "lines": [],
                "confidence": 0.0,
                "notes": ""
            }

        # Build product list for context
        products_context = "Produkter på ordren:\n"
        for line in order_lines:
            products_context += f"- ID {line['produktid']}/{line['unik']}: {line['produktnavn']} (bestilt: {line['antall']})\n"

        system_prompt = """Du er en ekspert på å lese utfylte plukklister fra lager.
Din oppgave er å analysere et bilde av en utfylt plukkliste og finne faktisk plukket mengde for hvert produkt.

VIKTIGE REGLER:
1. Se etter håndskrevne tall, avkryssinger eller endringer ved siden av hvert produkt
2. Hvis et produkt har en avkryssing uten endring, anta at bestilt mengde ble plukket
3. Hvis et tall er skrevet over eller ved siden av bestilt mengde, bruk det nye tallet
4. Hvis du ikke kan lese mengden for et produkt, bruk bestilt mengde som standard
5. Vær oppmerksom på strykninger eller rettelser

Returner ALLTID et gyldig JSON-objekt med følgende format:
{
    "lines": [
        {"produktid": <int>, "unik": <int>, "plukket_antall": <float>},
        ...
    ],
    "confidence": <float mellom 0.0 og 1.0>,
    "notes": "<eventuelle observasjoner eller problemer>"
}

Confidence-nivåer:
- 1.0: Alle verdier er tydelig lesbare
- 0.8: De fleste verdier er lesbare, noen antatt
- 0.5: Mange verdier er usikre
- 0.3: Svært vanskelig å lese, de fleste er gjetninger"""

        user_prompt = f"""{products_context}

Analyser bildet og finn plukket mengde for hvert produkt. Returner JSON med produktid, unik og plukket_antall for hver linje."""

        try:
            client = openai.OpenAI(api_key=self.api_key)

            # Ensure image has proper prefix for API
            if not image_base64.startswith("data:"):
                image_base64 = f"data:image/jpeg;base64,{image_base64}"

            response = client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {
                        "role": "user",
                        "content": [
                            {"type": "text", "text": user_prompt},
                            {
                                "type": "image_url",
                                "image_url": {"url": image_base64}
                            }
                        ]
                    }
                ],
                max_tokens=2000,
                temperature=0.1,  # Low temperature for more consistent results
            )

            response_text = response.choices[0].message.content.strip()

            # Try to parse JSON from response
            try:
                # Handle markdown code blocks
                if "```json" in response_text:
                    response_text = response_text.split("```json")[1].split("```")[0]
                elif "```" in response_text:
                    response_text = response_text.split("```")[1].split("```")[0]

                result = json.loads(response_text)

                # Validate and fill in missing products with default values
                scanned_lines = {(l["produktid"], l["unik"]): l["plukket_antall"] for l in result.get("lines", [])}

                complete_lines = []
                for line in order_lines:
                    key = (line["produktid"], line["unik"])
                    plukket = scanned_lines.get(key, line["antall"])
                    complete_lines.append({
                        "produktid": line["produktid"],
                        "unik": line["unik"],
                        "plukket_antall": float(plukket)
                    })

                return {
                    "success": True,
                    "lines": complete_lines,
                    "confidence": float(result.get("confidence", 0.5)),
                    "notes": result.get("notes", "")
                }

            except json.JSONDecodeError:
                # If JSON parsing fails, return defaults with low confidence
                return {
                    "success": True,
                    "lines": [
                        {
                            "produktid": line["produktid"],
                            "unik": line["unik"],
                            "plukket_antall": float(line["antall"])
                        }
                        for line in order_lines
                    ],
                    "confidence": 0.3,
                    "notes": "Kunne ikke tolke AI-respons. Bruker bestilte mengder som standard."
                }

        except openai.APIError as e:
            return {
                "success": False,
                "error": f"OpenAI API-feil: {str(e)}",
                "lines": [],
                "confidence": 0.0,
                "notes": ""
            }
        except Exception as e:
            return {
                "success": False,
                "error": f"Uventet feil: {str(e)}",
                "lines": [],
                "confidence": 0.0,
                "notes": ""
            }


# Singleton instance
_pick_list_scanner_service: Optional[PickListScannerService] = None


def get_pick_list_scanner_service() -> PickListScannerService:
    """Get or create the pick list scanner service singleton."""
    global _pick_list_scanner_service
    if _pick_list_scanner_service is None:
        _pick_list_scanner_service = PickListScannerService()
    return _pick_list_scanner_service
