"""Service for generating ZPL labels for Zebra printers."""
from datetime import datetime
from typing import List, Dict, Optional, Any
import re


class ZPLLabelGenerator:
    """Generate ZPL labels for Zebra printers (203 DPI, 4x5 inch labels)."""

    # Label dimensions for 203 DPI printer
    LABEL_WIDTH_DOTS = 831  # 104mm at 203 DPI
    LABEL_HEIGHT_DOTS = 1015  # 127mm at 203 DPI
    DPI = 203

    # Margins and spacing
    MARGIN_LEFT = 40  # ~5mm
    MARGIN_RIGHT = 40
    MARGIN_TOP = 40
    MARGIN_BOTTOM = 40

    # Layout sections (Y positions in dots)
    NAME_Y = MARGIN_TOP
    DATE_Y = NAME_Y + 60
    INGREDIENTS_HEADER_Y = DATE_Y + 50
    INGREDIENTS_Y = INGREDIENTS_HEADER_Y + 40
    NUTRITION_Y = 550  # Start of bottom section

    # Column widths
    CONTENT_WIDTH = LABEL_WIDTH_DOTS - MARGIN_LEFT - MARGIN_RIGHT
    COLUMN_WIDTH = CONTENT_WIDTH // 2 - 20  # Two columns with gap

    def __init__(self):
        """Initialize ZPL label generator."""
        pass

    def generate_recipe_label(
        self,
        recipe_name: str,
        ingredients: List[str],
        allergens: List[str],
        nutrition_per_100g: Dict[str, float],
        preparation_info: str = "",
        weight_grams: Optional[float] = None
    ) -> str:
        """
        Generate ZPL code for a recipe label.

        Args:
            recipe_name: Name of the recipe/dish
            ingredients: List of ingredient strings
            allergens: List of allergen names to highlight
            nutrition_per_100g: Dict with nutrition values per 100g
            preparation_info: Preparation/storage instructions
            weight_grams: Total weight in grams

        Returns:
            ZPL code as string
        """
        zpl_commands = []

        # Start label format
        zpl_commands.append("^XA")  # Start format

        # Set label size and encoding
        zpl_commands.append(f"^PW{self.LABEL_WIDTH_DOTS}")  # Print width
        zpl_commands.append(f"^LL{self.LABEL_HEIGHT_DOTS}")  # Label length
        zpl_commands.append("^CI28")  # UTF-8 encoding for æøå characters

        # Add sections
        self._add_name_date_section(zpl_commands, recipe_name)
        self._add_ingredients_section(zpl_commands, ingredients, allergens)
        self._add_nutrition_preparation_section(
            zpl_commands, nutrition_per_100g, preparation_info, weight_grams
        )

        # Add border around entire label
        zpl_commands.append(f"^FO{self.MARGIN_LEFT},{self.MARGIN_TOP}")
        zpl_commands.append(f"^GB{self.CONTENT_WIDTH},{self.LABEL_HEIGHT_DOTS - self.MARGIN_TOP - self.MARGIN_BOTTOM},3^FS")

        # End label format
        zpl_commands.append("^XZ")  # End format

        return "\n".join(zpl_commands)

    def _add_name_date_section(self, commands: List[str], name: str) -> None:
        """
        Add recipe name and production date to top of label.

        Args:
            commands: List to append ZPL commands to
            name: Recipe/dish name
        """
        # Horizontal line under name section
        commands.append(f"^FO{self.MARGIN_LEFT},{self.DATE_Y - 10}")
        commands.append(f"^GB{self.CONTENT_WIDTH},2,2^FS")

        # Recipe name - large, bold, left-aligned
        # Truncate name if too long
        display_name = name[:50] if len(name) > 50 else name
        name_x = self.MARGIN_LEFT + 10

        # Use field block for potential wrapping of long names
        commands.append(f"^FO{name_x},{self.NAME_Y}^A0N,50,40^FB{self.CONTENT_WIDTH},2,0,L^FD{display_name}^FS")

        # Production date - small, left-aligned (no wrapping needed)
        today = datetime.now().strftime("%d.%m.%Y")
        commands.append(f"^FO{name_x},{self.DATE_Y}^A0N,30,25^FDProduksjonsdato: {today}^FS")

    def _add_ingredients_section(
        self, commands: List[str], ingredients: List[str], allergens: List[str]
    ) -> None:
        """
        Add ingredients list with highlighted allergens.

        Args:
            commands: List to append ZPL commands to
            ingredients: List of ingredient strings
            allergens: List of allergen names to highlight
        """
        # Horizontal line above ingredients
        commands.append(f"^FO{self.MARGIN_LEFT},{self.INGREDIENTS_HEADER_Y - 10}")
        commands.append(f"^GB{self.CONTENT_WIDTH},2,2^FS")

        # Section header "Ingredienser:"
        commands.append(f"^FO{self.MARGIN_LEFT + 10},{self.INGREDIENTS_HEADER_Y}^A0N,35,30^FDIngredienser:^FS")

        # Horizontal line below header
        commands.append(f"^FO{self.MARGIN_LEFT},{self.INGREDIENTS_Y - 10}")
        commands.append(f"^GB{self.CONTENT_WIDTH},2,2^FS")

        # Format ingredients text with allergen highlighting
        ingredients_text = self._format_ingredients_for_zpl(ingredients, allergens)

        # Limit to max 15 lines to prevent overflow
        max_chars = 1200  # Approximate character limit
        if len(ingredients_text) > max_chars:
            ingredients_text = ingredients_text[:max_chars] + "..."

        # Ingredients list - use field block for wrapping
        # Use smaller, thinner font to make UPPERCASE allergens stand out more
        # ^FB parameters: width, max_lines, line_spacing, justification
        ingredients_y = self.INGREDIENTS_Y
        commands.append(
            f"^FO{self.MARGIN_LEFT + 10},{ingredients_y}^A0N,24,18"
            f"^FB{self.CONTENT_WIDTH - 20},15,5,L^FD{ingredients_text}^FS"
        )

        # Horizontal line below ingredients (before nutrition section)
        commands.append(f"^FO{self.MARGIN_LEFT},{self.NUTRITION_Y - 20}")
        commands.append(f"^GB{self.CONTENT_WIDTH},2,2^FS")

    def _add_nutrition_preparation_section(
        self,
        commands: List[str],
        nutrition: Dict[str, float],
        preparation_info: str,
        weight_grams: Optional[float]
    ) -> None:
        """
        Add two-column layout: Nutrition (left) | Preparation (right).

        Args:
            commands: List to append ZPL commands to
            nutrition: Nutrition values per 100g
            preparation_info: Preparation/storage instructions
            weight_grams: Total weight in grams
        """
        left_x = self.MARGIN_LEFT + 10
        right_x = self.MARGIN_LEFT + self.COLUMN_WIDTH + 40

        # Vertical separator line between columns
        separator_x = self.MARGIN_LEFT + self.COLUMN_WIDTH + 20
        commands.append(f"^FO{separator_x},{self.NUTRITION_Y}")
        commands.append(f"^GB2,{self.LABEL_HEIGHT_DOTS - self.NUTRITION_Y - self.MARGIN_BOTTOM},2^FS")

        # LEFT COLUMN: Nutrition per 100g
        y_pos = self.NUTRITION_Y

        # Header
        commands.append(f"^FO{left_x},{y_pos}^A0N,30,25^FDNæring per 100g:^FS")
        y_pos += 40

        # Nutrition values - small font
        nutrition_lines = [
            ("Energi", f"{nutrition.get('energi_kj', 0):.0f} kJ / {nutrition.get('energi_kcal', 0):.0f} kcal"),
            ("Fett", f"{nutrition.get('fett', 0):.1f} g"),
            ("  Mettet fett", f"{nutrition.get('mettet_fett', 0):.1f} g"),
            ("Karbohydrat", f"{nutrition.get('karbohydrat', 0):.1f} g"),
            ("  Sukker", f"{nutrition.get('sukker', 0):.1f} g"),
            ("Protein", f"{nutrition.get('protein', 0):.1f} g"),
            ("Salt", f"{nutrition.get('salt', 0):.2f} g"),
        ]

        # Add fiber if present
        if nutrition.get('kostfiber', 0) > 0:
            nutrition_lines.append(("Fiber", f"{nutrition.get('kostfiber', 0):.1f} g"))

        for label, value in nutrition_lines:
            commands.append(f"^FO{left_x},{y_pos}^A0N,22,18^FD{label}: {value}^FS")
            y_pos += 30

        # RIGHT COLUMN: Preparation and weight
        y_pos = self.NUTRITION_Y

        # Preparation header
        commands.append(f"^FO{right_x},{y_pos}^A0N,30,25^FDTilberedning:^FS")
        y_pos += 40

        # Preparation text - wrap to column width
        prep_text = preparation_info if preparation_info else "Oppbevares kjølig.\\&Oppvarmes til 75°C."

        # Truncate if too long
        max_prep_chars = 200
        if len(prep_text) > max_prep_chars:
            prep_text = prep_text[:max_prep_chars] + "..."

        # Use field block for text wrapping
        # Replace newlines with ZPL line breaks
        prep_text_zpl = prep_text.replace('\n', '\\&')

        commands.append(
            f"^FO{right_x},{y_pos}^A0N,22,18"
            f"^FB{self.COLUMN_WIDTH},8,5,L^FD{prep_text_zpl}^FS"
        )

        # Weight at bottom of right column
        if weight_grams and weight_grams > 0:
            weight_y = self.LABEL_HEIGHT_DOTS - self.MARGIN_BOTTOM - 60
            commands.append(f"^FO{right_x},{weight_y}^A0N,28,24^FDVekt: {weight_grams:.0f}g^FS")

    def _format_ingredients_for_zpl(
        self, ingredients: List[str], allergens: List[str]
    ) -> str:
        """
        Format ingredients list with allergen highlighting using UPPERCASE.

        Allergens are shown in UPPERCASE to make them stand out from regular ingredients.
        This is the standard approach for food labeling.

        Args:
            ingredients: List of ingredient strings
            allergens: List of allergen names to highlight

        Returns:
            Formatted ingredients string with allergens in UPPERCASE
        """
        # Join ingredients
        ingredients_text = ", ".join(ingredients)

        print(f"DEBUG ZPL Format - Original text: {ingredients_text}")
        print(f"DEBUG ZPL Format - Allergens to highlight: {allergens}")

        # Highlight allergens by converting to UPPERCASE
        for allergen in allergens:
            # Case-insensitive replacement, replace with UPPERCASE
            # Use word boundaries to avoid partial matches
            pattern = re.compile(r'\b(' + re.escape(allergen) + r')\b', re.IGNORECASE)

            # Replace with UPPERCASE version
            before = ingredients_text
            ingredients_text = pattern.sub(lambda m: m.group(1).upper(), ingredients_text)

            if before != ingredients_text:
                print(f"DEBUG ZPL Format - Replaced '{allergen}' in text")
            else:
                print(f"DEBUG ZPL Format - No match found for '{allergen}'")

        print(f"DEBUG ZPL Format - Final text: {ingredients_text}")
        return ingredients_text


# Singleton instance
_zpl_generator: Optional[ZPLLabelGenerator] = None


def get_zpl_label_generator() -> ZPLLabelGenerator:
    """Get singleton ZPL label generator instance."""
    global _zpl_generator
    if _zpl_generator is None:
        _zpl_generator = ZPLLabelGenerator()
    return _zpl_generator
