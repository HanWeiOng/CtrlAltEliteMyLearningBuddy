require('dotenv').config();
const { S3Client, ListBucketsCommand } = require('@aws-sdk/client-s3');

// Load environment variables for AWS credentials
const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
const region = process.env.S3_REGION;
const bucketName = process.env.S3_BUCKET_NAME;

console.log('Testing S3 connection with:');
console.log(`Region: ${region}`);
console.log(`Bucket: ${bucketName}`);
console.log(`Access Key ID: ${accessKeyId ? accessKeyId.substring(0, 5) + '...' : 'undefined'}`);
console.log(`Secret Access Key: ${secretAccessKey ? '****' : 'undefined'}`);

// Create S3 client
const s3 = new S3Client({
  region,
  credentials: {
    accessKeyId,
    secretAccessKey
  }
});

async function testS3Connection() {
  try {
    // Try to list buckets to test connection
    const listBucketsCommand = new ListBucketsCommand({});
    const response = await s3.send(listBucketsCommand);
    
    console.log('\n✅ Successfully connected to AWS S3!');
    console.log('Available buckets:');
    response.Buckets.forEach(bucket => {
      console.log(`- ${bucket.Name}${bucket.Name === bucketName ? ' (target bucket)' : ''}`);
    });
    
    if (!response.Buckets.some(bucket => bucket.Name === bucketName)) {
      console.log(`\n⚠️ Warning: The specified bucket "${bucketName}" was not found in your account.`);
    }
    
  } catch (error) {
    console.error('\n❌ Error connecting to AWS S3:');
    console.error(error);
    
    if (error.Code === 'InvalidAccessKeyId') {
      console.log('\nPossible Fix: Your AWS access key ID is invalid. Check your .env file.');
    } else if (error.Code === 'SignatureDoesNotMatch') {
      console.log('\nPossible Fix: Your AWS secret access key is incorrect. Check your .env file.');
    } else if (error.Code === 'AccessDenied') {
      console.log('\nPossible Fix: Your AWS credentials don\'t have permission to list buckets. Check your IAM permissions.');
    }
  }
}

// Run the test
testS3Connection(); 