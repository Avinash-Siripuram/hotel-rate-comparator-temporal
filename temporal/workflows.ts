import { proxyActivities, log, ApplicationFailure } from '@temporalio/workflow';
import type * as activities from './activities';
import { SearchInput, HotelInfo } from './shared';

const { fetchSupplierA, fetchSupplierB } = proxyActivities<typeof activities>({
  startToCloseTimeout: '5s', // Automatically times out individual activity calls if they exceed 5 seconds
  retry: {
    initialInterval: '500ms',
    backoffCoefficient: 2,
    maximumAttempts: 3, // Support retry policy: Supplier A fails 2x, succeeds on 3rd attempt
  },
});

export async function hotelSearchWorkflow(input: SearchInput): Promise<HotelInfo> {
  log.info('Hotel search workflow started', { input });

  let supplierAResults: HotelInfo[] = [];
  let supplierBResults: HotelInfo[] = [];
  let aFailed = false;
  let bFailed = false;

  // Run in parallel and catch errors individually
  await Promise.all([
    (async () => {
      try {
        log.info('Fetching from Supplier A...');
        supplierAResults = await fetchSupplierA(input);
      } catch (err) {
        aFailed = true;
        log.error('Supplier A failed or timed out', { err });
      }
    })(),
    (async () => {
      try {
        log.info('Fetching from Supplier B...');
        supplierBResults = await fetchSupplierB(input);
      } catch (err) {
        bFailed = true;
        log.error('Supplier B failed or timed out', { err });
      }
    })(),
  ]);

  // Handle Cancellation/Graceful stoppage check
  // Temporal automatically propagates cancellation to activities and throws if cancelled.

  // Scenario: Both fail
  if (aFailed && bFailed) {
    throw ApplicationFailure.nonRetryable('Both suppliers failed to respond');
  }

  const allHotels: HotelInfo[] = [...supplierAResults, ...supplierBResults];

  // Scenario: Both return empty or no hotels found
  if (allHotels.length === 0) {
    throw ApplicationFailure.nonRetryable('No hotels found');
  }

  // Find the cheapest hotel
  let cheapestHotel: HotelInfo = allHotels[0];
  for (const hotel of allHotels) {
    if (hotel.price < cheapestHotel.price) {
      cheapestHotel = hotel;
    } else if (hotel.price === cheapestHotel.price) {
      // Tie breaker: pick deterministically (Supplier A preferred)
      if (hotel.supplier === 'SupplierA') {
        cheapestHotel = hotel;
      }
    }
  }

  log.info('Cheapest hotel selected', { cheapestHotel });
  return cheapestHotel;
}
