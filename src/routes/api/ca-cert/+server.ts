import { readFileSync } from 'fs';
import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
  const certPath = process.env.CA_CERT_PATH || '/usr/local/share/ca-certificates/teedge-local-ca.crt';

  try {
    const cert = readFileSync(certPath);
    return new Response(cert, {
      headers: {
        'Content-Type': 'application/x-x509-ca-cert',
        'Content-Disposition': 'attachment; filename="teedge-local-ca.crt"'
      }
    });
  } catch {
    throw error(404, 'CA certificate not found');
  }
};
