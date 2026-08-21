import { NextResponse } from 'next/server';
import { getTemporalClient } from '@/temporal/client';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { workflowId } = body;

    if (!workflowId) {
      return new NextResponse('Missing required field: workflowId', { status: 400 });
    }

    const client = await getTemporalClient();
    const handle = client.workflow.getHandle(workflowId);
    
    console.log(`Cancelling hotel search workflow: ${workflowId}`);
    await handle.cancel();

    return NextResponse.json({ success: true, message: 'Search cancellation signal sent' });
  } catch (err: any) {
    console.error('Error cancelling workflow:', err);
    return NextResponse.json({ error: err.message || 'Failed to cancel search' }, { status: 500 });
  }
}
