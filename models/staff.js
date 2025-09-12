module.exports = (sequelize, DataTypes) => {
const Staff = sequelize.define('Staff', {
id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
fullName: { type: DataTypes.STRING, allowNull: false },
salary: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
bankAccountNo: { type: DataTypes.STRING },
username: { type: DataTypes.STRING, allowNull: false, unique: true },
password: { type: DataTypes.STRING, allowNull: false },
status: { type: DataTypes.STRING, allowNull: false, defaultValue: 'active' },
}, { tableName: 'staff', underscored: true });
return Staff;
};
