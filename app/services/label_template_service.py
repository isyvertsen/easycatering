"""Label template service."""
import logging
from typing import List, Optional, Dict, Any

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, func, delete
from sqlalchemy.orm import selectinload

from app.models.label_template import (
    LabelTemplate, TemplateParameter, TemplateShare, PrintHistory
)
from app.schemas.label_template import (
    LabelTemplateCreate, LabelTemplateUpdate,
    TemplateParameterCreate, TemplateShareCreate,
    PrintHistoryCreate
)

logger = logging.getLogger(__name__)


class LabelTemplateService:
    """Service for managing label templates."""

    async def get_user_templates(
        self,
        db: AsyncSession,
        user_id: int,
        include_global: bool = True,
        search: Optional[str] = None,
        skip: int = 0,
        limit: int = 100
    ) -> List[LabelTemplate]:
        """
        Get templates accessible to a user.
        Includes owned templates, shared templates, and optionally global templates.
        """
        conditions = [LabelTemplate.owner_id == user_id]

        if include_global:
            conditions.append(LabelTemplate.is_global == True)

        # Include templates shared with user
        shared_subq = (
            select(TemplateShare.template_id)
            .where(TemplateShare.shared_with_user_id == user_id)
        )
        conditions.append(LabelTemplate.id.in_(shared_subq))

        stmt = (
            select(LabelTemplate)
            .options(selectinload(LabelTemplate.parameters))
            .where(or_(*conditions))
        )

        if search:
            stmt = stmt.where(
                or_(
                    LabelTemplate.name.ilike(f"%{search}%"),
                    LabelTemplate.description.ilike(f"%{search}%")
                )
            )

        stmt = stmt.order_by(LabelTemplate.updated_at.desc().nullslast(), LabelTemplate.created_at.desc())
        stmt = stmt.offset(skip).limit(limit)

        result = await db.execute(stmt)
        return list(result.scalars().all())

    async def get_template(
        self,
        db: AsyncSession,
        template_id: int,
        user_id: Optional[int] = None
    ) -> Optional[LabelTemplate]:
        """
        Get a single template by ID.
        Optionally checks access for a specific user.
        """
        stmt = (
            select(LabelTemplate)
            .options(
                selectinload(LabelTemplate.parameters),
                selectinload(LabelTemplate.shares)
            )
            .where(LabelTemplate.id == template_id)
        )

        result = await db.execute(stmt)
        template = result.scalar_one_or_none()

        if not template:
            return None

        # If user_id is provided, check access
        if user_id is not None:
            has_access = await self.check_template_access(db, template_id, user_id)
            if not has_access:
                return None

        return template

    async def create_template(
        self,
        db: AsyncSession,
        data: LabelTemplateCreate,
        owner_id: int
    ) -> LabelTemplate:
        """Create a new label template with parameters."""
        template = LabelTemplate(
            name=data.name,
            description=data.description,
            template_json=data.template_json,
            width_mm=data.width_mm,
            height_mm=data.height_mm,
            is_global=data.is_global,
            printer_config=data.printer_config.model_dump() if data.printer_config else None,
            owner_id=owner_id
        )

        db.add(template)
        await db.flush()

        # Create parameters
        if data.parameters:
            for param_data in data.parameters:
                param = TemplateParameter(
                    template_id=template.id,
                    field_name=param_data.field_name,
                    display_name=param_data.display_name,
                    parameter_type=param_data.parameter_type.value if param_data.parameter_type else "text",
                    source_type=param_data.source_type.value if param_data.source_type else "manual",
                    source_config=param_data.source_config,
                    is_required=param_data.is_required,
                    default_value=param_data.default_value,
                    validation_regex=param_data.validation_regex,
                    sort_order=param_data.sort_order
                )
                db.add(param)

        await db.commit()
        await db.refresh(template)

        return template

    async def update_template(
        self,
        db: AsyncSession,
        template_id: int,
        data: LabelTemplateUpdate,
        user_id: int
    ) -> Optional[LabelTemplate]:
        """
        Update a label template.
        Requires owner or edit permission.
        """
        template = await self.get_template(db, template_id)
        if not template:
            return None

        # Check permission
        has_edit = await self.check_template_access(db, template_id, user_id, "edit")
        if not has_edit:
            return None

        # Update fields
        if data.name is not None:
            template.name = data.name
        if data.description is not None:
            template.description = data.description
        if data.template_json is not None:
            template.template_json = data.template_json
        if data.width_mm is not None:
            template.width_mm = data.width_mm
        if data.height_mm is not None:
            template.height_mm = data.height_mm
        if data.is_global is not None:
            # Only owner can change is_global
            if template.owner_id == user_id:
                template.is_global = data.is_global
        if data.printer_config is not None:
            template.printer_config = data.printer_config.model_dump()

        # Update parameters if provided
        if data.parameters is not None:
            # Delete existing parameters
            await db.execute(
                delete(TemplateParameter).where(TemplateParameter.template_id == template_id)
            )

            # Create new parameters
            for param_data in data.parameters:
                param = TemplateParameter(
                    template_id=template.id,
                    field_name=param_data.field_name,
                    display_name=param_data.display_name,
                    parameter_type=param_data.parameter_type.value if param_data.parameter_type else "text",
                    source_type=param_data.source_type.value if param_data.source_type else "manual",
                    source_config=param_data.source_config,
                    is_required=param_data.is_required,
                    default_value=param_data.default_value,
                    validation_regex=param_data.validation_regex,
                    sort_order=param_data.sort_order
                )
                db.add(param)

        await db.commit()
        await db.refresh(template)

        return template

    async def delete_template(
        self,
        db: AsyncSession,
        template_id: int,
        user_id: int
    ) -> bool:
        """
        Delete a label template.
        Only the owner can delete.
        """
        template = await self.get_template(db, template_id)
        if not template:
            return False

        # Only owner can delete
        if template.owner_id != user_id:
            return False

        await db.delete(template)
        await db.commit()

        return True

    async def check_template_access(
        self,
        db: AsyncSession,
        template_id: int,
        user_id: int,
        required_permission: str = "view"
    ) -> bool:
        """
        Check if a user has access to a template.
        Returns True if user is owner, template is global, or user has share permission.
        """
        stmt = (
            select(LabelTemplate)
            .options(selectinload(LabelTemplate.shares))
            .where(LabelTemplate.id == template_id)
        )

        result = await db.execute(stmt)
        template = result.scalar_one_or_none()

        if not template:
            return False

        # Owner always has access
        if template.owner_id == user_id:
            return True

        # Global templates give view access
        if template.is_global and required_permission == "view":
            return True

        # Check shares
        for share in template.shares:
            if share.shared_with_user_id == user_id:
                if required_permission == "view":
                    return True
                if required_permission == "edit" and share.permission == "edit":
                    return True

        return False

    async def share_template(
        self,
        db: AsyncSession,
        template_id: int,
        share_data: TemplateShareCreate,
        owner_id: int
    ) -> Optional[TemplateShare]:
        """
        Share a template with another user.
        Only owner can share.
        """
        template = await self.get_template(db, template_id)
        if not template or template.owner_id != owner_id:
            return None

        # Check if share already exists
        stmt = select(TemplateShare).where(
            TemplateShare.template_id == template_id,
            TemplateShare.shared_with_user_id == share_data.shared_with_user_id
        )
        result = await db.execute(stmt)
        existing = result.scalar_one_or_none()

        if existing:
            # Update permission
            existing.permission = share_data.permission
            await db.commit()
            return existing

        # Create new share
        share = TemplateShare(
            template_id=template_id,
            shared_with_user_id=share_data.shared_with_user_id,
            permission=share_data.permission
        )
        db.add(share)
        await db.commit()
        await db.refresh(share)

        return share

    async def get_template_shares(
        self,
        db: AsyncSession,
        template_id: int,
        user_id: int
    ) -> List[TemplateShare]:
        """Get all shares for a template. Only owner can see shares."""
        template = await self.get_template(db, template_id)
        if not template or template.owner_id != user_id:
            return []

        return list(template.shares)

    async def remove_share(
        self,
        db: AsyncSession,
        template_id: int,
        shared_with_user_id: int,
        owner_id: int
    ) -> bool:
        """Remove a share. Only owner can remove."""
        template = await self.get_template(db, template_id)
        if not template or template.owner_id != owner_id:
            return False

        stmt = delete(TemplateShare).where(
            TemplateShare.template_id == template_id,
            TemplateShare.shared_with_user_id == shared_with_user_id
        )
        await db.execute(stmt)
        await db.commit()

        return True

    async def log_print(
        self,
        db: AsyncSession,
        data: PrintHistoryCreate,
        user_id: int
    ) -> PrintHistory:
        """Log a print event."""
        history = PrintHistory(
            template_id=data.template_id,
            user_id=user_id,
            printer_name=data.printer_name,
            input_data=data.input_data,
            copies=data.copies,
            status=data.status,
            error_message=data.error_message
        )
        db.add(history)
        await db.commit()
        await db.refresh(history)

        return history

    async def get_print_history(
        self,
        db: AsyncSession,
        user_id: int,
        template_id: Optional[int] = None,
        skip: int = 0,
        limit: int = 50
    ) -> List[PrintHistory]:
        """Get print history for a user."""
        stmt = (
            select(PrintHistory)
            .where(PrintHistory.user_id == user_id)
            .order_by(PrintHistory.printed_at.desc())
        )

        if template_id:
            stmt = stmt.where(PrintHistory.template_id == template_id)

        stmt = stmt.offset(skip).limit(limit)

        result = await db.execute(stmt)
        return list(result.scalars().all())


# Singleton instance
label_template_service = LabelTemplateService()
