type ErrorBlockProps = {
  title?: string;
  message?: string;
};

export default function ErrorBlock({
  title = "Something went wrong",
  message = "Please try again.",
}: ErrorBlockProps) {
  return (
    <div
      style={{
        border: "1px solid #7f1d1d",
        background: "#450a0a",
        color: "#fecaca",
        borderRadius: 16,
        padding: 24,
      }}
    >
      <div
        style={{
          fontSize: 16,
          fontWeight: 800,
          marginBottom: 8,
        }}
      >
        {title}
      </div>
      <div
        style={{
          fontSize: 14,
          lineHeight: 1.6,
        }}
      >
        {message}
      </div>
    </div>
  );
}