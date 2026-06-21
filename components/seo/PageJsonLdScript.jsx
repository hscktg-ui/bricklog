/** 페이지별 추가 JSON-LD — layout 기본 그래프와 중복 없음 */
export default function PageJsonLdScript({ graphs = [] }) {
  const payloads = graphs.filter(Boolean);
  if (!payloads.length) return null;

  return (
    <>
      {payloads.map((ld, idx) => (
        <script
          key={idx}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }}
        />
      ))}
    </>
  );
}
