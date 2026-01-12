"""Service for GitHub issue creation."""
from typing import Optional, Dict, Any, List
import httpx
from datetime import datetime
from app.core.config import settings


class GitHubService:
    """Service for interacting with GitHub API."""

    def __init__(self):
        self.api_url = "https://api.github.com"
        self.token = settings.GITHUB_TOKEN
        self.repo_backend = settings.GITHUB_REPO_BACKEND
        self.repo_frontend = settings.GITHUB_REPO_FRONTEND

    async def create_issue(
        self,
        title: str,
        description: str,
        issue_type: str,  # 'bug' or 'feature'
        user_email: str,
        user_name: str,
        browser_info: str,
        current_url: str,
        ai_improved: bool = False,
        target_repositories: Optional[List[str]] = None  # ["backend"], ["frontend"], or ["backend", "frontend"]
    ) -> Dict[str, Any]:
        """
        Create a GitHub issue with system metadata.

        If target_repositories is None or empty, creates in both repositories.
        """

        if not self.token:
            return {
                "success": False,
                "error": "GitHub integration not configured. Please set GITHUB_TOKEN in environment variables."
            }

        # Default to both repositories if not specified
        if not target_repositories:
            target_repositories = ["backend", "frontend"]

        # Map repository names to full repo paths
        repo_map = {
            "backend": self.repo_backend,
            "frontend": self.repo_frontend
        }

        # Determine labels
        labels = ["user-reported"]
        if issue_type == "bug":
            labels.append("bug")
        else:
            labels.append("enhancement")

        # Build issue body with metadata
        type_emoji = "🐛" if issue_type == "bug" else "✨"
        type_label = "Feilrapport" if issue_type == "bug" else "Funksjonsønske"

        timestamp = datetime.now().strftime("%d.%m.%Y, %H:%M")

        # Track created issues
        created_issues = []
        errors = []

        # Create issues in each target repository
        for repo_name in target_repositories:
            repo_full_path = repo_map.get(repo_name)
            if not repo_full_path:
                errors.append(f"Unknown repository: {repo_name}")
                continue

            # Add repository indicator to body
            repo_indicator = f"\n\n**Repository:** {repo_name.upper()}\n" if len(target_repositories) > 1 else ""

            issue_body = f"""## {type_label}

{description}{repo_indicator}

## Systeminfo

| Felt | Verdi |
|------|-------|
| **Type** | {type_label} {type_emoji} |
| **Repository** | {repo_full_path} |
| **Appversjon** | {settings.APP_NAME} |
| **Rapportert av** | {user_name} |
| **E-post** | {user_email} |
| **Nettleser** | {browser_info} |
| **Side** | {current_url} |
| **Tidspunkt** | {timestamp} |
| **AI-forbedret** | {'Ja' if ai_improved else 'Nei'} |

---
*Denne issue ble automatisk opprettet fra applikasjonen.*
"""

            try:
                async with httpx.AsyncClient() as client:
                    response = await client.post(
                        f"{self.api_url}/repos/{repo_full_path}/issues",
                        headers={
                            "Authorization": f"Bearer {self.token}",
                            "Accept": "application/vnd.github+json",
                            "X-GitHub-Api-Version": "2022-11-28"
                        },
                        json={
                            "title": title,
                            "body": issue_body,
                            "labels": labels
                        },
                        timeout=10.0
                    )

                    if response.status_code == 201:
                        data = response.json()
                        created_issues.append({
                            "repository": repo_name,
                            "url": data["html_url"],
                            "number": data["number"]
                        })
                    else:
                        error_detail = f"GitHub API returned status {response.status_code}"
                        try:
                            error_data = response.json()
                            if "message" in error_data:
                                error_detail = f"GitHub API error: {error_data['message']}"
                        except:
                            pass

                        errors.append(f"{repo_name}: {error_detail}")

            except httpx.TimeoutException:
                errors.append(f"{repo_name}: GitHub API request timed out")
            except httpx.HTTPError as e:
                errors.append(f"{repo_name}: Network error - {str(e)}")
            except Exception as e:
                errors.append(f"{repo_name}: {str(e)}")

        # Return result
        if created_issues:
            # At least one issue was created successfully
            return {
                "success": True,
                "issues": created_issues,
                "issueUrl": created_issues[0]["url"],  # Primary URL (for backward compatibility)
                "issueNumber": created_issues[0]["number"],  # Primary number (for backward compatibility)
                "errors": errors if errors else None
            }
        else:
            # All attempts failed
            return {
                "success": False,
                "error": "; ".join(errors) if errors else "Failed to create issues in any repository"
            }


# Singleton instance
_github_service = None

def get_github_service() -> GitHubService:
    """Get or create GitHub service singleton."""
    global _github_service
    if _github_service is None:
        _github_service = GitHubService()
    return _github_service
