import { NextResponse } from 'next/server';

const HOTELS_B = [
  { hotelId: 'b1', name: 'Le Bristol Paris', price: 630, city: 'Paris' },
  { hotelId: 'b2', name: 'Hotel de Crillon', price: 820, city: 'Paris' },
  { hotelId: 'b3', name: 'ibis budget Paris', price: 90, city: 'Paris' },
  { hotelId: 'b4', name: 'Shinjuku Granbell', price: 140, city: 'Tokyo' },
  { hotelId: 'b5', name: 'Park Hyatt Tokyo', price: 420, city: 'Tokyo' },
  { hotelId: 'b6', name: 'The Plaza', price: 520, city: 'New York' },
  { hotelId: 'b7', name: 'Pod 39 Hotel', price: 105, city: 'New York' },
  { hotelId: 'b8', name: 'The Savoy London', price: 340, city: 'London' },
  { hotelId: 'b9', name: 'Marina Bay Sands Singapore', price: 460, city: 'Singapore' },
  { hotelId: 'b10', name: 'Hotel de Russie Rome', price: 310, city: 'Rome' },
  { hotelId: 'b11', name: 'Burj Al Arab Dubai', price: 880, city: 'Dubai' },
  { hotelId: 'b12', name: 'Park Hyatt Sydney', price: 395, city: 'Sydney' },
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
    return new NextResponse('Internal Server Error from Supplier B', { status: 500 });
  }

  // 3. Simulate Empty Response
  if (empty) {
    return NextResponse.json([]);
  }

  // Filter by city
  const filtered = HOTELS_B.filter(
    (h) => h.city.toLowerCase() === city.toLowerCase()
  ).map(({ hotelId, name, price }) => ({ hotelId, name, price }));

  return NextResponse.json(filtered);
}
