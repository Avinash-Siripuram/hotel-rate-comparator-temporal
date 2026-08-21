import { SearchInput, HotelInfo } from './shared';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3000';

export async function fetchSupplierA(input: SearchInput): Promise<HotelInfo[]> {
  const url = new URL(`${BACKEND_URL}/api/supplierA/hotels`);
  url.searchParams.append('city', input.city);
  
  if (input.options?.supplierA) {
    const { delay, error, empty } = input.options.supplierA;
    if (delay) url.searchParams.append('delay', delay.toString());
    if (error) url.searchParams.append('error', 'true');
    if (empty) url.searchParams.append('empty', 'true');
  }

  const response = await fetch(url.toString());
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Supplier A failed: ${errorText}`);
  }

  const data = (await response.json()) as Omit<HotelInfo, 'supplier'>[];
  return data.map((h) => ({
    ...h,
    supplier: 'SupplierA',
  }));
}

export async function fetchSupplierB(input: SearchInput): Promise<HotelInfo[]> {
  const url = new URL(`${BACKEND_URL}/api/supplierB/hotels`);
  url.searchParams.append('city', input.city);

  if (input.options?.supplierB) {
    const { delay, error, empty } = input.options.supplierB;
    if (delay) url.searchParams.append('delay', delay.toString());
    if (error) url.searchParams.append('error', 'true');
    if (empty) url.searchParams.append('empty', 'true');
  }

  const response = await fetch(url.toString());
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Supplier B failed: ${errorText}`);
  }

  const data = (await response.json()) as Omit<HotelInfo, 'supplier'>[];
  return data.map((h) => ({
    ...h,
    supplier: 'SupplierB',
  }));
}
