import type { Db } from './db';

function iso(date: Date) { return date.toISOString(); }
function ymd(date: Date) { return date.toISOString().slice(0, 10); }

export async function seedTripmaster(db: Db) {
  if (db.data.tmDrivers.length || db.data.tmRoutes.length || db.data.tmLegs.length) {
    return; // already seeded
  }
  const today = new Date();
  const date = ymd(today);
  // drivers
  db.data.tmDrivers = [
    { id: 1, firstName: 'Ada', lastName: 'Lovelace', displayName: 'Ada L.' },
    { id: 2, firstName: 'Alan', lastName: 'Turing', displayName: 'Alan T.' }
  ];
  // vehicles
  db.data.tmVehicles = [
    { id: 1, number: 'V-101' },
    { id: 2, number: 'V-202' }
  ];
  // routes
  const start1 = new Date(today); start1.setHours(8, 0, 0, 0);
  const end1 = new Date(today); end1.setHours(12, 0, 0, 0);
  const start2 = new Date(today); start2.setHours(12, 0, 0, 0);
  const end2 = new Date(today); end2.setHours(16, 0, 0, 0);
  db.data.tmRoutes = [
    {
      id: 1, routeNumber: 100, description: 'Morning North Loop', date,
      availabilityStart: iso(start1), availabilityEnd: iso(end1), scheduledStart: iso(start1), scheduledEnd: iso(end1),
      driverId: 1, vehicleId: 1, status: 0, seatCapacity: 12, wheelChairCapacity: 1, stretcherCapacity: 0
    },
    {
      id: 2, routeNumber: 200, description: 'Afternoon South Loop', date,
      availabilityStart: iso(start2), availabilityEnd: iso(end2), scheduledStart: iso(start2), scheduledEnd: iso(end2),
      driverId: 2, vehicleId: 2, status: 0, seatCapacity: 12, wheelChairCapacity: 1, stretcherCapacity: 0
    }
  ];
  // trips
  db.data.tmTrips = [
    { id: 1, date, accountCode: 'ACCT1', riderFirstName: 'Grace', riderLastName: 'Hopper' },
    { id: 2, date, accountCode: 'ACCT2', riderFirstName: 'Katherine', riderLastName: 'Johnson' }
  ];
  // legs
  const p1 = new Date(today); p1.setHours(9, 0, 0, 0);
  const d1 = new Date(today); d1.setHours(9, 30, 0, 0);
  const p2 = new Date(today); p2.setHours(13, 0, 0, 0);
  const d2 = new Date(today); d2.setHours(13, 45, 0, 0);
  db.data.tmLegs = [
    {
      id: 1, tripId: 1, priorityType: 0, willCall: 0, willCallReady: 0, comments: '',
      pickupName: 'Home', pickupAddress: '123 Main St', dropoffName: 'Clinic', dropoffAddress: '456 Health Ave',
      pickupScheduledTime: iso(p1), dropoffScheduledTime: iso(d1), seats: 1, wheelChairs: 0, stretchers: 0
    },
    {
      id: 2, tripId: 2, priorityType: 0, willCall: 0, willCallReady: 0, comments: '',
      pickupName: 'Home', pickupAddress: '789 Pine Rd', dropoffName: 'Hospital', dropoffAddress: '101 Care Blvd',
      pickupScheduledTime: iso(p2), dropoffScheduledTime: iso(d2), seats: 1, wheelChairs: 0, stretchers: 0
    },
    {
      id: 3, tripId: 2, priorityType: 0, willCall: 0, willCallReady: 0, comments: 'Holding pen example',
      pickupName: 'Lab', pickupAddress: '202 Tech Way', dropoffName: 'Home', dropoffAddress: '789 Pine Rd',
      pickupScheduledTime: iso(new Date(today.setHours(15, 0, 0, 0))), dropoffScheduledTime: null, seats: 1, wheelChairs: 0, stretchers: 0
    }
  ];
  // assignments
  db.data.tmRouteAssignments = [
    { routeId: 1, legId: 1 },
    { routeId: 2, legId: 2 }
  ];
  await db.write();
}


