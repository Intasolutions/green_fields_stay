export type UserRole = "RECEPTIONIST" | "MANAGER" | "ADMIN";

export interface CurrentUser {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  role: UserRole;
}

export interface StaffUser {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  role: UserRole;
  is_active: boolean;
  date_joined: string;
}

export interface CreateStaffUserPayload {
  username: string;
  password: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  role: UserRole;
}

export interface TokenPair {
  access: string;
  refresh: string;
}

export type BookingSource =
  | "DIRECT"
  | "MMT"
  | "AGODA"
  | "BOOKING_COM"
  | "GOIBIBO"
  | "OTHER";

export type BookingStatus =
  | "CONFIRMED"
  | "CHECKED_IN"
  | "CHECKED_OUT"
  | "CANCELLED";

export type PaymentType = "ADVANCE" | "SETTLEMENT" | "FULL" | "REFUND";
export type PaymentMethod = "CASH" | "UPI" | "CARD";

export type RoomCategory = "NORMAL" | "DELUXE";
export type BedType = "SINGLE" | "DOUBLE" | "TWIN" | "QUEEN" | "KING";

export interface Room {
  id: number;
  number: string;
  category: RoomCategory;
  is_active: boolean;
  max_occupancy: number;
  bed_type: BedType;
  extra_bed_allowed: boolean;
  extra_bed_charge: string | null;
  amenities: string | null;
}

export interface UpdateRoomPayload {
  number?: string;
  category?: RoomCategory;
  is_active?: boolean;
  max_occupancy?: number;
  bed_type?: BedType;
  extra_bed_allowed?: boolean;
  extra_bed_charge?: string | null;
  amenities?: string | null;
}

export interface RoomAvailabilityBooking {
  booking_id: string;
  guest_name: string;
  profile_tag: string | null;
  check_in: string;
  check_out: string;
  status: BookingStatus;
  source: BookingSource;
  balance_due: string;
}

export interface RoomAvailabilityEntry {
  room: Room;
  is_available: boolean;
  bookings: RoomAvailabilityBooking[];
}

export interface Guest {
  id: string;
  name: string;
  phone: string;
  aadhar_number: string | null;
  created_at: string;
}

export interface Payment {
  id: string;
  booking: string;
  amount: string;
  payment_type: PaymentType;
  payment_method: PaymentMethod;
  transaction_date: string;
  recorded_by: number;
}

export interface BookingRoomAllocation {
  id: number;
  room: number;
  room_number: string;
  room_detail: Room;
}

export interface Companion {
  id: number;
  name: string;
  aadhar_number: string | null;
  phone: string | null;
}

export interface Booking {
  id: string;
  guest: Guest;
  source: BookingSource;
  ota_reference_id: string | null;
  profile_tag: string | null;
  check_in: string;
  check_out: string;
  status: BookingStatus;
  total_amount: string;
  ota_commission: string;
  net_payout: string;
  cancellation_reason: string | null;
  created_at: string;
  allocated_rooms: BookingRoomAllocation[];
  payments: Payment[];
  companions: Companion[];
  balance_due: string;
  amount_paid: string;
}

export interface CreateCompanionPayload {
  name: string;
  aadhar_number?: string | null;
  phone?: string | null;
}

export interface CreateBookingPayload {
  guest: {
    id?: string;
    name?: string;
    phone?: string;
    aadhar_number?: string | null;
  };
  room_ids: number[];
  source: BookingSource;
  ota_reference_id?: string | null;
  profile_tag?: string | null;
  companions?: CreateCompanionPayload[];
  check_in: string;
  check_out: string;
  total_amount: string;
  ota_commission?: string;
  net_payout?: string;
  initial_payment?: {
    amount: string;
    payment_method: PaymentMethod;
    payment_type: PaymentType;
  };
}

export interface EditBookingPayload {
  source?: BookingSource;
  ota_reference_id?: string | null;
  profile_tag?: string | null;
  check_in?: string;
  check_out?: string;
  total_amount?: string;
  ota_commission?: string;
  net_payout?: string;
}

export interface AddPaymentPayload {
  amount: string;
  payment_type: PaymentType;
  payment_method: PaymentMethod;
}

export interface ExpenseCategory {
  id: number;
  name: string;
  tracks_worker_count: boolean;
  tracks_materials: boolean;
  is_active: boolean;
}

export interface Expense {
  id: string;
  date: string;
  category: number;
  category_detail: ExpenseCategory;
  job_details: string;
  worker_count: number | null;
  paid_to: string;
  amount: string;
  materials_purchased: string | null;
  created_by: number;
}

export interface CreateExpensePayload {
  date: string;
  category: number;
  job_details: string;
  worker_count?: number | null;
  paid_to: string;
  amount: string;
  materials_purchased?: string | null;
}

export interface ApiErrorShape {
  [field: string]: string | string[] | ApiErrorShape;
}

export interface FinancialSummaryReport {
  from: string;
  to: string;
  total_booking_revenue: number;
  total_ota_commissions: number;
  total_net_payout: number;
  total_expenses: number;
  expenses_by_category: Record<string, number>;
  net_profit: number;
  booking_count: number;
  average_booking_value: number;
  cancelled_count: number;
  bookings_by_source: Record<BookingSource, number>;
  revenue_by_source: Record<BookingSource, number>;
  payments_by_method: Record<PaymentMethod, number>;
}

export interface OccupancyReportRoom {
  room_number: string;
  nights_booked: number;
  occupancy_percentage: number;
}

export interface OccupancyReport {
  from: string;
  to: string;
  number_of_days: number;
  total_rooms: number;
  total_room_nights_sold: number;
  occupancy_percentage: number;
  rooms: OccupancyReportRoom[];
}
