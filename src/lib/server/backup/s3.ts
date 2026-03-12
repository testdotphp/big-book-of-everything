import { S3Client, PutObjectCommand, GetObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import type { BackupProvider, BackupEntry, S3Config } from './types';

function createClient(config: S3Config) {
	return new S3Client({
		endpoint: config.endpoint || undefined,
		region: config.region || 'us-east-1',
		credentials: {
			accessKeyId: config.accessKeyId,
			secretAccessKey: config.secretAccessKey
		},
		forcePathStyle: true // Required for MinIO, Backblaze, etc.
	});
}

export function createS3Provider(config: S3Config): BackupProvider {
	const prefix = config.prefix ? config.prefix.replace(/\/$/, '') + '/' : '';

	return {
		async upload(buffer: Buffer, filename: string) {
			const client = createClient(config);
			await client.send(new PutObjectCommand({
				Bucket: config.bucket,
				Key: `${prefix}${filename}`,
				Body: buffer,
				ContentType: filename.endsWith('.json') ? 'application/json' : 'application/x-sqlite3'
			}));
		},

		async download(filename: string) {
			const client = createClient(config);
			const res = await client.send(new GetObjectCommand({
				Bucket: config.bucket,
				Key: `${prefix}${filename}`
			}));

			if (!res.Body) throw new Error('Empty response from S3');
			const chunks: Uint8Array[] = [];
			for await (const chunk of res.Body as AsyncIterable<Uint8Array>) {
				chunks.push(chunk);
			}
			return Buffer.concat(chunks);
		},

		async list() {
			const client = createClient(config);
			const res = await client.send(new ListObjectsV2Command({
				Bucket: config.bucket,
				Prefix: prefix,
				MaxKeys: 100
			}));

			const entries: BackupEntry[] = [];
			for (const obj of res.Contents || []) {
				const key = obj.Key || '';
				const filename = key.replace(prefix, '');
				if (filename && (filename.endsWith('.json') || filename.endsWith('.db'))) {
					entries.push({
						filename,
						size: obj.Size || 0,
						modified: obj.LastModified?.toISOString() || ''
					});
				}
			}

			return entries.sort((a, b) => b.modified.localeCompare(a.modified));
		},

		async testConnection() {
			try {
				const client = createClient(config);
				await client.send(new ListObjectsV2Command({
					Bucket: config.bucket,
					Prefix: prefix,
					MaxKeys: 1
				}));
				return { ok: true, message: `Connected to bucket "${config.bucket}"` };
			} catch (err) {
				return { ok: false, message: `Connection failed: ${(err as Error).message}` };
			}
		}
	};
}
