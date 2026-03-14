import { ReactNode } from "react";

type Props = {
  title?: string;
  subtitle?: string;
  children: ReactNode;
  right?: ReactNode;
};

export default function PageCard({ title, subtitle, children, right }: Props) {
  return (
    <section
      style={{
        background: "#111827",
        border: "1px solid #1f2937",
        borderRadius: 20,
        padding: 20,
        boxShadow: "0 10px 30px rgba(0,0,0,0.18)",
      }}
    >
      {(title || subtitle || right) && (
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 16,
            alignItems: "flex-start",
            marginBottom: 16,
          }}
        >
          <div>
            {title ? (
              <h2
                style={{
                  margin: 0,
                  fontSize: 22,
                  color: "#ffffff",
                  fontWeight: 800,
                }}
              >
                {title}
              </h2>
            ) : null}
            {subtitle ? (
              <p
                style={{
                  margin: "6px 0 0 0",
                  color: "#9ca3af",
                  fontSize: 14,
                }}
              >
                {subtitle}
              </p>
            ) : null}
          </div>
          {right}
        </div>
      )}

      {children}
    </section>
  );
}