"""Order status service - consolidated order status management.

This service provides a single source of truth for all order status updates,
ensuring consistent workflow logic across the application.
"""
from typing import List, Optional, Tuple, Dict, Any
from datetime import datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.ordrer import Ordrer


# Order status codes (from tblordrestatus)
class OrderStatus:
    """Standard order status codes."""
    NY = 1                    # Ny bestilling
    UNDER_BEHANDLING = 2      # Under behandling
    GODKJENT = 3              # Godkjent
    LEVERT = 4                # Levert
    STARTET = 10              # Draft/Startet
    BESTILT = 15              # Bestilt (webshop)
    PAKKLISTE_SKREVET = 35    # Pakkliste skrevet
    GODKJENT_AV_MOTTAKER = 80 # Godkjent av mottaker
    FOR_SEN_KANSELLERING = 98 # For sen kansellering
    KANSELLERT = 99           # Kansellert


# Human-readable status names
STATUS_NAMES: Dict[int, str] = {
    OrderStatus.NY: "Ny",
    OrderStatus.UNDER_BEHANDLING: "Under behandling",
    OrderStatus.GODKJENT: "Godkjent",
    OrderStatus.LEVERT: "Levert",
    OrderStatus.STARTET: "Startet",
    OrderStatus.BESTILT: "Bestilt",
    OrderStatus.PAKKLISTE_SKREVET: "Pakkliste skrevet",
    OrderStatus.GODKJENT_AV_MOTTAKER: "Godkjent av mottaker",
    OrderStatus.FOR_SEN_KANSELLERING: "For sen kansellering",
    OrderStatus.KANSELLERT: "Kansellert",
}


class OrderStatusError(Exception):
    """Exception for order status operations."""
    def __init__(self, message: str, status_code: int = 400):
        self.message = message
        self.status_code = status_code
        super().__init__(self.message)


class OrderStatusService:
    """Service for managing order status transitions.

    Provides consistent workflow logic for all order status operations.
    """

    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_order(self, order_id: int) -> Optional[Ordrer]:
        """Get an order by ID."""
        result = await self.db.execute(
            select(Ordrer).where(Ordrer.ordreid == order_id)
        )
        return result.scalar_one_or_none()

    async def update_status(
        self,
        order_id: int,
        status_id: int,
        commit: bool = True
    ) -> Tuple[bool, str]:
        """Update order status with workflow validation.

        Args:
            order_id: The order ID to update
            status_id: The new status ID
            commit: Whether to commit the transaction (default True)

        Returns:
            Tuple of (success: bool, message: str)

        Raises:
            OrderStatusError: If the update is not allowed
        """
        order = await self.get_order(order_id)

        if not order:
            raise OrderStatusError("Ordre ikke funnet", status_code=404)

        if order.kansellertdato:
            raise OrderStatusError(
                "Kan ikke endre status på kansellert ordre",
                status_code=400
            )

        # Apply the status change
        order.ordrestatusid = status_id

        # Handle special status transitions
        if status_id == OrderStatus.LEVERT:
            order.ordrelevert = datetime.now().isoformat()

        if commit:
            await self.db.commit()

        status_name = STATUS_NAMES.get(status_id, "Ukjent")
        return True, f"Ordrestatus endret til {status_name}"

    async def batch_update_status(
        self,
        order_ids: List[int],
        status_id: int,
        skip_cancelled: bool = True,
        commit: bool = True
    ) -> Dict[str, Any]:
        """Batch update order status for multiple orders.

        Args:
            order_ids: List of order IDs to update
            status_id: The new status ID
            skip_cancelled: If True, skip cancelled orders (default True)
            commit: Whether to commit the transaction (default True)

        Returns:
            Dict with results: {updated_count, skipped_count, message}
        """
        # Build query
        query = select(Ordrer).where(Ordrer.ordreid.in_(order_ids))

        if skip_cancelled:
            query = query.where(Ordrer.kansellertdato.is_(None))

        result = await self.db.execute(query)
        orders = result.scalars().all()

        if not orders:
            raise OrderStatusError("Ingen gyldige ordrer funnet", status_code=404)

        updated_count = 0
        for order in orders:
            order.ordrestatusid = status_id

            # Handle special status transitions
            if status_id == OrderStatus.LEVERT:
                order.ordrelevert = datetime.now().isoformat()

            updated_count += 1

        if commit:
            await self.db.commit()

        skipped_count = len(order_ids) - updated_count
        status_name = STATUS_NAMES.get(status_id, "Ukjent")

        return {
            "updated_count": updated_count,
            "skipped_count": skipped_count,
            "message": f"{updated_count} ordrer oppdatert til status '{status_name}'"
        }

    async def cancel_order(
        self,
        order_id: int,
        for_sen: bool = False,
        arsak: Optional[str] = None,
        commit: bool = True
    ) -> Tuple[bool, int]:
        """Cancel an order.

        Args:
            order_id: The order ID to cancel
            for_sen: If True, use status 98 (for sen kansellering), else 99
            arsak: Optional reason for cancellation
            commit: Whether to commit the transaction (default True)

        Returns:
            Tuple of (success: bool, new_status_id: int)
        """
        order = await self.get_order(order_id)

        if not order:
            raise OrderStatusError("Ordre ikke funnet", status_code=404)

        new_status = OrderStatus.FOR_SEN_KANSELLERING if for_sen else OrderStatus.KANSELLERT

        order.kansellertdato = datetime.now()
        order.ordrestatusid = new_status

        if arsak and hasattr(order, 'informasjon'):
            existing_info = order.informasjon or ""
            order.informasjon = f"{existing_info}\nKansellert: {arsak}".strip()

        if commit:
            await self.db.commit()

        return True, new_status

    @staticmethod
    def get_status_name(status_id: int) -> str:
        """Get human-readable status name."""
        return STATUS_NAMES.get(status_id, "Ukjent")
