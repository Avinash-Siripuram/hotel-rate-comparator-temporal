import { TestWorkflowEnvironment } from '@temporalio/testing';
import { Worker } from '@temporalio/worker';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { hotelSearchWorkflow } from '@/temporal/workflows';
import { SearchInput, HotelInfo } from '@/temporal/shared';

describe('Hotel Search Workflow Tests', () => {
  let testEnv: TestWorkflowEnvironment;

  beforeAll(async () => {
    // Start local test environment (runs a mini Temporal server in-memory)
    testEnv = await TestWorkflowEnvironment.createTimeSkipping();
  });

  afterAll(async () => {
    await testEnv.teardown();
  });

  async function runWorkflowWithMocks(
    input: SearchInput,
    mockActivities: {
      fetchSupplierA: (inp: SearchInput) => Promise<HotelInfo[]>;
      fetchSupplierB: (inp: SearchInput) => Promise<HotelInfo[]>;
    }
  ): Promise<HotelInfo> {
    const taskQueue = `test-task-queue-${Math.random().toString(36).substr(2, 9)}`;
    
    const worker = await Worker.create({
      connection: testEnv.nativeConnection,
      taskQueue,
      workflowsPath: require.resolve('../temporal/workflows.ts'),
      activities: mockActivities,
    });

    const result = await worker.runUntil(
      testEnv.client.workflow.execute(hotelSearchWorkflow, {
        args: [input],
        taskQueue,
        workflowId: `test-${Math.random()}`,
      })
    );

    return result;
  }

  const defaultInput: SearchInput = {
    city: 'Paris',
    checkIn: '2026-09-01',
    checkOut: '2026-09-05',
  };

  it('Scenario: Supplier A is cheaper -> returns A result', async () => {
    const mocks = {
      fetchSupplierA: async () => [{ hotelId: 'h1', name: 'Hotel A', price: 100, supplier: 'SupplierA' as const }],
      fetchSupplierB: async () => [{ hotelId: 'h2', name: 'Hotel B', price: 150, supplier: 'SupplierB' as const }],
    };

    const result = await runWorkflowWithMocks(defaultInput, mocks);
    expect(result.hotelId).toBe('h1');
    expect(result.price).toBe(100);
    expect(result.supplier).toBe('SupplierA');
  });

  it('Scenario: Supplier B is cheaper -> returns B result', async () => {
    const mocks = {
      fetchSupplierA: async () => [{ hotelId: 'h1', name: 'Hotel A', price: 200, supplier: 'SupplierA' as const }],
      fetchSupplierB: async () => [{ hotelId: 'h2', name: 'Hotel B', price: 120, supplier: 'SupplierB' as const }],
    };

    const result = await runWorkflowWithMocks(defaultInput, mocks);
    expect(result.hotelId).toBe('h2');
    expect(result.price).toBe(120);
    expect(result.supplier).toBe('SupplierB');
  });

  it('Scenario: Both return same rate -> tie break deterministically (Supplier A preferred)', async () => {
    const mocks = {
      fetchSupplierA: async () => [{ hotelId: 'h1', name: 'Hotel A', price: 100, supplier: 'SupplierA' as const }],
      fetchSupplierB: async () => [{ hotelId: 'h2', name: 'Hotel B', price: 100, supplier: 'SupplierB' as const }],
    };

    const result = await runWorkflowWithMocks(defaultInput, mocks);
    expect(result.supplier).toBe('SupplierA');
    expect(result.price).toBe(100);
  });

  it('Scenario: Supplier A fails, B succeeds -> returns B result', async () => {
    const mocks = {
      fetchSupplierA: async () => { throw new Error('A failed'); },
      fetchSupplierB: async () => [{ hotelId: 'h2', name: 'Hotel B', price: 150, supplier: 'SupplierB' as const }],
    };

    const result = await runWorkflowWithMocks(defaultInput, mocks);
    expect(result.hotelId).toBe('h2');
    expect(result.supplier).toBe('SupplierB');
  });

  it('Scenario: Both suppliers fail -> returns error', async () => {
    const mocks = {
      fetchSupplierA: async () => { throw new Error('A failed'); },
      fetchSupplierB: async () => { throw new Error('B failed'); },
    };

    try {
      await runWorkflowWithMocks(defaultInput, mocks);
      expect.fail('Workflow should have thrown an error');
    } catch (err: any) {
      expect(err.name).toBe('WorkflowFailedError');
      expect(err.cause?.message).toBe('Both suppliers failed to respond');
    }
  });

  it('Scenario: One returns empty -> uses available result', async () => {
    const mocks = {
      fetchSupplierA: async () => [],
      fetchSupplierB: async () => [{ hotelId: 'h2', name: 'Hotel B', price: 150, supplier: 'SupplierB' as const }],
    };

    const result = await runWorkflowWithMocks(defaultInput, mocks);
    expect(result.hotelId).toBe('h2');
    expect(result.supplier).toBe('SupplierB');
  });

  it('Scenario: Both return empty -> returns "No hotels found" error', async () => {
    const mocks = {
      fetchSupplierA: async () => [],
      fetchSupplierB: async () => [],
    };

    try {
      await runWorkflowWithMocks(defaultInput, mocks);
      expect.fail('Workflow should have thrown an error');
    } catch (err: any) {
      expect(err.name).toBe('WorkflowFailedError');
      expect(err.cause?.message).toBe('No hotels found');
    }
  });

  it('Scenario: Supplier A fails twice but succeeds on third try -> success within retry policy', async () => {
    let callCount = 0;
    const mocks = {
      fetchSupplierA: async () => {
        callCount++;
        if (callCount < 3) throw new Error('Temporary connection error');
        return [{ hotelId: 'h1', name: 'Hotel A', price: 100, supplier: 'SupplierA' as const }];
      },
      fetchSupplierB: async () => [],
    };

    const result = await runWorkflowWithMocks(defaultInput, mocks);
    expect(result.hotelId).toBe('h1');
    expect(callCount).toBe(3); // Verified retries took place
  });
});
