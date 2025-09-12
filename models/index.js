const { Sequelize, DataTypes, Op } = require('sequelize');
const { sequelize } = require('../config/database');

const PassengerModel = require('./passenger');
const DriverModel = require('./driver');
const StaffModel = require('./staff');
const RoleModel = require('./role');
const PermissionModel = require('./permission');
const AdminModel = require('./admin');
const WalletModel = require('./wallet');
const OtpModel = require('./otp');
const UserModel = require('./user');

const Passenger = PassengerModel(sequelize, DataTypes);
const Driver = DriverModel(sequelize, DataTypes);
const Staff = StaffModel(sequelize, DataTypes);
const Role = RoleModel(sequelize, DataTypes);
const Permission = PermissionModel(sequelize, DataTypes);
const Admin = AdminModel(sequelize, DataTypes);
const Wallet = WalletModel(sequelize, DataTypes);
const Otp = OtpModel(sequelize, DataTypes);
const User = UserModel(sequelize, DataTypes);

// Roles and permissions (explicit FK names to match existing schema)
Role.belongsToMany(Permission, {
  through: { model: 'RolePermissions', timestamps: false, attributes: [] },
  as: 'permissions',
  foreignKey: { name: 'RoleId', field: 'RoleId' },
  otherKey: { name: 'PermissionId', field: 'PermissionId' },
});
Permission.belongsToMany(Role, {
  through: { model: 'RolePermissions', timestamps: false, attributes: [] },
  as: 'roles',
  foreignKey: { name: 'PermissionId', field: 'PermissionId' },
  otherKey: { name: 'RoleId', field: 'RoleId' },
});

// Attach roles to all user types (explicit FK names)
Passenger.belongsToMany(Role, {
  through: { model: 'PassengerRoles', timestamps: false, attributes: [] },
  as: 'roles',
  foreignKey: { name: 'PassengerId', field: 'PassengerId' },
  otherKey: { name: 'RoleId', field: 'RoleId' },
});
Role.belongsToMany(Passenger, {
  through: { model: 'PassengerRoles', timestamps: false, attributes: [] },
  as: 'passengers',
  foreignKey: { name: 'RoleId', field: 'RoleId' },
  otherKey: { name: 'PassengerId', field: 'PassengerId' },
});

Driver.belongsToMany(Role, {
  through: { model: 'DriverRoles', timestamps: false, attributes: [] },
  as: 'roles',
  foreignKey: { name: 'DriverId', field: 'DriverId' },
  otherKey: { name: 'RoleId', field: 'RoleId' },
});
Role.belongsToMany(Driver, {
  through: { model: 'DriverRoles', timestamps: false, attributes: [] },
  as: 'drivers',
  foreignKey: { name: 'RoleId', field: 'RoleId' },
  otherKey: { name: 'DriverId', field: 'DriverId' },
});

Staff.belongsToMany(Role, {
  through: { model: 'StaffRoles', timestamps: false, attributes: [] },
  as: 'roles',
  foreignKey: { name: 'StaffId', field: 'StaffId' },
  otherKey: { name: 'RoleId', field: 'RoleId' },
});
Role.belongsToMany(Staff, {
  through: { model: 'StaffRoles', timestamps: false, attributes: [] },
  as: 'staffMembers',
  foreignKey: { name: 'RoleId', field: 'RoleId' },
  otherKey: { name: 'StaffId', field: 'StaffId' },
});

Admin.belongsToMany(Role, {
  through: { model: 'AdminRoles', timestamps: false, attributes: [] },
  as: 'roles',
  foreignKey: { name: 'AdminId', field: 'AdminId' },
  otherKey: { name: 'RoleId', field: 'RoleId' },
});
Role.belongsToMany(Admin, {
  through: { model: 'AdminRoles', timestamps: false, attributes: [] },
  as: 'admins',
  foreignKey: { name: 'RoleId', field: 'RoleId' },
  otherKey: { name: 'AdminId', field: 'AdminId' },
});

// Wallet associations (alias to avoid collision with Driver.wallet attribute)
Driver.hasOne(Wallet, {
  as: 'walletAccount',
  foreignKey: { name: 'driverId', field: 'driver_id' },
});
Wallet.belongsTo(Driver, {
  as: 'driver',
  foreignKey: { name: 'driverId', field: 'driver_id' },
});

module.exports = {
sequelize,
Sequelize,
DataTypes,
Op,
models: { Passenger, Driver, Staff, Role, Permission, Admin, Wallet, Otp, User },
};
