"""GraphQL API endpoint."""
from fastapi import Depends
from strawberry.fastapi import GraphQLRouter
from sqlalchemy.ext.asyncio import AsyncSession

from app.graphql.schema import schema
from app.api.deps import get_db, get_current_user
from app.domain.entities.user import User


# Custom context getter for GraphQL
async def get_context(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get GraphQL context with database session and current user."""
    return {
        "db": db,
        "user": current_user
    }


# GraphQL router with authentication (this IS the router)
router = GraphQLRouter(
    schema,
    context_getter=get_context
)
