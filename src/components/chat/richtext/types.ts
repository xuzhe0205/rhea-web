export type MarkdownLeafMark = {
    bold?: boolean;
    italic?: boolean;
    code?: boolean;
    linkHref?: string;
  };
  
  export type MarkdownLeaf = {
    key: string;
    text: string;
    rawStart: number;
    rawEnd: number;
    marks: MarkdownLeafMark;
  };
  
  export type HighlightRange = {
    id: string;
    start: number;
    end: number;
  };
  
  export type HighlightedLeafSegment = {
    key: string;
    text: string;
    rawStart: number;
    rawEnd: number;
    marks: MarkdownLeafMark;
    highlighted: boolean;
  };