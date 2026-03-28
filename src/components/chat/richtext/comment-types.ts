export type CommentRange = {
  threadId: string;
  start: number;
  end: number;
  createdAt: string;
  updatedAt: string;
};

export type DecoratedLeafSegment = {
  key: string;
  text: string;
  rawStart: number;
  rawEnd: number;
  marks: {
    bold?: boolean;
    italic?: boolean;
    code?: boolean;
    linkHref?: string;
  };
  highlighted: boolean;
  commentThreadIds: string[];
  topCommentThreadId: string | null;
};
