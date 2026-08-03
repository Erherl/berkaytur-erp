/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface IUser {
  id: string;
  name: string;
  username: string;
  passwordHash: string;
  role: string;
  email: string;
  phone: string;
  status: string;
  schoolId?: string;
  vehicleId?: string;
}

export interface IVehicle {
  id: string;
  plate: string;
  brand: string;
  model: string;
  year: string;
  capacity: number;
  driverId: string;
  driverName: string;
  hostessId?: string;
  hostessName?: string;
  status: string;
  schoolId?: string;
  schoolName?: string;
  seating?: Record<number, string>;
  history?: any[];
}

export interface IPayment {
  id: string;
  studentId: string;
  studentName: string;
  parentName: string;
  amount: number;
  dueDate: string;
  paymentDate?: string;
  status: string;
  category: string;
  description: string;
  paymentMethod?: string;
  currency?: string;
}

export interface IContract {
  id: string;
  studentId: string;
  studentName: string;
  parentName: string;
  annualFee: number;
  term: string;
  version: number;
  status: string;
  createdAt: string;
  history: any[];
}
