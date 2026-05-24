"use client";

const CAPABILITIES = {
  place: [
    { title: "한 줄 공지", body: "플레이스·지도에 바로 붙일 짧은 소식" },
    { title: "운영·혜택", body: "영업·예약·이벤트를 고객 눈높이로" },
    { title: "이야기 연동", body: "장문 이야기가 있으면 톤·사실을 맞춰 이어 씀" },
  ],
  insta: [
    { title: "캡션·줄바꿈", body: "피드·릴스에 맞는 짧은 문장" },
    { title: "해시태그", body: "지역·주제 태그 묶음" },
    { title: "톤 선택", body: "감성·정보·프로모션 톤 전환" },
  ],
  image: [
    { title: "썸네일 문구", body: "클릭을 부르는 한 줄·카드 카피" },
    { title: "비율·목적", body: "1:1·16:9 등 용도별 프롬프트" },
    { title: "브랜드 톤", body: "이야기·다른 채널 초안과 맞춤" },
  ],
};

export default function ChannelCapabilityCards({ channel, compact = false }) {
  const items = CAPABILITIES[channel];
  if (!items) return null;

  return (
    <div
      className={`grid gap-2 ${compact ? "grid-cols-1" : "sm:grid-cols-3"}`}
      aria-label="이 메뉴에서 할 수 있는 일"
    >
      {items.map((item) => (
        <div
          key={item.title}
          className="rounded-xl border border-[#E8EBED] bg-white px-3 py-3 shadow-sm"
        >
          <p className="text-[12px] font-semibold text-[#191F28]">{item.title}</p>
          <p className="mt-1 text-[11px] leading-relaxed text-[#8B95A1]">
            {item.body}
          </p>
        </div>
      ))}
    </div>
  );
}
