"""Tool Executor for AI Workflow Agent.

Executes tools by calling internal services and APIs.
This avoids HTTP overhead by directly invoking service methods.
"""
import logging
from datetime import date, datetime, timedelta
from typing import Any, Dict, List, Optional
from urllib.parse import urlencode

from sqlalchemy import select, func, or_
from sqlalchemy.orm import selectinload, joinedload
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.kunder import Kunder as KunderModel
from app.models.kunde_gruppe import Kundegruppe as KundegruppeModel
from app.models.ordrer import Ordrer as OrdrerModel
from app.models.ordredetaljer import Ordredetaljer as OrdredetaljerModel
from app.models.produkter import Produkter as ProdukterModel
from app.models.kategorier import Kategorier as KategorierModel
from app.models.meny import Meny as MenyModel
from app.models.meny_produkt import MenyProdukt as MenyProduktModel
from app.models.kalkyle import Kalkyle as KalkyleModel
from app.models.leverandorer import Leverandorer as LeverandorerModel

logger = logging.getLogger(__name__)


class ToolExecutor:
    """Executes tools by calling internal services."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def execute(self, tool_name: str, parameters: Dict[str, Any]) -> Any:
        """Execute a tool and return the result.

        Args:
            tool_name: Name of the tool to execute
            parameters: Tool parameters

        Returns:
            Tool execution result

        Raises:
            ValueError: If tool is not found
            Exception: If tool execution fails
        """
        # Map tool names to executor methods
        executors = {
            # Kunder
            "search_customers": self._search_customers,
            "list_customer_groups": self._list_customer_groups,
            "get_customer": self._get_customer,
            "create_customer": self._create_customer,
            # Ordrer
            "search_orders": self._search_orders,
            "get_order": self._get_order,
            "get_todays_orders": self._get_todays_orders,
            "create_order": self._create_order,
            "add_order_line": self._add_order_line,
            "update_order_status": self._update_order_status,
            "cancel_order": self._cancel_order,
            # Produkter
            "search_products": self._search_products,
            "get_product": self._get_product,
            "update_product_price": self._update_product_price,
            # Kategorier
            "list_categories": self._list_categories,
            # Meny
            "list_menus": self._list_menus,
            "get_menu": self._get_menu,
            "add_product_to_menu": self._add_product_to_menu,
            # Oppskrifter
            "search_recipes": self._search_recipes,
            "get_recipe": self._get_recipe,
            # Statistikk
            "get_quick_stats": self._get_quick_stats,
            "get_sales_report": self._get_sales_report,
            "generate_ai_report": self._generate_ai_report,
            # Leverandører
            "list_suppliers": self._list_suppliers,
        }

        executor = executors.get(tool_name)
        if not executor:
            raise ValueError(f"Unknown tool: {tool_name}")

        logger.info(f"Executing tool: {tool_name} with params: {parameters}")
        result = await executor(parameters)

        # Add action links to result
        action_links = self._generate_action_links(tool_name, parameters, result)
        if action_links:
            result["_action_links"] = action_links

        logger.info(f"Tool {tool_name} executed successfully")
        return result

    def _generate_action_links(
        self,
        tool_name: str,
        parameters: Dict[str, Any],
        result: Dict[str, Any]
    ) -> List[Dict[str, str]]:
        """Generate action links based on tool and result."""
        links = []

        if tool_name == "search_customers":
            search = parameters.get("search", "")
            kundegruppe = parameters.get("kundegruppe", "")
            params = {}
            if search:
                params["search"] = search
            if kundegruppe:
                params["kundegruppe"] = kundegruppe
            url = "/customers"
            if params:
                url += "?" + urlencode(params)
            links.append({
                "label": f"Se kunder{' (' + kundegruppe + ')' if kundegruppe else ''}",
                "url": url,
                "icon": "Users"
            })

        elif tool_name == "list_customer_groups":
            links.append({
                "label": "Se kundegrupper",
                "url": "/kundegrupper",
                "icon": "FolderTree"
            })

        elif tool_name == "get_customer":
            kundeid = parameters.get("kundeid")
            if kundeid:
                links.append({
                    "label": "Åpne kunde",
                    "url": f"/customers/{kundeid}",
                    "icon": "User"
                })

        elif tool_name in ["search_orders", "get_todays_orders"]:
            params = {}
            if parameters.get("kundeid"):
                params["kunde_id"] = parameters["kundeid"]
            if parameters.get("fra_dato"):
                params["fra_dato"] = parameters["fra_dato"]
            if parameters.get("til_dato"):
                params["til_dato"] = parameters["til_dato"]

            url = "/orders"
            if params:
                url += "?" + urlencode(params)
            links.append({
                "label": "Se ordrer",
                "url": url,
                "icon": "ShoppingCart"
            })

        elif tool_name == "get_order":
            ordreid = parameters.get("ordreid")
            if ordreid:
                links.append({
                    "label": "Åpne ordre",
                    "url": f"/orders/{ordreid}",
                    "icon": "ShoppingCart"
                })

        elif tool_name == "create_order":
            ordreid = result.get("ordreid")
            if ordreid:
                links.append({
                    "label": "Åpne ny ordre",
                    "url": f"/orders/{ordreid}",
                    "icon": "ShoppingCart"
                })

        elif tool_name == "search_products":
            search = parameters.get("search", "")
            params = {}
            if search:
                params["search"] = search
            if parameters.get("kategoriid"):
                params["kategori"] = parameters["kategoriid"]

            url = "/produkter"
            if params:
                url += "?" + urlencode(params)
            links.append({
                "label": "Se produkter",
                "url": url,
                "icon": "Package"
            })

        elif tool_name == "get_product":
            produktid = parameters.get("produktid")
            if produktid:
                links.append({
                    "label": "Åpne produkt",
                    "url": f"/produkter/{produktid}",
                    "icon": "Package"
                })

        elif tool_name == "list_categories":
            links.append({
                "label": "Se kategorier",
                "url": "/kategorier",
                "icon": "FolderTree"
            })

        elif tool_name in ["list_menus", "get_menu"]:
            menyid = parameters.get("menyid")
            if menyid:
                links.append({
                    "label": "Åpne meny",
                    "url": f"/menus/{menyid}",
                    "icon": "Menu"
                })
            else:
                links.append({
                    "label": "Se menyer",
                    "url": "/menus",
                    "icon": "Menu"
                })

        elif tool_name in ["search_recipes", "get_recipe"]:
            oppskriftid = parameters.get("oppskriftid")
            if oppskriftid:
                links.append({
                    "label": "Åpne oppskrift",
                    "url": f"/kalkyler/{oppskriftid}",
                    "icon": "ChefHat"
                })
            else:
                links.append({
                    "label": "Se oppskrifter",
                    "url": "/kalkyler",
                    "icon": "ChefHat"
                })

        elif tool_name in ["get_quick_stats", "get_sales_report"]:
            links.append({
                "label": "Se rapporter",
                "url": "/reports",
                "icon": "BarChart"
            })

        elif tool_name == "list_suppliers":
            links.append({
                "label": "Se leverandører",
                "url": "/leverandorer",
                "icon": "Truck"
            })

        return links

    # =========================================================================
    # KUNDER (Customers)
    # =========================================================================

    async def _search_customers(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Search for customers, optionally filtered by customer group."""
        search = params.get("search", "")
        kundegruppe_name = params.get("kundegruppe", "")
        page_size = params.get("page_size", 50)

        query = select(KunderModel).options(joinedload(KunderModel.gruppe))

        # Filter by customer group name if provided
        if kundegruppe_name:
            # First find the group ID(s) matching the name
            group_result = await self.db.execute(
                select(KundegruppeModel.gruppeid).where(
                    KundegruppeModel.gruppe.ilike(f"%{kundegruppe_name}%")
                )
            )
            group_ids = [r for r in group_result.scalars().all()]

            if group_ids:
                query = query.where(KunderModel.kundegruppe.in_(group_ids))
            else:
                # No matching groups found
                return {
                    "items": [],
                    "total": 0,
                    "kundegruppe_filter": kundegruppe_name,
                    "message": f"Ingen kundegruppe funnet som matcher '{kundegruppe_name}'"
                }

        # Filter by search term if provided
        if search:
            search_term = f"%{search}%"
            query = query.where(
                or_(
                    KunderModel.kundenavn.ilike(search_term),
                    KunderModel.adresse.ilike(search_term),
                    KunderModel.telefonnummer.ilike(search_term),
                    KunderModel.e_post.ilike(search_term),
                )
            )

        # Filter active customers by default
        query = query.where(
            or_(KunderModel.kundeinaktiv == False, KunderModel.kundeinaktiv == None)
        )

        query = query.order_by(KunderModel.kundenavn).limit(page_size)
        result = await self.db.execute(query)
        customers = result.unique().scalars().all()

        return {
            "items": [
                {
                    "kundeid": c.kundeid,
                    "kundenavn": c.kundenavn,
                    "adresse": c.adresse,
                    "postnr": c.postnr,
                    "sted": c.sted,
                    "telefonnummer": c.telefonnummer,
                    "e_post": c.e_post,
                    "kundegruppe": c.gruppe.gruppe if c.gruppe else None,
                }
                for c in customers
            ],
            "total": len(customers),
            "kundegruppe_filter": kundegruppe_name if kundegruppe_name else None,
        }

    async def _list_customer_groups(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """List all customer groups."""
        page_size = params.get("page_size", 50)

        result = await self.db.execute(
            select(KundegruppeModel).order_by(KundegruppeModel.gruppe).limit(page_size)
        )
        groups = result.scalars().all()

        return {
            "items": [
                {
                    "gruppeid": g.gruppeid,
                    "gruppe": g.gruppe,
                    "webshop": g.webshop,
                }
                for g in groups
            ],
            "total": len(groups),
        }

    async def _get_customer(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Get a single customer by ID."""
        kundeid = params.get("kundeid")
        if not kundeid:
            raise ValueError("kundeid is required")

        result = await self.db.execute(
            select(KunderModel).where(KunderModel.kundeid == kundeid)
        )
        customer = result.scalar_one_or_none()

        if not customer:
            raise ValueError(f"Kunde med ID {kundeid} ikke funnet")

        return {
            "kundeid": customer.kundeid,
            "kundenavn": customer.kundenavn,
            "adresse": customer.adresse,
            "postnr": customer.postnr,
            "sted": customer.sted,
            "telefonnummer": customer.telefonnummer,
            "e_post": customer.e_post,
        }

    async def _create_customer(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new customer."""
        kundenavn = params.get("kundenavn")
        if not kundenavn:
            raise ValueError("kundenavn is required")

        customer = KunderModel(
            kundenavn=kundenavn,
            adresse=params.get("adresse"),
            postnr=params.get("postnr"),
            sted=params.get("poststed"),
            telefonnummer=params.get("telefon"),
            e_post=params.get("epost"),
        )

        self.db.add(customer)
        await self.db.commit()
        await self.db.refresh(customer)

        return {
            "kundeid": customer.kundeid,
            "kundenavn": customer.kundenavn,
            "message": f"Kunde '{kundenavn}' opprettet med ID {customer.kundeid}",
        }

    # =========================================================================
    # ORDRER (Orders)
    # =========================================================================

    async def _search_orders(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Search for orders."""
        search = params.get("search")
        kundeid = params.get("kundeid")
        fra_dato = params.get("fra_dato")
        til_dato = params.get("til_dato")
        ordrestatusid = params.get("ordrestatusid")
        page_size = params.get("page_size", 20)

        query = select(OrdrerModel).options(joinedload(OrdrerModel.kunde))

        if search:
            search_term = f"%{search}%"
            query = query.where(
                or_(
                    OrdrerModel.kundenavn.ilike(search_term),
                    OrdrerModel.informasjon.ilike(search_term),
                )
            )

        if kundeid:
            query = query.where(OrdrerModel.kundeid == kundeid)

        if fra_dato:
            if isinstance(fra_dato, str):
                fra_dato = datetime.strptime(fra_dato, "%Y-%m-%d").date()
            query = query.where(OrdrerModel.leveringsdato >= fra_dato)

        if til_dato:
            if isinstance(til_dato, str):
                til_dato = datetime.strptime(til_dato, "%Y-%m-%d").date()
            query = query.where(OrdrerModel.leveringsdato <= til_dato)

        if ordrestatusid:
            query = query.where(OrdrerModel.ordrestatusid == ordrestatusid)

        query = query.order_by(OrdrerModel.leveringsdato.desc()).limit(page_size)
        result = await self.db.execute(query)
        orders = result.unique().scalars().all()

        return {
            "items": [
                {
                    "ordreid": o.ordreid,
                    "kundenavn": o.kundenavn or (o.kunde.kundenavn if o.kunde else ""),
                    "kundeid": o.kundeid,
                    "ordredato": o.ordredato.isoformat() if o.ordredato else None,
                    "leveringsdato": o.leveringsdato.isoformat() if o.leveringsdato else None,
                    "ordrestatusid": o.ordrestatusid,
                }
                for o in orders
            ],
            "total": len(orders),
        }

    async def _get_order(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Get a single order with details."""
        ordreid = params.get("ordreid")
        if not ordreid:
            raise ValueError("ordreid is required")

        result = await self.db.execute(
            select(OrdrerModel)
            .options(
                joinedload(OrdrerModel.kunde),
                selectinload(OrdrerModel.detaljer).joinedload(OrdredetaljerModel.produkt),
            )
            .where(OrdrerModel.ordreid == ordreid)
        )
        order = result.unique().scalar_one_or_none()

        if not order:
            raise ValueError(f"Ordre med ID {ordreid} ikke funnet")

        return {
            "ordreid": order.ordreid,
            "kundenavn": order.kundenavn or (order.kunde.kundenavn if order.kunde else ""),
            "kundeid": order.kundeid,
            "ordredato": order.ordredato.isoformat() if order.ordredato else None,
            "leveringsdato": order.leveringsdato.isoformat() if order.leveringsdato else None,
            "ordrestatusid": order.ordrestatusid,
            "informasjon": order.informasjon,
            "linjer": [
                {
                    "produktid": d.produktid,
                    "produktnavn": d.produkt.produktnavn if d.produkt else "",
                    "antall": d.antall,
                    "pris": d.pris,
                }
                for d in (order.detaljer or [])
            ],
        }

    async def _get_todays_orders(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Get orders for today."""
        today = date.today()

        count_result = await self.db.execute(
            select(func.count())
            .select_from(OrdrerModel)
            .where(OrdrerModel.leveringsdato == today)
        )
        total = count_result.scalar() or 0

        result = await self.db.execute(
            select(OrdrerModel)
            .options(joinedload(OrdrerModel.kunde))
            .where(OrdrerModel.leveringsdato == today)
            .order_by(OrdrerModel.ordreid)
            .limit(50)
        )
        orders = result.unique().scalars().all()

        return {
            "items": [
                {
                    "ordreid": o.ordreid,
                    "kundenavn": o.kundenavn or (o.kunde.kundenavn if o.kunde else ""),
                    "ordrestatusid": o.ordrestatusid,
                }
                for o in orders
            ],
            "total": total,
        }

    async def _create_order(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new order."""
        kundeid = params.get("kundeid")
        leveringsdato = params.get("leveringsdato")

        if not kundeid:
            raise ValueError("kundeid is required")
        if not leveringsdato:
            raise ValueError("leveringsdato is required")

        # Verify customer exists
        customer_result = await self.db.execute(
            select(KunderModel).where(KunderModel.kundeid == kundeid)
        )
        customer = customer_result.scalar_one_or_none()
        if not customer:
            raise ValueError(f"Kunde med ID {kundeid} ikke funnet")

        # Parse date
        if isinstance(leveringsdato, str):
            leveringsdato = datetime.strptime(leveringsdato, "%Y-%m-%d").date()

        order = OrdrerModel(
            kundeid=kundeid,
            kundenavn=customer.kundenavn,
            ordredato=date.today(),
            leveringsdato=leveringsdato,
            informasjon=params.get("informasjon"),
            ordrestatusid=1,  # New order status
        )

        self.db.add(order)
        await self.db.commit()
        await self.db.refresh(order)

        return {
            "ordreid": order.ordreid,
            "kundenavn": customer.kundenavn,
            "leveringsdato": leveringsdato.isoformat(),
            "message": f"Ordre #{order.ordreid} opprettet for {customer.kundenavn}",
        }

    async def _add_order_line(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Add a product line to an order."""
        ordreid = params.get("ordreid")
        produktid = params.get("produktid")
        antall = params.get("antall", 1)

        if not ordreid:
            raise ValueError("ordreid is required")
        if not produktid:
            raise ValueError("produktid is required")

        # Verify order exists
        order_result = await self.db.execute(
            select(OrdrerModel).where(OrdrerModel.ordreid == ordreid)
        )
        order = order_result.scalar_one_or_none()
        if not order:
            raise ValueError(f"Ordre med ID {ordreid} ikke funnet")

        # Get product
        product_result = await self.db.execute(
            select(ProdukterModel).where(ProdukterModel.produktid == produktid)
        )
        product = product_result.scalar_one_or_none()
        if not product:
            raise ValueError(f"Produkt med ID {produktid} ikke funnet")

        detail = OrdredetaljerModel(
            ordreid=ordreid,
            produktid=produktid,
            antall=antall,
            pris=product.pris or 0,
        )

        self.db.add(detail)
        await self.db.commit()

        return {
            "ordreid": ordreid,
            "produktid": produktid,
            "produktnavn": product.produktnavn,
            "antall": antall,
            "pris": product.pris or 0,
            "message": f"La til {antall}x {product.produktnavn} på ordre #{ordreid}",
        }

    async def _update_order_status(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Update order status."""
        ordreid = params.get("ordreid")
        ordrestatusid = params.get("ordrestatusid")

        if not ordreid:
            raise ValueError("ordreid is required")
        if not ordrestatusid:
            raise ValueError("ordrestatusid is required")

        result = await self.db.execute(
            select(OrdrerModel).where(OrdrerModel.ordreid == ordreid)
        )
        order = result.scalar_one_or_none()

        if not order:
            raise ValueError(f"Ordre med ID {ordreid} ikke funnet")

        old_status = order.ordrestatusid
        order.ordrestatusid = ordrestatusid
        await self.db.commit()

        return {
            "ordreid": ordreid,
            "old_status": old_status,
            "new_status": ordrestatusid,
            "message": f"Ordre #{ordreid} status endret fra {old_status} til {ordrestatusid}",
        }

    async def _cancel_order(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Cancel an order."""
        ordreid = params.get("ordreid")
        arsak = params.get("arsak", "")

        if not ordreid:
            raise ValueError("ordreid is required")

        result = await self.db.execute(
            select(OrdrerModel).where(OrdrerModel.ordreid == ordreid)
        )
        order = result.scalar_one_or_none()

        if not order:
            raise ValueError(f"Ordre med ID {ordreid} ikke funnet")

        # Status 5 = Cancelled (this may vary based on your status system)
        order.ordrestatusid = 5
        if arsak:
            order.informasjon = (order.informasjon or "") + f"\nKansellert: {arsak}"

        await self.db.commit()

        return {
            "ordreid": ordreid,
            "message": f"Ordre #{ordreid} er kansellert",
        }

    # =========================================================================
    # PRODUKTER (Products)
    # =========================================================================

    async def _search_products(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Search for products."""
        search = params.get("search", "")
        kategoriid = params.get("kategoriid")
        webshop = params.get("webshop")
        page_size = params.get("page_size", 20)

        query = select(ProdukterModel)

        if search:
            search_term = f"%{search}%"
            query = query.where(
                or_(
                    ProdukterModel.produktnavn.ilike(search_term),
                    ProdukterModel.ean_kode.ilike(search_term),
                )
            )

        if kategoriid:
            query = query.where(ProdukterModel.kategoriid == kategoriid)

        if webshop is not None:
            query = query.where(ProdukterModel.webshop == webshop)

        # Only active products
        query = query.where(
            or_(ProdukterModel.inaktiv == False, ProdukterModel.inaktiv == None)
        )

        query = query.order_by(ProdukterModel.produktnavn).limit(page_size)
        result = await self.db.execute(query)
        products = result.scalars().all()

        return {
            "items": [
                {
                    "produktid": p.produktid,
                    "produktnavn": p.produktnavn,
                    "pris": p.pris,
                    "kategoriid": p.kategoriid,
                    "ean_kode": p.ean_kode,
                    "enhet": p.enhet,
                }
                for p in products
            ],
            "total": len(products),
        }

    async def _get_product(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Get a single product."""
        produktid = params.get("produktid")
        if not produktid:
            raise ValueError("produktid is required")

        result = await self.db.execute(
            select(ProdukterModel).where(ProdukterModel.produktid == produktid)
        )
        product = result.scalar_one_or_none()

        if not product:
            raise ValueError(f"Produkt med ID {produktid} ikke funnet")

        return {
            "produktid": product.produktid,
            "produktnavn": product.produktnavn,
            "pris": product.pris,
            "kategoriid": product.kategoriid,
            "ean_kode": product.ean_kode,
            "enhet": product.enhet,
            "beskrivelse": product.informasjon,
        }

    async def _update_product_price(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Update product price."""
        produktid = params.get("produktid")
        pris = params.get("pris")

        if not produktid:
            raise ValueError("produktid is required")
        if pris is None:
            raise ValueError("pris is required")

        result = await self.db.execute(
            select(ProdukterModel).where(ProdukterModel.produktid == produktid)
        )
        product = result.scalar_one_or_none()

        if not product:
            raise ValueError(f"Produkt med ID {produktid} ikke funnet")

        old_price = product.pris
        product.pris = pris
        await self.db.commit()

        return {
            "produktid": produktid,
            "produktnavn": product.produktnavn,
            "old_price": old_price,
            "new_price": pris,
            "message": f"Pris for {product.produktnavn} endret fra {old_price} til {pris}",
        }

    # =========================================================================
    # KATEGORIER (Categories)
    # =========================================================================

    async def _list_categories(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """List all categories."""
        page_size = params.get("page_size", 100)

        result = await self.db.execute(
            select(KategorierModel).order_by(KategorierModel.kategorinavn).limit(page_size)
        )
        categories = result.scalars().all()

        return {
            "items": [
                {
                    "kategoriid": c.kategoriid,
                    "kategorinavn": c.kategorinavn,
                }
                for c in categories
            ],
            "total": len(categories),
        }

    # =========================================================================
    # MENY (Menus)
    # =========================================================================

    async def _list_menus(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """List all menus."""
        search = params.get("search")
        page_size = params.get("page_size", 50)

        query = select(MenyModel)

        if search:
            search_term = f"%{search}%"
            query = query.where(MenyModel.menynavn.ilike(search_term))

        query = query.order_by(MenyModel.menynavn).limit(page_size)
        result = await self.db.execute(query)
        menus = result.scalars().all()

        return {
            "items": [
                {
                    "menyid": m.menyid,
                    "menynavn": m.menynavn,
                }
                for m in menus
            ],
            "total": len(menus),
        }

    async def _get_menu(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Get a menu with products."""
        menyid = params.get("menyid")
        if not menyid:
            raise ValueError("menyid is required")

        result = await self.db.execute(
            select(MenyModel)
            .options(selectinload(MenyModel.produkter).joinedload(MenyProduktModel.produkt))
            .where(MenyModel.menyid == menyid)
        )
        menu = result.scalar_one_or_none()

        if not menu:
            raise ValueError(f"Meny med ID {menyid} ikke funnet")

        return {
            "menyid": menu.menyid,
            "menynavn": menu.menynavn,
            "produkter": [
                {
                    "produktid": mp.produktid,
                    "produktnavn": mp.produkt.produktnavn if mp.produkt else "",
                    "antall": mp.antall,
                }
                for mp in (menu.produkter or [])
            ],
        }

    async def _add_product_to_menu(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Add a product to a menu."""
        menyid = params.get("menyid")
        produktid = params.get("produktid")
        antall = params.get("antall", 1)

        if not menyid:
            raise ValueError("menyid is required")
        if not produktid:
            raise ValueError("produktid is required")

        # Verify menu exists
        menu_result = await self.db.execute(
            select(MenyModel).where(MenyModel.menyid == menyid)
        )
        menu = menu_result.scalar_one_or_none()
        if not menu:
            raise ValueError(f"Meny med ID {menyid} ikke funnet")

        # Verify product exists
        product_result = await self.db.execute(
            select(ProdukterModel).where(ProdukterModel.produktid == produktid)
        )
        product = product_result.scalar_one_or_none()
        if not product:
            raise ValueError(f"Produkt med ID {produktid} ikke funnet")

        menu_product = MenyProduktModel(
            menyid=menyid,
            produktid=produktid,
            antall=antall,
        )

        self.db.add(menu_product)
        await self.db.commit()

        return {
            "menyid": menyid,
            "produktid": produktid,
            "produktnavn": product.produktnavn,
            "antall": antall,
            "message": f"La til {product.produktnavn} på meny '{menu.menynavn}'",
        }

    # =========================================================================
    # OPPSKRIFTER (Recipes)
    # =========================================================================

    async def _search_recipes(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Search for recipes (kalkyler)."""
        search = params.get("search")
        page_size = params.get("page_size", 20)

        query = select(KalkyleModel)

        if search:
            search_term = f"%{search}%"
            query = query.where(KalkyleModel.kalkylenavn.ilike(search_term))

        query = query.order_by(KalkyleModel.kalkylenavn).limit(page_size)
        result = await self.db.execute(query)
        recipes = result.scalars().all()

        return {
            "items": [
                {
                    "oppskriftid": r.kalkylekode,
                    "oppskriftnavn": r.kalkylenavn,
                }
                for r in recipes
            ],
            "total": len(recipes),
        }

    async def _get_recipe(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Get a recipe (kalkyle) with details."""
        oppskriftid = params.get("oppskriftid")
        if not oppskriftid:
            raise ValueError("oppskriftid is required")

        result = await self.db.execute(
            select(KalkyleModel).where(KalkyleModel.kalkylekode == oppskriftid)
        )
        recipe = result.scalar_one_or_none()

        if not recipe:
            raise ValueError(f"Oppskrift med ID {oppskriftid} ikke funnet")

        return {
            "oppskriftid": recipe.kalkylekode,
            "oppskriftnavn": recipe.kalkylenavn,
            "fremgangsmaate": recipe.produksjonsmetode,
            "porsjoner": recipe.antallporsjoner,
        }

    # =========================================================================
    # STATISTIKK (Statistics)
    # =========================================================================

    async def _get_quick_stats(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Get quick statistics for a period."""
        period = params.get("period", "month")

        # Calculate date range based on period
        today = date.today()
        if period == "today":
            start_date = today
            end_date = today
        elif period == "week":
            start_date = today - timedelta(days=7)
            end_date = today
        elif period == "month":
            start_date = today.replace(day=1)
            end_date = today
        elif period == "quarter":
            quarter_start_month = ((today.month - 1) // 3) * 3 + 1
            start_date = today.replace(month=quarter_start_month, day=1)
            end_date = today
        elif period == "year":
            start_date = today.replace(month=1, day=1)
            end_date = today
        else:
            start_date = today.replace(day=1)
            end_date = today

        # Count orders
        order_count_result = await self.db.execute(
            select(func.count())
            .select_from(OrdrerModel)
            .where(OrdrerModel.ordredato >= start_date)
            .where(OrdrerModel.ordredato <= end_date)
        )
        total_orders = order_count_result.scalar() or 0

        # Sum revenue (simplified - uses order details)
        revenue_result = await self.db.execute(
            select(func.sum(OrdredetaljerModel.pris * OrdredetaljerModel.antall))
            .select_from(OrdredetaljerModel)
            .join(OrdrerModel, OrdredetaljerModel.ordreid == OrdrerModel.ordreid)
            .where(OrdrerModel.ordredato >= start_date)
            .where(OrdrerModel.ordredato <= end_date)
        )
        total_revenue = revenue_result.scalar() or 0

        # Count unique customers
        customer_count_result = await self.db.execute(
            select(func.count(func.distinct(OrdrerModel.kundeid)))
            .select_from(OrdrerModel)
            .where(OrdrerModel.ordredato >= start_date)
            .where(OrdrerModel.ordredato <= end_date)
        )
        active_customers = customer_count_result.scalar() or 0

        return {
            "period": period,
            "total_revenue": float(total_revenue),
            "total_orders": total_orders,
            "active_customers": active_customers,
            "average_order_value": float(total_revenue / total_orders) if total_orders > 0 else 0,
        }

    async def _get_sales_report(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Get sales report for a period."""
        # Simplified - returns quick stats with additional breakdown
        stats = await self._get_quick_stats(params)
        return {
            **stats,
            "report_type": "sales",
        }

    async def _generate_ai_report(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Generate an AI-analyzed report."""
        # This would typically call the AI service, but for now return stats
        stats = await self._get_quick_stats(params)
        return {
            **stats,
            "insights": "AI-generert rapport er ikke implementert ennå.",
            "report_type": params.get("report_type", "salg"),
        }

    # =========================================================================
    # LEVERANDØRER (Suppliers)
    # =========================================================================

    async def _list_suppliers(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """List all suppliers."""
        search = params.get("search")
        page_size = params.get("page_size", 50)

        query = select(LeverandorerModel)

        if search:
            search_term = f"%{search}%"
            query = query.where(LeverandorerModel.leverandornavn.ilike(search_term))

        query = query.order_by(LeverandorerModel.leverandornavn).limit(page_size)
        result = await self.db.execute(query)
        suppliers = result.scalars().all()

        return {
            "items": [
                {
                    "leverandorid": s.leverandorid,
                    "leverandornavn": s.leverandornavn,
                }
                for s in suppliers
            ],
            "total": len(suppliers),
        }
