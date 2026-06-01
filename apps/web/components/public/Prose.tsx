import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// Renderar artikelns markdown-brödtext med Editorial Calm-stilar (.prose-elevante).
// Rå HTML renderas medvetet inte (ingen rehype-raw) — innehållet är ren prosa.
export function Prose({ children }: { children: string }) {
  return (
    <div className="prose-elevante">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{children}</ReactMarkdown>
    </div>
  );
}
