import { Worker, NativeConnection } from '@temporalio/worker';
import * as activities from './activities';

const TEMPORAL_ADDRESS = process.env.TEMPORAL_ADDRESS || 'localhost:7233';
const TASK_QUEUE = 'hotel-search-tasks';

async function run() {
  console.log(`Connecting to Temporal Server at ${TEMPORAL_ADDRESS}...`);
  const connection = await NativeConnection.connect({
    address: TEMPORAL_ADDRESS,
  });

  console.log(`Starting Temporal Worker...`);
  
  const worker = await Worker.create({
    workflowsPath: require.resolve('./workflows'),
    activities,
    taskQueue: TASK_QUEUE,
    connection,
  });

  console.log(`Worker registered successfully on task queue: ${TASK_QUEUE}`);
  await worker.run();
}

run().catch((err) => {
  console.error('Fatal error in Temporal Worker:', err);
  process.exit(1);
});
