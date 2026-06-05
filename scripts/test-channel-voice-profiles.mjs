/**
 * 채널별 음성 프로필 검증 (블로그 / 스마트플레이스 / 인스타)
 */
import { loadExperienceVoiceProfile } from "../lib/content/experienceVoiceProfile.js";
import { loadSmartPlaceVoiceProfile, scoreSmartPlaceVoice, buildSmartPlaceVoicePromptBlock } from "../lib/channel/smartPlaceVoiceProfile.js";
import {
  loadInstagramVoiceProfile,
  scoreInstagramVoice,
  buildInstagramVoicePromptBlock,
} from "../lib/channel/instagramVoiceProfile.js";
import { PLACE_CHANNEL } from "../styles/channels/placeStyle.js";
import { INSTAGRAM_CHANNEL } from "../styles/channels/instagramStyle.js";

const placePack = {
  title: "[이벤트] 파주 매장 오피모 전시 안내",
  shortNotice: "4월 한 달, 파주 매장에서 오피모 라인업 전시·체험 진행 중입니다.",
  detailBody:
    "에이스침대 파주 매장에서 오피모 전시를 준비했습니다. 체험 가능 모델과 행사 조건은 방문 전 플레이스에서 확인해 주세요. 평일 오전 예약 시 대기 없이 상담 가능합니다.",
};

const instaPack = {
  hook: "파주까지 갈 만한 이유",
  body: "오피모 전시,\n누워보니 감이 와요.\n생각보다 조용한 쇼룸.",
  ending: "주말엔 사람 많더라고요",
  lineBreakBody:
    "파주까지 갈 만한 이유\n\n오피모 전시,\n누워보니 감이 와요.\n생각보다 조용한 쇼룸.\n\n주말엔 사람 많더라고요",
};

console.log("=== channel voice profiles ===\n");

const blogProfile = loadExperienceVoiceProfile();
console.log("blog experience:", blogProfile.sampleCount, "samples", blogProfile.rates || {});

const placeProfile = loadSmartPlaceVoiceProfile();
console.log("smartplace:", placeProfile.sampleCount, "samples", placeProfile.source, placeProfile.rates || {});

const instaProfile = loadInstagramVoiceProfile();
console.log("instagram:", instaProfile.sampleCount, "samples", instaProfile.source, instaProfile.rates || {});

const placeText = [placePack.title, placePack.shortNotice, placePack.detailBody].join("\n");
const instaText = instaPack.lineBreakBody || [instaPack.hook, instaPack.body, instaPack.ending].join("\n");

const placeScore = scoreSmartPlaceVoice(placeText);
const instaScore = scoreInstagramVoice(instaText);

console.log("\nplace score:", placeScore.score, placeScore.ok, "owner:", placeScore.ownerHits, "leak:", placeScore.blogLeakHits);
console.log("insta score:", instaScore.score, instaScore.ok, "voice:", instaScore.voiceHits, "leak:", instaScore.leakHits);

console.log("\n--- smartplace prompt (excerpt) ---");
console.log(buildSmartPlaceVoicePromptBlock().split("\n").slice(0, 8).join("\n"));

console.log("\n--- instagram prompt (excerpt) ---");
console.log(buildInstagramVoicePromptBlock().split("\n").slice(0, 8).join("\n"));

const placeBanned = PLACE_CHANNEL.banned.filter((p) => placeText.includes(p));
const instaBanned = INSTAGRAM_CHANNEL.banned.filter((p) => instaText.includes(p));
console.log("\nplace banned hits:", placeBanned.length);
console.log("insta banned hits:", instaBanned.length);

if (!placeScore.ok || !instaScore.ok) process.exitCode = 1;
