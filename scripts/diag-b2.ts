import dns from 'node:dns';
dns.setDefaultResultOrder('ipv4first');
import { HeadBucketCommand, S3Client } from '@aws-sdk/client-s3';

const endpoint = process.env.OBJECT_STORAGE_ENDPOINT || process.env.S3_ENDPOINT || process.env.B2_ENDPOINT;
const bucket = process.env.OBJECT_STORAGE_BUCKET || process.env.R2_BUCKET || process.env.S3_BUCKET || process.env.B2_BUCKET;
const accessKeyId = process.env.OBJECT_STORAGE_ACCESS_KEY_ID || process.env.B2_KEY_ID!;
const secretAccessKey = process.env.OBJECT_STORAGE_SECRET_ACCESS_KEY || process.env.B2_APPLICATION_KEY!;
console.log(JSON.stringify({ endpoint, bucket, hasKey: !!accessKeyId, hasSecret: !!secretAccessKey }));

const client = new S3Client({ endpoint, region: 'us-east-005', credentials: { accessKeyId, secretAccessKey }, forcePathStyle: true });

client
  .send(new HeadBucketCommand({ Bucket: bucket! }))
  .then(() => console.log('OK'))
  .catch((e) => {
    console.log('ERR name:', e.name, 'message:', e.message);
    console.log('full:', e);
  });
