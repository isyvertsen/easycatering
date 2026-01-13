'use client'

import { useEffect, useRef } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import mermaid from 'mermaid'
import 'highlight.js/styles/github.css'

interface MarkdownViewerProps {
  content: string
}

export function MarkdownViewer({ content }: MarkdownViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Initialize mermaid
    mermaid.initialize({
      startOnLoad: true,
      theme: 'default',
      securityLevel: 'strict',
      fontFamily: 'inherit',
    })

    // Render mermaid diagrams
    if (containerRef.current) {
      const mermaidElements = containerRef.current.querySelectorAll('.language-mermaid')
      mermaidElements.forEach((element, index) => {
        const code = element.textContent || ''
        const id = `mermaid-${Date.now()}-${index}`
        const container = document.createElement('div')
        container.id = id
        container.className = 'mermaid-diagram my-4'

        element.parentElement?.replaceWith(container)

        mermaid.render(`mermaid-svg-${id}`, code).then(({ svg }) => {
          container.innerHTML = svg
        }).catch((error) => {
          console.error('Mermaid rendering error:', error)
          container.innerHTML = `<pre class="text-red-600">Feil ved rendering av diagram: ${error.message}</pre>`
        })
      })
    }
  }, [content])

  return (
    <div
      ref={containerRef}
      className="prose prose-slate max-w-none
        prose-headings:font-bold prose-headings:text-gray-900
        prose-h1:text-3xl prose-h1:mb-4 prose-h1:mt-8
        prose-h2:text-2xl prose-h2:mb-3 prose-h2:mt-6 prose-h2:border-b prose-h2:pb-2
        prose-h3:text-xl prose-h3:mb-2 prose-h3:mt-4
        prose-p:text-gray-700 prose-p:leading-7
        prose-a:text-blue-600 prose-a:no-underline hover:prose-a:underline
        prose-code:text-pink-600 prose-code:bg-gray-100 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-code:before:content-none prose-code:after:content-none
        prose-pre:bg-gray-900 prose-pre:text-gray-100 prose-pre:p-4 prose-pre:rounded-lg prose-pre:overflow-x-auto
        prose-ul:list-disc prose-ul:ml-6
        prose-ol:list-decimal prose-ol:ml-6
        prose-li:text-gray-700
        prose-blockquote:border-l-4 prose-blockquote:border-gray-300 prose-blockquote:pl-4 prose-blockquote:italic
        prose-table:border-collapse prose-table:w-full
        prose-th:bg-gray-100 prose-th:p-2 prose-th:border prose-th:border-gray-300 prose-th:text-left
        prose-td:p-2 prose-td:border prose-td:border-gray-300
        prose-img:rounded-lg prose-img:shadow-md"
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={{
          code({ className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || '')
            const language = match ? match[1] : ''

            // Handle mermaid code blocks
            if (language === 'mermaid') {
              return (
                <code className={className} {...props}>
                  {children}
                </code>
              )
            }

            return (
              <code className={className} {...props}>
                {children}
              </code>
            )
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
