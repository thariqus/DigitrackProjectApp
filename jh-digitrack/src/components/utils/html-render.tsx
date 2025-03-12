import { useMemo } from "react";
import DOMPurify from 'dompurify';

type Props = {
  content: string;
  className?: string;
};

export function HtmlRender({ content, className }: Props) {
  const sanitizedContent = useMemo(() => {
    if (!content) return '';
    
    // Replace newlines with <br /> tags
    const processedContent = content.replaceAll("\n", "<br />");
    
    // Sanitize HTML to prevent XSS attacks
    return DOMPurify.sanitize(processedContent, {
      ALLOWED_TAGS: ['br', 'p', 'a', 'ul', 'ol', 'li', 'b', 'i', 'strong', 'em', 'span'],
      ALLOWED_ATTR: ['href', 'target', 'rel']
    });
  }, [content]);

  return (
    <div
      className={className}
      dangerouslySetInnerHTML={{
        __html: sanitizedContent,
      }}
    />
  );
}
