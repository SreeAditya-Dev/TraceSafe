import * as Minio from 'minio';

const minioClient = new Minio.Client({
    endPoint: process.env.MINIO_ENDPOINT || 'localhost',
    port: parseInt(process.env.MINIO_PORT) || 9000,
    useSSL: false,
    accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
    secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin123',
});

const BUCKET_NAME = process.env.MINIO_BUCKET || 'tracesafe-media';

// Initialize bucket
export const initMinioBucket = async () => {
    try {
        const exists = await minioClient.bucketExists(BUCKET_NAME);
        if (!exists) {
            await minioClient.makeBucket(BUCKET_NAME, 'us-east-1');
            console.log(`✅ MinIO bucket '${BUCKET_NAME}' created`);

            // Set bucket policy to allow public read
            const policy = {
                Version: '2012-10-17',
                Statement: [
                    {
                        Effect: 'Allow',
                        Principal: { AWS: ['*'] },
                        Action: ['s3:GetObject'],
                        Resource: [`arn:aws:s3:::${BUCKET_NAME}/*`],
                    },
                ],
            };
            await minioClient.setBucketPolicy(BUCKET_NAME, JSON.stringify(policy));
        } else {
            console.log(`✅ MinIO bucket '${BUCKET_NAME}' already exists`);
        }
    } catch (err) {
        console.error('❌ MinIO bucket initialization error:', err);
        throw err;
    }
};

// Upload file to MinIO
export const uploadFile = async (fileName, fileBuffer, contentType) => {
    try {
        const objectName = `${Date.now()}-${fileName}`;
        await minioClient.putObject(BUCKET_NAME, objectName, fileBuffer, fileBuffer.length, {
            'Content-Type': contentType,
        });

        const url = `http://${process.env.MINIO_ENDPOINT || 'localhost'}:${process.env.MINIO_PORT || 9000}/${BUCKET_NAME}/${objectName}`;
        return { objectName, url };
    } catch (err) {
        console.error('❌ MinIO upload error:', err);
        throw err;
    }
};

// Get file URL
export const getFileUrl = async (objectName, expiry = 24 * 60 * 60) => {
    try {
        return await minioClient.presignedGetObject(BUCKET_NAME, objectName, expiry);
    } catch (err) {
        console.error('❌ MinIO GetURL error:', err);
        throw err;
    }
};

// Delete file
export const deleteFile = async (objectName) => {
    try {
        await minioClient.removeObject(BUCKET_NAME, objectName);
        return true;
    } catch (err) {
        console.error('❌ MinIO delete error:', err);
        throw err;
    }
};

export { minioClient, BUCKET_NAME };
