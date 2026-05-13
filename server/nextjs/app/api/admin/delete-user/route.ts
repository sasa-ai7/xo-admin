import { adminAuth } from '../../../../../firebaseAdmin';
import { deleteUserWithTransactions } from '../../../../../deleteUserWithTransactions';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL?.trim();

export async function POST(request: Request) {
  try {
    if (!ADMIN_EMAIL) {
      return Response.json(
        { ok: false, error: 'Server misconfiguration: ADMIN_EMAIL is not set' },
        { status: 503 }
      );
    }

    const authHeader = request.headers.get('authorization');
    const idToken = authHeader?.startsWith('Bearer ')
      ? authHeader.slice('Bearer '.length)
      : '';

    if (!idToken) {
      return Response.json({ ok: false, error: 'Missing auth token' }, { status: 401 });
    }

    const decodedToken = await adminAuth.verifyIdToken(idToken);
    const callerEmail = decodedToken.email?.trim();
    const isAllowed =
      decodedToken.admin === true ||
      (Boolean(callerEmail) && callerEmail!.toLowerCase() === ADMIN_EMAIL.toLowerCase());

    if (!isAllowed) {
      return Response.json({ ok: false, error: 'Forbidden' }, { status: 403 });
    }

    const body = (await request.json()) as { targetUserUid?: string };
    const targetUserUid = String(body.targetUserUid ?? '').trim();

    if (!targetUserUid) {
      return Response.json({ ok: false, error: 'targetUserUid is required' }, { status: 400 });
    }

    const result = await deleteUserWithTransactions(targetUserUid);

    return Response.json({ ok: true, ...result });
  } catch (error) {
    console.error('Delete user cleanup failed:', error);

    return Response.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : 'Unknown server error',
      },
      { status: 500 }
    );
  }
}
