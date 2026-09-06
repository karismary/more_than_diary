import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface MarkdownRenderProps {
  content: string
}

function MarkdownRender({ content }: MarkdownRenderProps) {
  return (
    <div className="diary-content md-body">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    </div>
  )
}

export default MarkdownRender
