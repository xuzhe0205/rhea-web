"use client";

type BookmarkIconProps = {
  filled?: boolean;
  busy?: boolean;
  className?: string;
};

export function BookmarkIcon({ filled, busy, className = "" }: BookmarkIconProps) {
  if (busy) {
    return (
      <svg
        width="15"
        height="15"
        viewBox="0 0 24 24"
        aria-hidden="true"
        className={`animate-pulse ${className}`}
      >
        <path
          d="M7 4.75C7 4.33579 7.33579 4 7.75 4H16.25C16.6642 4 17 4.33579 17 4.75V19L12 15.75L7 19V4.75Z"
          fill="currentColor"
          opacity="0.55"
        />
      </svg>
    );
  }

  if (filled) {
    return (
      <svg width="15" height="15" viewBox="0 0 24 24" aria-hidden="true" className={className}>
        <path
          d="M7 4.75C7 4.33579 7.33579 4 7.75 4H16.25C16.6642 4 17 4.33579 17 4.75V19L12 15.75L7 19V4.75Z"
          fill="currentColor"
        />
      </svg>
    );
  }

  return (
    <svg width="15" height="15" viewBox="0 0 24 24" aria-hidden="true" className={className}>
      <path
        d="M7 4.75C7 4.33579 7.33579 4 7.75 4H16.25C16.6642 4 17 4.33579 17 4.75V19L12 15.75L7 19V4.75Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    </svg>
  );
}
