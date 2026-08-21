import { NextResponse } from 'next/server';
import { getTemporalClient } from '@/temporal/client';
import { hotelSearchWorkflow } from '@/temporal/workflows';
import { SearchInput } from '@/temporal/shared';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { city, checkIn, checkOut, workflowId, options } = body;

    if (!city || !checkIn || !checkOut || !workflowId) {
      return new NextResponse('Missing required fields: city, checkIn, checkOut, workflowId', { status: 400 });
    }

    const client = await getTemporalClient();
    
    // Start the workflow with the client-provided workflowId
    const handle = await client.workflow.start(hotelSearchWorkflow, {
      taskQueue: 'hotel-search-tasks',
      workflowId,
      args: [{ city, checkIn, checkOut, options }],
    });

    console.log(`Started hotel search workflow with ID: ${workflowId}`);

    // Wait for the workflow result
    const result = await handle.result();
    return NextResponse.json(result);
  } catch (err: any) {
    console.error('Error executing hotel search workflow:', err);
    
    // Check if cancellation caused the failure
    if (err.name === 'WorkflowFailedError' && err.cause?.name === 'CancelledFailure') {
      return NextResponse.json({ error: 'Search cancelled by user' }, { status: 499 });
    }

    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
