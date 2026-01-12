"""Asko NY product model.

Asko NY er en produktkatalog fra leverandøren Asko.
'NY' betyr 'nye produkter'.
"""
from sqlalchemy import Column, Text

from app.infrastructure.database.session import Base


class AskoNy(Base):
    """Asko NY product table.

    Produktkatalog fra Asko leverandør.
    """
    __tablename__ = "askony"  # Table name unchanged for database compatibility

    epdnummer = Column(Text, primary_key=True, index=True)
    eannummer = Column(Text)
    varenavn = Column(Text)