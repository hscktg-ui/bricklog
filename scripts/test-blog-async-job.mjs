/**
 * blog async job store — memory fallback helpers
 * Run: npm run test:blog-async-job
 */
import {
  createBlogAsyncJob,
  getBlogAsyncJob,
  markBlogAsyncJobRunning,
  completeBlogAsyncJob,
  blogAsyncJobSnapshot,
} from "../lib/generation/blogAsyncJob.js";

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const userId = "user-test-1";
const job = await createBlogAsyncJob({
  supabase: null,
  userId,
  rawInput: { topic: "테스트" },
  planId: "free",
});
assert(job.id, "job id");
assert(job.status === "pending", "pending");

const claimed = await markBlogAsyncJobRunning({
  supabase: null,
  jobId: job.id,
  userId,
});
assert(claimed?.status === "running", "running");

await completeBlogAsyncJob({
  supabase: null,
  jobId: job.id,
  userId,
  resultBody: {
    ok: true,
    blogContent: { sections: [{ heading: "a", body: "b" }] },
  },
});

const done = await getBlogAsyncJob({
  supabase: null,
  jobId: job.id,
  userId,
});
assert(done?.status === "done", "done");
assert(blogAsyncJobSnapshot(done).sectionCount === 1, "sections");

console.log("PASS: blog-async-job");
