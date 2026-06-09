type StructuredDataProps = {
  data: Record<string, unknown> | Record<string, unknown>[] | null;
};

export function StructuredData({ data }: StructuredDataProps) {
  if (!data) return null;

  const graphs = Array.isArray(data) ? data : [data];

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(graphs.length === 1 ? graphs[0] : graphs),
      }}
    />
  );
}
