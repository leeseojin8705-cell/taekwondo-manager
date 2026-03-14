type EmptyStateProps = {
  title?: string;
  description?: string;
};

export default function EmptyState({
  title = "No data found",
  description = "There is nothing to show right now.",
}: EmptyStateProps) {
  return (
    <div
      style={{
        border: "1px solid #334155",
        background: "#0f172a",
        color: "#cbd5e1",
        borderRadius: 16,
        padding: 24,
      }}
    >
      <div
        style={{
          fontSize: 16,
          fontWeight: 800,
          marginBottom: 8,
          color: "#f8fafc",
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
        {description}
      </div>
    </div>
  );
}