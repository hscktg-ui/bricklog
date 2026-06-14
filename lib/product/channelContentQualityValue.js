/**
 * 채널 SQV re-export — 구현은 channelQualityStack (순환 import 방지)
 */
export {
  SQV_CHANNEL_VERSION,
  computeChannelContentQualityValue,
  stampChannelContentQualityValue,
  assertChannelContentQualityValueStamped,
} from "@/lib/product/channelQualityStack";
