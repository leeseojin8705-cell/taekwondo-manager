"use client";

type BilingualTextProps = {
  en: string;
  ko: string;
  /** If true, use inline (en and ko on same line). Default: block (ko below en). */
  inline?: boolean;
  style?: React.CSSProperties;
};

const defaultBlockStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 2,
  lineHeight: 1.3,
};

const defaultInlineStyle: React.CSSProperties = {
  display: "inline-flex",
  flexDirection: "column",
  gap: 0,
  alignItems: "flex-start",
  lineHeight: 1.3,
};

export default function BilingualText({
  en,
  ko,
  inline = false,
  style = {},
}: BilingualTextProps) {
  const wrap = inline ? defaultInlineStyle : defaultBlockStyle;
  return (
    <span style={{ ...wrap, ...style }}>
      <span style={{ fontSize: "1.05em", fontWeight: "inherit" }}>{en}</span>
      {ko ? (
        <span style={{ fontSize: "0.72em", opacity: 0.9, color: "inherit" }}>
          {ko}
        </span>
      ) : null}
    </span>
  );
}
