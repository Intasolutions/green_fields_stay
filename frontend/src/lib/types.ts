export type UserRole = "RECEPTIONIST" | "MANAGER" | "ADMIN";

export interface CurrentUser {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
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
export type PaymentMethod = "CASH" | "UPI" | "CARD" | "OTA_VCC";

export interface Room {
  id: number;
  number: string;
  is_active: boolean;
}

export interface RoomAvailabilityBooking {
  booking_id: string;
  guest_name: string;
  profile_tag: string | null;
  check_in: string;
  check_out: string;
  status: BookingStatus;
  source: BookingSource;
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
  balance_due: string;
  amount_paid: string;
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

export interface AddPaymentPayload {
  amount: string;
  payment_type: PaymentType;
  payment_method: PaymentMethod;
}

export type ExpenseCategory =
  | "LABOR"
  | "MATERIALS"
  | "UTILITIES"
  | "MAINTENANCE"
  | "OTHER";

export interface Expense {
  id: string;
  date: string;
  category: ExpenseCategory;
  job_details: string;
  worker_count: number | null;
  paid_to: string;
  amount: string;
  materials_purchased: string | null;
  created_by: number;
}

export interface CreateExpensePayload {
  date: string;
  category: ExpenseCategory;
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
  expenses_by_category: Record<ExpenseCategory, number>;
  net_profit: number;
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
