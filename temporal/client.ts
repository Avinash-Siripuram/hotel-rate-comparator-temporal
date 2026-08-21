import { Connection, Client } from '@temporalio/client';

const TEMPORAL_ADDRESS = process.env.TEMPORAL_ADDRESS || 'localhost:7233';

let clientInstance: Client | null = null;

export async function getTemporalClient(): Promise<Client> {
  if (clientInstance) return clientInstance;

  const connection = await Connection.connect({
    address: TEMPORAL_ADDRESS,
  });

  clientInstance = new Client({
    connection,
    // Use the default namespace
  });

  return clientInstance;
}
