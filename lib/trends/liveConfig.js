export const LIVE_TREND_REFRESH_MS = 5 * 60 * 1000;
export const LIVE_TREND_STALE_MINUTES = 125;
export const LIVE_TREND_DELAY_MINUTES = 185;
export const LIVE_TREND_TICKER_LIMIT = 5;
export const LIVE_TREND_TOP_LIMIT = 10;
export const LIVE_TREND_RISING_LIMIT = 6;
export const LIVE_TREND_NEW_LIMIT = 6;

export const LIVE_TREND_SCORE_WEIGHTS = {
  searchMomentum: 1.05,
  communityMomentum: 0.95,
  developerMomentum: 1.15,
  modelActivity: 1.1,
  mediaMomentum: 0.9,
  officialMomentum: 1.2,
  recency: 0.85,
};

export const LIVE_TREND_STATUS_THRESHOLDS = {
  hotScore: 88,
  hotHourlyChange: 6,
  risingHourlyChange: 3,
  fallingHourlyChange: -4,
  newWindowHours: 30,
  summaryRegenerationDelta: 8,
  summaryMaxAgeHours: 72,
};

export const LIVE_TREND_SOURCE_CONFIG = {
  huggingface: {
    label: "Hugging Face",
    enabledByDefault: true,
    hourlyBudget: 6,
    dailyBudget: 144,
  },
  official: {
    label: "Official",
    enabledByDefault: true,
    hourlyBudget: 8,
    dailyBudget: 192,
  },
  news: {
    label: "News RSS",
    enabledByDefault: true,
    hourlyBudget: 10,
    dailyBudget: 240,
  },
  github: {
    label: "GitHub",
    enabledByDefault: false,
    hourlyBudget: 12,
    dailyBudget: 288,
    envKey: "GITHUB_TOKEN",
  },
  youtube: {
    label: "YouTube",
    enabledByDefault: false,
    hourlyBudget: 4,
    dailyBudget: 96,
    envKey: "YOUTUBE_DATA_API_KEY",
  },
  reddit: {
    label: "Reddit",
    enabledByDefault: false,
    hourlyBudget: 6,
    dailyBudget: 144,
    envKey: "REDDIT_CLIENT_ID",
  },
  producthunt: {
    label: "Product Hunt",
    enabledByDefault: false,
    hourlyBudget: 2,
    dailyBudget: 48,
    envKey: "PRODUCT_HUNT_TOKEN",
  },
};

export function getLiveSourceConfigs() {
  return Object.entries(LIVE_TREND_SOURCE_CONFIG).map(([id, config]) => {
    const enabled =
      config.enabledByDefault ||
      (config.envKey ? Boolean(process.env[config.envKey]?.trim()) : false);
    return {
      id,
      ...config,
      enabled,
    };
  });
}
