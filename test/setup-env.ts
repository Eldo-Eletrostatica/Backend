// The integration tests upload and delete files, so they use their own bucket
// instead of the development one. The public URL ends with the bucket name.
const TEST_BUCKET_SUFFIX = '-test';

process.env.S3_BUCKET = `${process.env.S3_BUCKET}${TEST_BUCKET_SUFFIX}`;
process.env.S3_PUBLIC_URL = `${process.env.S3_PUBLIC_URL}${TEST_BUCKET_SUFFIX}`;
