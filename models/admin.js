module.exports = (sequelize, DataTypes) => {
const Admin = sequelize.define('Admin', {
id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
fullName: { type: DataTypes.STRING, allowNull: false },
username: { type: DataTypes.STRING, allowNull: false, unique: true },
password: { type: DataTypes.STRING, allowNull: false },
email: { type: DataTypes.STRING, allowNull: true, unique: true },
}, { tableName: 'admins', underscored: true });
return Admin;
};
