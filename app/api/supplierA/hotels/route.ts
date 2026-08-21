import { NextResponse } from 'next/server';

const HOTELS_A = [
  { hotelId: 'a1', name: 'Le Bristol Paris', price: 650, city: 'Paris' },
  { hotelId: 'a2', name: 'Hotel de Crillon', price: 800, city: 'Paris' },
  { hotelId: 'a3', name: 'ibis budget Paris', price: 90, city: 'Paris' },
  { hotelId: 'a4', name: 'Shinjuku Granbell', price: 150, city: 'Tokyo' },
  { hotelId: 'a5', name: 'Park Hyatt Tokyo', price: 400, city: 'Tokyo' },
  { hotelId: 'a6', name: 'The Plaza', price: 500, city: 'New York' },
  { hotelId: 'a7', name: 'Pod 39 Hotel', price: 110, city: 'New York' },
];

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const city = searchParams.get('city') || '';
  const delay = parseInt(searchParams.get('delay') || '0', 10);
  const error = searchParams.get('error') === 'true';
  const empty = searchParams.get('empty') === 'true';

  // 1. Simulate Delay
  if (delay > 0) {
    await new Promise((resolve) => setTimeout(resolve, delay));
  }

  // 2. Simulate Error
  if (error) {
    return new NextResponse('Internal Server Error from Supplier A', { status: 500 });
  }

  // 3. Simulate Empty Response
  if (empty) {
    return NextResponse.json([]);
  }

  // Filter by city
  const filtered = HOTELS_A.filter(
    (h) => h.city.toLowerCase() === city.toLowerCase()
  ).map(({ hotelId, name, price }) => ({ hotelId, name, price }));

  return NextResponse.json(filtered);
}
