'use client'

import { useEffect, useState } from 'react'
import { ExternalLink, GitPullRequest, AlertCircle, CheckCircle2, Clock } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

interface GitHubIssue {
  number: number
  title: string
  state: 'open' | 'closed'
  html_url: string
  created_at: string
  user: {
    login: string
  }
  labels: Array<{
    name: string
    color: string
  }>
  repository_url: string
}

interface GitHubPR {
  number: number
  title: string
  state: 'open' | 'closed'
  html_url: string
  created_at: string
  user: {
    login: string
  }
  draft: boolean
  repository_url?: string
}

export function GitHubIntegration() {
  const [issues, setIssues] = useState<GitHubIssue[]>([])
  const [pullRequests, setPullRequests] = useState<GitHubPR[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // GitHub repository (kan konfigureres via environment variables)
  const GITHUB_REPOS = [
    'isyvertsen/easycatering'
  ]
  const GITHUB_API = 'https://api.github.com'

  useEffect(() => {
    fetchGitHubData()
  }, [])

  const fetchGitHubData = async () => {
    try {
      setLoading(true)
      setError(null)

      // Fetch issues from all repositories
      const issuesPromises = GITHUB_REPOS.map(repo =>
        fetch(
          `${GITHUB_API}/repos/${repo}/issues?state=open&per_page=10`,
          {
            headers: {
              'Accept': 'application/vnd.github.v3+json',
            },
          }
        )
      )

      const issuesResponses = await Promise.all(issuesPromises)

      // Check if all responses are ok
      const failedResponse = issuesResponses.find(r => !r.ok)
      if (failedResponse) {
        throw new Error('Kunne ikke hente issues fra GitHub')
      }

      // Parse all responses and combine issues
      const allIssuesData = await Promise.all(
        issuesResponses.map(response => response.json())
      )

      // Flatten and filter out pull requests (GitHub API returns PRs as issues)
      const allIssues = allIssuesData
        .flat()
        .filter((item: any) => !item.pull_request)
        .sort((a: any, b: any) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )

      setIssues(allIssues)

      // Fetch pull requests from all repositories
      const prsPromises = GITHUB_REPOS.map(repo =>
        fetch(
          `${GITHUB_API}/repos/${repo}/pulls?state=open&per_page=10`,
          {
            headers: {
              'Accept': 'application/vnd.github.v3+json',
            },
          }
        )
      )

      const prsResponses = await Promise.all(prsPromises)

      // Check if all responses are ok
      const failedPrResponse = prsResponses.find(r => !r.ok)
      if (failedPrResponse) {
        throw new Error('Kunne ikke hente pull requests fra GitHub')
      }

      // Parse all responses and combine PRs
      const allPrsData = await Promise.all(
        prsResponses.map(response => response.json())
      )

      const allPrs = allPrsData
        .flat()
        .sort((a: any, b: any) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )

      setPullRequests(allPrs)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ukjent feil')
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return new Intl.DateTimeFormat('no-NO', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(date)
  }

  const getRepoName = (repositoryUrl: string) => {
    // Extract repo name from URL like "https://api.github.com/repos/isyvertsen/easycatering"
    const parts = repositoryUrl.split('/')
    const repoName = parts[parts.length - 1]
    return repoName
  }

  const getStateIcon = (state: string, draft?: boolean) => {
    if (draft) {
      return <Clock className="h-4 w-4 text-muted-foreground" />
    }
    return state === 'open' ? (
      <AlertCircle className="h-4 w-4 text-green-600" />
    ) : (
      <CheckCircle2 className="h-4 w-4 text-purple-600" />
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-muted-foreground">Laster GitHub-data...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
        <div className="flex items-center gap-2 text-destructive">
          <AlertCircle className="h-5 w-5" />
          <span>{error}</span>
        </div>
        <p className="mt-2 text-sm text-destructive/80">
          Sjekk at repository-navnet er korrekt og at du har tilgang til GitHub API.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="issues" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="issues">
            Issues ({issues.length})
          </TabsTrigger>
          <TabsTrigger value="prs">
            Pull Requests ({pullRequests.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="issues" className="space-y-4">
          {issues.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Ingen åpne issues
            </div>
          ) : (
            <div className="space-y-3">
              {issues.map((issue) => (
                <div
                  key={issue.number}
                  className="border border-border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    {getStateIcon(issue.state)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-medium flex-1">
                          {issue.title}
                        </h3>
                        <a
                          href={issue.html_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 flex-shrink-0"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </div>
                      <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                        <Badge variant="secondary" className="text-xs">
                          {getRepoName(issue.repository_url)}
                        </Badge>
                        <span>#{issue.number}</span>
                        <span>•</span>
                        <span>åpnet {formatDate(issue.created_at)}</span>
                        <span>•</span>
                        <span>{issue.user.login}</span>
                      </div>
                      {issue.labels.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {issue.labels.map((label) => (
                            <Badge
                              key={label.name}
                              variant="outline"
                              style={{
                                backgroundColor: `#${label.color}20`,
                                borderColor: `#${label.color}`,
                                color: `#${label.color}`,
                              }}
                            >
                              {label.name}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="prs" className="space-y-4">
          {pullRequests.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Ingen åpne pull requests
            </div>
          ) : (
            <div className="space-y-3">
              {pullRequests.map((pr) => (
                <div
                  key={pr.number}
                  className="border border-border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <GitPullRequest className="h-4 w-4 text-green-600 mt-1" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-medium flex-1">
                          {pr.title}
                          {pr.draft && (
                            <Badge variant="outline" className="ml-2">
                              Draft
                            </Badge>
                          )}
                        </h3>
                        <a
                          href={pr.html_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 flex-shrink-0"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </div>
                      <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                        {pr.repository_url && (
                          <>
                            <Badge variant="secondary" className="text-xs">
                              {getRepoName(pr.repository_url)}
                            </Badge>
                          </>
                        )}
                        <span>#{pr.number}</span>
                        <span>•</span>
                        <span>åpnet {formatDate(pr.created_at)}</span>
                        <span>•</span>
                        <span>{pr.user.login}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <div className="border-t border-border pt-4">
        <div className="flex flex-col gap-2">
          <p className="text-sm text-muted-foreground font-medium">GitHub Repositories:</p>
          {GITHUB_REPOS.map(repo => (
            <a
              key={repo}
              href={`https://github.com/${repo}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 text-sm flex items-center gap-2"
            >
              <ExternalLink className="h-4 w-4" />
              {repo}
            </a>
          ))}
        </div>
      </div>
    </div>
  )
}
