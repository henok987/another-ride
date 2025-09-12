// MongoDB initialization script
// This script sets up the initial database structure and indexes

db = db.getSiblingDB('user-service');

// Create collections
db.createCollection('passengers');
db.createCollection('drivers');
db.createCollection('staff');
db.createCollection('admins');
db.createCollection('roles');

// Create indexes for better performance
db.passengers.createIndex({ "externalId": 1 }, { unique: true });
db.passengers.createIndex({ "email": 1 }, { unique: true });
db.passengers.createIndex({ "phone": 1 }, { unique: true });
db.passengers.createIndex({ "isActive": 1 });
db.passengers.createIndex({ "createdAt": -1 });

db.drivers.createIndex({ "externalId": 1 }, { unique: true });
db.drivers.createIndex({ "email": 1 }, { unique: true });
db.drivers.createIndex({ "phone": 1 }, { unique: true });
db.drivers.createIndex({ "vehicleType": 1 });
db.drivers.createIndex({ "isActive": 1 });
db.drivers.createIndex({ "isVerified": 1 });
db.drivers.createIndex({ "rating": -1 });
db.drivers.createIndex({ "createdAt": -1 });

db.staff.createIndex({ "externalId": 1 }, { unique: true });
db.staff.createIndex({ "username": 1 }, { unique: true });
db.staff.createIndex({ "email": 1 }, { unique: true });
db.staff.createIndex({ "employeeId": 1 }, { unique: true });
db.staff.createIndex({ "isActive": 1 });
db.staff.createIndex({ "department": 1 });
db.staff.createIndex({ "createdAt": -1 });

db.admins.createIndex({ "externalId": 1 }, { unique: true });
db.admins.createIndex({ "username": 1 }, { unique: true });
db.admins.createIndex({ "email": 1 }, { unique: true });
db.admins.createIndex({ "isActive": 1 });
db.admins.createIndex({ "adminLevel": 1 });
db.admins.createIndex({ "createdAt": -1 });

db.roles.createIndex({ "name": 1 }, { unique: true });

// Insert default roles
db.roles.insertMany([
  {
    name: 'passenger',
    description: 'Regular passenger user',
    permissions: ['read:own', 'update:own'],
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    name: 'driver',
    description: 'Driver user',
    permissions: ['read:own', 'update:own', 'read:passengers'],
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    name: 'staff',
    description: 'Staff member',
    permissions: ['read:all', 'update:all', 'create:users', 'delete:users'],
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    name: 'admin',
    description: 'Administrator',
    permissions: ['*'],
    createdAt: new Date(),
    updatedAt: new Date()
  }
]);

print('Database initialization completed successfully!');