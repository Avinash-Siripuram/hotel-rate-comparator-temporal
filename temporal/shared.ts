export interface SearchInput {
  city: string;
  checkIn: string;
  checkOut: string;
  options?: {
    supplierA?: {
      delay?: number;
      error?: boolean;
      empty?: boolean;
    };
    supplierB?: {
      delay?: number;
      error?: boolean;
      empty?: boolean;
    };
  };
}

export interface HotelInfo {
  hotelId: string;
  name: string;
  price: number;
  supplier: 'SupplierA' | 'SupplierB';
}

export interface WorkflowStatusUpdate {
  step: 'started' | 'fetching' | 'completed' | 'failed' | 'cancelled';
  message: string;
  timestamp: string;
  result?: HotelInfo;
}
