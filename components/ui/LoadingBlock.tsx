type LoadingBlockProps = {
  message?: string;
};

export default function LoadingBlock({
  message = "Loading...",
}: LoadingBlockProps) {
  return (
    <div
      style={{
        border: "1px solid #334155",
        background: "#0f172a",
        color: "#e2e8f0",
        borderRadius: 16,
        padding: 24,
      }}
    >
      <div
        style={{
          fontSize: 15,
          fontWeight: 600,
        }}
      >
        {message}
      </div>
    </div>
  );
}