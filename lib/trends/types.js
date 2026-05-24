/** @typedef {'naver'|'google'|'instagram'|'youtube'|'news'|'internal'} TrendSourceId */

/**
 * @typedef {Object} CollectedSignal
 * @property {string} id
 * @property {TrendSourceId} source
 * @property {string} title
 * @property {string} [keyword]
 * @property {string} [snippet]
 * @property {string} [url]
 * @property {string} fetchedAt
 * @property {boolean} verified
 */

/**
 * @typedef {Object} IndustryInsight
 * @property {string} industryKey
 * @property {string} label
 * @property {string[]} risingThemes
 * @property {Object} patterns
 * @property {Object[]} scores
 */

/**
 * @typedef {Object} TrendSnapshot
 * @property {string} dateKst
 * @property {string} collectedAt
 * @property {string} status
 * @property {CollectedSignal[]} signals
 * @property {IndustryInsight[]} industries
 * @property {Object} collectorStatus
 * @property {boolean} hasVerifiedData
 */

export {};
