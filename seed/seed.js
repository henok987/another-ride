require('dotenv').config();
const { sequelize } = require('../config/database');
const { models } = require('../models');
const { hashPassword } = require('../utils/password');

async function run() {
try {
await sequelize.authenticate();
// Avoid altering schema during seeding to prevent join table PK conflicts
// Schema is created by the app on startup via sequelize.sync()

const permNames = [
'role:create','role:read','role:update','role:delete',
'permission:create','permission:read','permission:update','permission:delete',
'user:read','user:update','admin:create','admin:read','admin:update','admin:delete','driver:approve',
'driver:create','driver:read','driver:update','driver:delete','driver:documents:update','driver:documents:approve',
'passenger:read','passenger:update','passenger:delete',
'staff:create','staff:read','staff:update','staff:delete'
];
const permissions = [];
for (const name of permNames) {
const [perm] = await models.Permission.findOrCreate({ where: { name }, defaults: { name } });
permissions.push(perm);
}

const [superAdminRole] = await models.Role.findOrCreate({ where: { name: 'superadmin' }, defaults: { name: 'superadmin' } });

// Fix RolePermissions table structure if needed
const qi = sequelize.getQueryInterface();
const rolePermDesc = await qi.describeTable('RolePermissions');
if (!rolePermDesc.RoleId) {
  await qi.addColumn('RolePermissions', 'RoleId', {
    type: require('sequelize').DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'roles', key: 'id' },
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE'
  });
  console.log('Added RoleId column to RolePermissions');
}

// Attach all permissions to superadmin
for (const perm of permissions) {
  await sequelize.query(`INSERT IGNORE INTO \`RolePermissions\` (\`RoleId\`, \`PermissionId\`) VALUES (?, ?)`, {
    replacements: [superAdminRole.id, perm.id],
  });
}

const username = 'rootadmin';
const [admin] = await models.Admin.findOrCreate({
where: { username },
defaults: { fullName: 'Root Admin', username, password: await hashPassword('admin123'), email: 'admin@example.com' }
});

// Fix AdminRoles table structure if needed
const adminRoleDesc = await qi.describeTable('AdminRoles');
if (!adminRoleDesc.AdminId) {
  await qi.addColumn('AdminRoles', 'AdminId', {
    type: require('sequelize').DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'admins', key: 'id' },
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE'
  });
  console.log('Added AdminId column to AdminRoles');
}
if (!adminRoleDesc.RoleId) {
  await qi.addColumn('AdminRoles', 'RoleId', {
    type: require('sequelize').DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'roles', key: 'id' },
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE'
  });
  console.log('Added RoleId column to AdminRoles');
}

// If AdminRoles has timestamps, recreate it without them
if (adminRoleDesc.created_at || adminRoleDesc.updated_at) {
  console.log('Recreating AdminRoles table without timestamps...');
  await qi.dropTable('AdminRoles');
  await qi.createTable('AdminRoles', {
    AdminId: {
      type: require('sequelize').DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'admins', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    },
    RoleId: {
      type: require('sequelize').DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'roles', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    }
  });
  console.log('AdminRoles table recreated without timestamps');
}

// Fix PassengerRoles table structure if needed
const passengerRoleDesc = await qi.describeTable('PassengerRoles');
if (!passengerRoleDesc.PassengerId) {
  await qi.addColumn('PassengerRoles', 'PassengerId', {
    type: require('sequelize').DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'passengers', key: 'id' },
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE'
  });
  console.log('Added PassengerId column to PassengerRoles');
}
if (!passengerRoleDesc.RoleId) {
  await qi.addColumn('PassengerRoles', 'RoleId', {
    type: require('sequelize').DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'roles', key: 'id' },
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE'
  });
  console.log('Added RoleId column to PassengerRoles');
}

// Fix DriverRoles table structure if needed
const driverRoleDesc = await qi.describeTable('DriverRoles');
if (!driverRoleDesc.DriverId) {
  await qi.addColumn('DriverRoles', 'DriverId', {
    type: require('sequelize').DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'drivers', key: 'id' },
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE'
  });
  console.log('Added DriverId column to DriverRoles');
}
if (!driverRoleDesc.RoleId) {
  await qi.addColumn('DriverRoles', 'RoleId', {
    type: require('sequelize').DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'roles', key: 'id' },
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE'
  });
  console.log('Added RoleId column to DriverRoles');
}

// Fix StaffRoles table structure if needed
const staffRoleDesc = await qi.describeTable('StaffRoles');
if (!staffRoleDesc.StaffId) {
  await qi.addColumn('StaffRoles', 'StaffId', {
    type: require('sequelize').DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'staff', key: 'id' },
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE'
  });
  console.log('Added StaffId column to StaffRoles');
}
if (!staffRoleDesc.RoleId) {
  await qi.addColumn('StaffRoles', 'RoleId', {
    type: require('sequelize').DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'roles', key: 'id' },
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE'
  });
  console.log('Added RoleId column to StaffRoles');
}

// Attach superadmin role to admin
console.log('Attempting to assign role:', { adminId: admin.id, roleId: superAdminRole.id });

// Try direct INSERT first
try {
  await sequelize.query(`INSERT INTO \`AdminRoles\` (\`AdminId\`, \`RoleId\`) VALUES (?, ?)`, {
    replacements: [admin.id, superAdminRole.id],
  });
  console.log('Role assignment successful');
} catch (error) {
  console.log('Direct INSERT failed:', error.message);
  // Try using Sequelize association
  try {
    await admin.setRoles([superAdminRole]);
    console.log('Sequelize association successful');
  } catch (assocError) {
    console.log('Sequelize association failed:', assocError.message);
  }
}

// Debug: Check what's in AdminRoles table
const adminRolesData = await sequelize.query(`SELECT * FROM AdminRoles WHERE AdminId = ?`, {
  replacements: [admin.id],
  type: sequelize.QueryTypes.SELECT
});
console.log('AdminRoles data:', adminRolesData);

// Debug: Check if superadmin role exists
const superAdminCheck = await models.Role.findByPk(superAdminRole.id);
console.log('Superadmin role exists:', !!superAdminCheck, 'ID:', superAdminRole.id);

// Verify the admin has the superadmin role
const adminWithRoles = await models.Admin.findByPk(admin.id, {
  include: [{ association: 'roles', include: ['permissions'] }]
});
console.log('Admin roles:', adminWithRoles.roles.map(r => r.name));
console.log('Admin permissions:', adminWithRoles.roles.flatMap(r => r.permissions.map(p => p.name)));

console.log('Seed completed. Admin: rootadmin/admin123');
process.exit(0);
} catch (e) {
console.error(e);
process.exit(1);
}
}
run();
