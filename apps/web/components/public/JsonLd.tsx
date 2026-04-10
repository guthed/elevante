type Props = {
  data: Record<string, unknown> | Array<Record<string, unknown>>;
};

export function JsonLd({ data }: Props) {
  return (
    <script
      type="application/ld+json"
      // JSON.stringify output is safe here — all content is static, server-rendered
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
