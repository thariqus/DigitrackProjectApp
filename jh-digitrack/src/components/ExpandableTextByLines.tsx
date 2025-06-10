import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";

interface ExpandableTextByLinesProps {
  text: string;
  maxLines?: number;
  className?: string;
  isHtml?: boolean;
  showMoreText?: string;
  showLessText?: string;
}

export const ExpandableTextByLines: React.FC<ExpandableTextByLinesProps> = ({
  text,
  maxLines = 3,
  className = "",
  isHtml = false,
  showMoreText = "Show more",
  showLessText = "Show less",
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isOverflowing, setIsOverflowing] = useState(false);
  const textRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const checkOverflow = () => {
      if (textRef.current) {
        const element = textRef.current;
        const lineHeight = parseInt(
          window.getComputedStyle(element).lineHeight
        );
        const maxHeight = lineHeight * maxLines;
        setIsOverflowing(element.scrollHeight > maxHeight);
      }
    };

    checkOverflow();
    window.addEventListener("resize", checkOverflow);
    return () => window.removeEventListener("resize", checkOverflow);
  }, [text, maxLines]);

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  if (!text) return null;

  return (
    <div className={className}>
      <div
        ref={textRef}
        className="break-all overflow-wrap-anywhere"
        style={{
          maxHeight: isExpanded ? "none" : `${maxLines * 1.5}em`,
          overflow: "hidden",
          lineHeight: "1.5em",
        }}
      >
        {isHtml ? (
          <div
            dangerouslySetInnerHTML={{
              __html: text.replace(/\n+/g, "<br />"),
            }}
          />
        ) : (
          <div className="whitespace-pre-wrap">{text}</div>
        )}
      </div>

      {isOverflowing && (
        <div className="flex items-center gap-2 mt-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleExpanded}
            className="h-auto p-1 text-xs text-gray-500 hover:text-gray-700"
          >
            {isExpanded ? showLessText : showMoreText}
          </Button>
        </div>
      )}
    </div>
  );
};
