"""Documentation service for handling markdown files and GitHub integration."""
import os
import re
from pathlib import Path
from typing import List, Optional
from datetime import datetime
import httpx

from app.core.config import settings


class DocumentationService:
    """Service for managing documentation files."""

    def __init__(self, docs_path: str = "docs"):
        """Initialize documentation service."""
        self.docs_path = Path(docs_path)
        if not self.docs_path.is_absolute():
            # Make it relative to project root
            project_root = Path(__file__).parent.parent.parent
            self.docs_path = project_root / docs_path

    def list_files(self) -> List[dict]:
        """List all markdown files in the docs directory."""
        if not self.docs_path.exists():
            return []

        files = []
        for file_path in self.docs_path.rglob("*.md"):
            if file_path.is_file():
                stat = file_path.stat()
                relative_path = file_path.relative_to(self.docs_path)

                # Try to extract title from first # heading
                title = None
                try:
                    with open(file_path, 'r', encoding='utf-8') as f:
                        for line in f:
                            if line.startswith('# '):
                                title = line[2:].strip()
                                break
                except Exception:
                    pass

                files.append({
                    "path": str(relative_path),
                    "name": file_path.name,
                    "title": title or file_path.stem.replace('-', ' ').replace('_', ' ').title(),
                    "size": stat.st_size,
                    "modified": datetime.fromtimestamp(stat.st_mtime),
                })

        return sorted(files, key=lambda x: x["name"])

    def get_file_content(self, file_path: str) -> Optional[dict]:
        """Get content of a specific documentation file."""
        # Prevent directory traversal
        safe_path = Path(file_path).as_posix()
        if ".." in safe_path or safe_path.startswith("/"):
            return None

        full_path = self.docs_path / safe_path

        if not full_path.exists() or not full_path.is_file():
            return None

        # Verify the file is within docs directory
        try:
            full_path.resolve().relative_to(self.docs_path.resolve())
        except ValueError:
            return None

        try:
            with open(full_path, 'r', encoding='utf-8') as f:
                raw_content = f.read()

            # Extract title from first # heading
            title = None
            for line in raw_content.split('\n'):
                if line.startswith('# '):
                    title = line[2:].strip()
                    break

            # Convert markdown to HTML
            html_content = self._markdown_to_html(raw_content)

            # Check for mermaid diagrams
            has_mermaid = '```mermaid' in raw_content

            return {
                "path": file_path,
                "name": Path(file_path).name,
                "title": title or Path(file_path).stem.replace('-', ' ').replace('_', ' ').title(),
                "raw_content": raw_content,
                "html_content": html_content,
                "has_mermaid": has_mermaid,
            }
        except Exception as e:
            return None

    def _markdown_to_html(self, markdown_text: str) -> str:
        """Convert markdown to HTML with mermaid support."""
        # Basic markdown to HTML conversion
        # Note: For production, consider using a library like markdown2 or mistune
        html = markdown_text

        # Convert headers
        html = re.sub(r'^### (.+)$', r'<h3>\1</h3>', html, flags=re.MULTILINE)
        html = re.sub(r'^## (.+)$', r'<h2>\1</h2>', html, flags=re.MULTILINE)
        html = re.sub(r'^# (.+)$', r'<h1>\1</h1>', html, flags=re.MULTILINE)

        # Convert bold and italic
        html = re.sub(r'\*\*(.+?)\*\*', r'<strong>\1</strong>', html)
        html = re.sub(r'\*(.+?)\*', r'<em>\1</em>', html)
        html = re.sub(r'__(.+?)__', r'<strong>\1</strong>', html)
        html = re.sub(r'_(.+?)_', r'<em>\1</em>', html)

        # Convert inline code
        html = re.sub(r'`(.+?)`', r'<code>\1</code>', html)

        # Convert links
        html = re.sub(r'\[(.+?)\]\((.+?)\)', r'<a href="\2">\1</a>', html)

        # Convert mermaid code blocks
        html = re.sub(
            r'```mermaid\n(.*?)\n```',
            r'<div class="mermaid">\1</div>',
            html,
            flags=re.DOTALL
        )

        # Convert regular code blocks
        html = re.sub(
            r'```(\w+)?\n(.*?)\n```',
            r'<pre><code class="language-\1">\2</code></pre>',
            html,
            flags=re.DOTALL
        )

        # Convert unordered lists
        lines = html.split('\n')
        in_list = False
        result_lines = []
        for line in lines:
            if re.match(r'^[\*\-] ', line):
                if not in_list:
                    result_lines.append('<ul>')
                    in_list = True
                item = re.sub(r'^[\*\-] ', '', line)
                result_lines.append(f'<li>{item}</li>')
            else:
                if in_list:
                    result_lines.append('</ul>')
                    in_list = False
                result_lines.append(line)
        if in_list:
            result_lines.append('</ul>')

        html = '\n'.join(result_lines)

        # Convert paragraphs (lines separated by blank lines)
        paragraphs = re.split(r'\n\n+', html)
        html_paragraphs = []
        for para in paragraphs:
            para = para.strip()
            if para and not para.startswith('<'):
                para = f'<p>{para}</p>'
            if para:
                html_paragraphs.append(para)

        html = '\n'.join(html_paragraphs)

        return html

    async def get_github_issues(self, owner: str, repo: str, token: Optional[str] = None) -> dict:
        """Fetch open issues from GitHub repository."""
        url = f"https://api.github.com/repos/{owner}/{repo}/issues"
        headers = {
            "Accept": "application/vnd.github.v3+json",
        }
        if token:
            headers["Authorization"] = f"token {token}"

        params = {
            "state": "open",
            "per_page": 100,
        }

        async with httpx.AsyncClient() as client:
            response = await client.get(url, headers=headers, params=params)
            response.raise_for_status()

            issues_data = response.json()

            # Separate issues and PRs (GitHub API returns both)
            issues = []
            prs = []

            for item in issues_data:
                if "pull_request" in item:
                    prs.append({
                        "number": item["number"],
                        "title": item["title"],
                        "state": item["state"],
                        "created_at": item["created_at"],
                        "updated_at": item["updated_at"],
                        "html_url": item["html_url"],
                        "user": item["user"]["login"],
                        "draft": item.get("draft", False),
                        "mergeable": item.get("mergeable"),
                    })
                else:
                    issues.append({
                        "number": item["number"],
                        "title": item["title"],
                        "state": item["state"],
                        "created_at": item["created_at"],
                        "updated_at": item["updated_at"],
                        "html_url": item["html_url"],
                        "user": item["user"]["login"],
                        "labels": [label["name"] for label in item.get("labels", [])],
                    })

            return {
                "repository": f"{owner}/{repo}",
                "open_issues": issues,
                "open_pull_requests": prs,
                "total_open_issues": len(issues),
                "total_open_prs": len(prs),
            }

    def save_uploaded_image(self, filename: str, content: bytes) -> str:
        """Save uploaded image to docs/images directory."""
        images_dir = self.docs_path / "images"
        images_dir.mkdir(exist_ok=True)

        # Sanitize filename
        safe_filename = re.sub(r'[^a-zA-Z0-9._-]', '_', filename)
        file_path = images_dir / safe_filename

        # Ensure unique filename
        counter = 1
        original_path = file_path
        while file_path.exists():
            stem = original_path.stem
            suffix = original_path.suffix
            file_path = images_dir / f"{stem}_{counter}{suffix}"
            counter += 1

        with open(file_path, 'wb') as f:
            f.write(content)

        # Return relative path from docs root
        relative_path = file_path.relative_to(self.docs_path)
        return str(relative_path)
