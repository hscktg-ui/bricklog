/** BRICLOG CONTENT DOCTRINE — 상수만 (순환 import 방지) */

export const BRICLOG_CONTENT_DOCTRINE_VERSION = "v2";

export const BRICLOG_CONTENT_NORTH_STAR =
  "조사를 통해 화자가 정보를 완벽히 이해하고, 그 화자의 목적에 맞게 설명한다.";

/** @type {readonly string[]} */
export const BRICLOG_CONTENT_DOCTRINE_LINES = [
  "브릭로그는 새로운 사실을 전달하는 것을 목표로 한다.",
  "좋은 글보다 좋은 설명을 우선한다.",
  "주제를 설명할 수 없는 콘텐츠는 발행하지 않는다.",
];

export const BRICLOG_CONTENT_DOCTRINE_BRIEF = `【BRICLOG CONTENT DOCTRINE · ${BRICLOG_CONTENT_DOCTRINE_VERSION}】
North Star: ${BRICLOG_CONTENT_NORTH_STAR}
${BRICLOG_CONTENT_DOCTRINE_LINES.map((line) => `- ${line}`).join("\n")}
- 검색 문장·범용 안내·분량 패딩·구어 흉내는 새 사실이 아니다.
- 독자가 주제를 이해했는지가 성공 기준이다. 문장이 예쁜지는 부차적이다.
- 주제 설명률·검증 팩트·정보 밀도가 부족하면 작성·발행을 중단한다.`;
