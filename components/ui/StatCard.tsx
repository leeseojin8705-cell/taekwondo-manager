type Props = {
  label: string;
  value: string;
  hint?: string;
};

export default function StatCard({ label, value, hint }: Props) {
  return (
    <div
      style={{
        background: "#111827",
        border: "1px solid #1f2937",
        borderRadius: 18,
        padding: 18,
      }}
    >
      <div
        style={{
          fontSize: 13,
          color: "#93c5fd",
          fontWeight: 700,
          marginBottom: 10,
          textTransform: "uppercase",
          letterSpacing: "0.04em",
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 30,
          fontWeight: 900,
          color: "#ffffff",
        }}
      >
        {value}
      </div>
      {hint ? (
        <div
          style={{
            marginTop: 8,
            color: "#9ca3af",
            fontSize: 13,
          }}
        >
          {hint}
        </div>
      ) : null}
    </div>
  );
}