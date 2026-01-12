"""Documentation API endpoints."""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Query
from fastapi.responses import FileResponse

from app.api.admin import get_current_admin
from app.domain.entities.user import User
from app.services.documentation_service import DocumentationService
from app.schemas.documentation import (
    DocumentationFile,
    DocumentationContent,
    ImageUploadResponse,
    GitHubStatusResponse,
)

router = APIRouter()
doc_service = DocumentationService()


@router.get("/", response_model=List[DocumentationFile])
async def list_documentation_files(
    admin: User = Depends(get_current_admin),
) -> List[DocumentationFile]:
    """
    List all documentation files (admin only).

    Returns a list of all markdown files in the docs directory with metadata.
    """
    files = doc_service.list_files()
    return files


@router.get("/files/{file_path:path}", response_model=DocumentationContent)
async def get_documentation_file(
    file_path: str,
    admin: User = Depends(get_current_admin),
) -> DocumentationContent:
    """
    Get a specific documentation file with parsed content (admin only).

    Returns both raw markdown and HTML-parsed content. Mermaid diagrams
    are marked but require client-side rendering.
    """
    content = doc_service.get_file_content(file_path)

    if not content:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Dokumentasjonsfil ikke funnet"
        )

    return content


@router.post("/images", response_model=ImageUploadResponse)
async def upload_image(
    file: UploadFile = File(...),
    admin: User = Depends(get_current_admin),
) -> ImageUploadResponse:
    """
    Upload an image for use in documentation (admin only).

    Accepts image files and saves them to the docs/images directory.
    Returns the URL path to access the image.
    """
    # Validate file type
    allowed_extensions = {'.jpg', '.jpeg', '.png', '.gif', '.svg', '.webp'}
    file_ext = None
    if file.filename:
        file_ext = '.' + file.filename.rsplit('.', 1)[-1].lower() if '.' in file.filename else None

    if not file_ext or file_ext not in allowed_extensions:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Ugyldig filtype. Tillatte formater: {', '.join(allowed_extensions)}"
        )

    # Read file content
    content = await file.read()

    # Validate file size (max 5MB)
    max_size = 5 * 1024 * 1024  # 5MB
    if len(content) > max_size:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Filen er for stor. Maks størrelse er 5MB"
        )

    # Save the file
    relative_path = doc_service.save_uploaded_image(file.filename, content)

    # Return URL to access the image
    url = f"/api/documentation/images/{relative_path}"

    return ImageUploadResponse(
        url=url,
        filename=file.filename
    )


@router.get("/images/{image_path:path}")
async def get_image(
    image_path: str,
    admin: User = Depends(get_current_admin),
):
    """
    Get an uploaded image (admin only).

    Returns the image file for display in documentation.
    """
    from pathlib import Path

    # Prevent directory traversal
    safe_path = Path(image_path).as_posix()
    if ".." in safe_path or safe_path.startswith("/"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ugyldig filsti"
        )

    images_dir = doc_service.docs_path / "images"
    full_path = images_dir / safe_path

    if not full_path.exists() or not full_path.is_file():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Bilde ikke funnet"
        )

    # Verify the file is within images directory
    try:
        full_path.resolve().relative_to(images_dir.resolve())
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ugyldig filsti"
        )

    return FileResponse(full_path)


@router.get("/github/status", response_model=GitHubStatusResponse)
async def get_github_status(
    owner: str = Query(..., description="GitHub repository owner"),
    repo: str = Query(..., description="GitHub repository name"),
    admin: User = Depends(get_current_admin),
) -> GitHubStatusResponse:
    """
    Get GitHub repository status including open issues and PRs (admin only).

    Fetches and returns information about open issues and pull requests
    from a specified GitHub repository.
    """
    try:
        # Try to get GitHub token from environment if available
        import os
        github_token = os.getenv("GITHUB_TOKEN")

        status_data = await doc_service.get_github_issues(owner, repo, github_token)
        return status_data
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Kunne ikke hente GitHub-data: {str(e)}"
        )
