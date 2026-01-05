"""Service for generating PDF labels for recipes and dishes."""
from datetime import datetime
from io import BytesIO
from typing import List, Dict, Any
from reportlab.lib.pagesizes import mm
from reportlab.lib.units import mm as MM
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_LEFT, TA_CENTER
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Frame, PageTemplate
from reportlab.lib import colors
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont


# Label dimensions
LABEL_WIDTH = 104 * MM
LABEL_HEIGHT = 127 * MM


class LabelGenerator:
    """Generate PDF labels for food items."""

    def __init__(self):
        self.styles = getSampleStyleSheet()
        self._setup_custom_styles()

    def _setup_custom_styles(self):
        """Setup custom paragraph styles."""
        # Title style
        self.styles.add(ParagraphStyle(
            name='LabelTitle',
            parent=self.styles['Heading1'],
            fontSize=14,
            leading=16,
            alignment=TA_CENTER,
            spaceAfter=6,
            textColor=colors.black,
            fontName='Helvetica-Bold'
        ))

        # Date style
        self.styles.add(ParagraphStyle(
            name='LabelDate',
            parent=self.styles['Normal'],
            fontSize=8,
            leading=10,
            alignment=TA_CENTER,
            spaceAfter=8,
            textColor=colors.grey
        ))

        # Section header
        self.styles.add(ParagraphStyle(
            name='SectionHeader',
            parent=self.styles['Heading2'],
            fontSize=10,
            leading=12,
            alignment=TA_LEFT,
            spaceAfter=4,
            textColor=colors.black,
            fontName='Helvetica-Bold'
        ))

        # Body text - reduced size
        self.styles.add(ParagraphStyle(
            name='LabelBody',
            parent=self.styles['Normal'],
            fontSize=7,
            leading=8,
            alignment=TA_LEFT,
            spaceAfter=1
        ))

        # Small text for nutrition - reduced size
        self.styles.add(ParagraphStyle(
            name='SmallText',
            parent=self.styles['Normal'],
            fontSize=6,
            leading=7,
            alignment=TA_LEFT
        ))

    def generate_recipe_label(
        self,
        recipe_name: str,
        ingredients: List[Dict[str, Any]],
        allergens: List[str],
        nutrition_per_100g: Dict[str, float],
        preparation_info: str = "",
        weight_grams: float = 0
    ) -> BytesIO:
        """
        Generate a PDF label for a recipe.

        Args:
            recipe_name: Name of the recipe
            ingredients: List of ingredients with name and amount
            allergens: List of allergen names to highlight
            nutrition_per_100g: Nutrition values per 100g
            preparation_info: Preparation/storage instructions
            weight_grams: Total weight in grams

        Returns:
            BytesIO buffer containing the PDF
        """
        buffer = BytesIO()

        # Create PDF with custom page size
        doc = SimpleDocTemplate(
            buffer,
            pagesize=(LABEL_WIDTH, LABEL_HEIGHT),
            rightMargin=5*MM,
            leftMargin=5*MM,
            topMargin=5*MM,
            bottomMargin=5*MM
        )

        # Build content
        story = []

        # Top half: Ingredients section with NAME and DATE integrated
        # 50mm to fit within 104x127mm label
        today = datetime.now().strftime('%d.%m.%Y')
        ingredients_text = self._format_ingredients(ingredients, allergens)
        ingredients_table = self._create_unified_ingredients_section(recipe_name, today, ingredients_text)
        story.append(ingredients_table)

        # Minimal spacer between sections
        story.append(Spacer(1, 0.5*MM))

        # Bottom half: Nutrition and Preparation side by side
        # 50mm to match top - total 100.5mm + 10mm margins = 110.5mm < 127mm
        bottom_table = self._create_bottom_section(nutrition_per_100g, preparation_info, weight_grams)
        story.append(bottom_table)

        # Build PDF
        doc.build(story)
        buffer.seek(0)
        return buffer

    def _create_unified_ingredients_section(self, recipe_name: str, date: str, ingredients_text: str) -> Table:
        """Create unified top section with NAME, DATE and ingredients - takes up half the label."""
        # NAME field with recipe name
        name_para = Paragraph(f"<b>NAVN:</b> {recipe_name}", self.styles['LabelBody'])

        # DATE field labeled as Produksjonsdato
        date_para = Paragraph(f"<b>Produksjonsdato:</b> {date}", self.styles['LabelBody'])

        # Ingredients header
        ing_header = Paragraph("<b>Ingredienser:</b>", self.styles['SectionHeader'])

        # Ingredients text
        ingredients_para = Paragraph(ingredients_text, self.styles['LabelBody'])

        # Create table structure:
        # Row 1: NAME field spanning full width
        # Row 2: DATE field spanning full width
        # Row 3: Ingredients header
        # Row 4: Ingredients content (large space)
        data = [
            [name_para],
            [date_para],
            [ing_header],
            [ingredients_para]
        ]

        # Top section: 50mm total to ensure it fits
        # Distribute: NAME(5mm), DATE(5mm), Header(5mm), Content(35mm)
        table = Table(data, colWidths=[94*MM], rowHeights=[5*MM, 5*MM, 5*MM, 35*MM])
        table.setStyle(TableStyle([
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('LEFTPADDING', (0, 0), (-1, -1), 2),
            ('RIGHTPADDING', (0, 0), (-1, -1), 2),
            ('TOPPADDING', (0, 0), (-1, -1), 2),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
            ('BOX', (0, 0), (-1, -1), 1, colors.black),
            ('LINEBELOW', (0, 0), (0, 0), 0.5, colors.grey),  # Line under NAME
            ('LINEBELOW', (0, 1), (0, 1), 0.5, colors.grey),  # Line under DATE
            ('LINEBELOW', (0, 2), (0, 2), 0.5, colors.grey),  # Line under Ingredients header
        ]))

        return table

    def _format_ingredients(self, ingredients: List[Dict[str, Any]], allergens: List[str]) -> str:
        """Format ingredients list with allergens in bold.

        Only highlights exact allergen matches, not partial matches.
        Example: allergen "melk" will NOT highlight "helmelk", only "melk"
        """
        allergen_names_lower = [a.lower().strip() for a in allergens]

        formatted_ingredients = []
        for ing in ingredients:
            name = ing.get('name', ing.get('ingrediensnavn', ''))

            # Check if ingredient name matches an allergen (exact match or allergen is in the name as a word)
            name_lower = name.lower().strip()

            # Exact match check - ingredient name equals allergen name
            is_allergen = name_lower in allergen_names_lower

            # If not exact match, check if any allergen is a complete word in the ingredient name
            if not is_allergen:
                for allergen in allergen_names_lower:
                    # Check if allergen appears as a complete word (not substring)
                    # e.g., "melk" should match "melk" but not "helmelk"
                    import re
                    pattern = r'\b' + re.escape(allergen) + r'\b'
                    if re.search(pattern, name_lower):
                        is_allergen = True
                        break

            # Format ingredient string - kun navn, ingen mengder
            ing_str = name

            # Make allergens bold
            if is_allergen:
                ing_str = f"<b>{ing_str.upper()}</b>"  # Uppercase allergens for emphasis

            formatted_ingredients.append(ing_str)

        return ", ".join(formatted_ingredients)

    def _create_bottom_section(
        self,
        nutrition_per_100g: Dict[str, float],
        preparation_info: str,
        weight_grams: float
    ) -> Table:
        """Create the bottom section with nutrition and preparation info side by side - half the label."""

        # Nutrition column
        nutrition_text = "<b>Næring per 100g:</b><br/>"
        nutrition_text += f"Energi: {nutrition_per_100g.get('energy_kj', 0):.0f} kJ / {nutrition_per_100g.get('energy_kcal', 0):.0f} kcal<br/>"
        nutrition_text += f"Fett: {nutrition_per_100g.get('fat', 0):.1f}g<br/>"
        nutrition_text += f"- hvorav mettet: {nutrition_per_100g.get('saturated_fat', 0):.1f}g<br/>"
        nutrition_text += f"Karbohydrat: {nutrition_per_100g.get('carbs', 0):.1f}g<br/>"
        nutrition_text += f"- hvorav sukker: {nutrition_per_100g.get('sugars', 0):.1f}g<br/>"
        nutrition_text += f"Protein: {nutrition_per_100g.get('protein', 0):.1f}g<br/>"
        nutrition_text += f"Salt: {nutrition_per_100g.get('salt', 0):.2f}g<br/>"

        if nutrition_per_100g.get('fiber', 0) > 0:
            nutrition_text += f"Fiber: {nutrition_per_100g.get('fiber', 0):.1f}g<br/>"

        # Preparation column
        prep_text = "<b>Tilberedning:</b><br/>"
        if preparation_info:
            prep_text += preparation_info
        else:
            prep_text += "Oppbevares kjølig.<br/>"
            prep_text += "Oppvarmes til 75°C.<br/>"

        if weight_grams > 0:
            prep_text += f"<br/><b>Vekt:</b> {weight_grams:.0f}g"

        # Create table with two columns
        # Bottom section: 50mm to match top and ensure fit
        data = [[
            Paragraph(nutrition_text, self.styles['SmallText']),
            Paragraph(prep_text, self.styles['SmallText'])
        ]]

        table = Table(data, colWidths=[47*MM, 47*MM], rowHeights=[50*MM])
        table.setStyle(TableStyle([
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('LEFTPADDING', (0, 0), (-1, -1), 2),
            ('RIGHTPADDING', (0, 0), (-1, -1), 2),
            ('TOPPADDING', (0, 0), (-1, -1), 2),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
            ('BOX', (0, 0), (-1, -1), 1, colors.black),
            ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.black),
        ]))

        return table


# Singleton instance
_label_generator = None


def get_label_generator() -> LabelGenerator:
    """Get or create the label generator singleton."""
    global _label_generator
    if _label_generator is None:
        _label_generator = LabelGenerator()
    return _label_generator
