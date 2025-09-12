module.exports = (sequelize, DataTypes) => {
const Permission = sequelize.define('Permission', {
id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
name: { type: DataTypes.STRING, allowNull: false, unique: true },
}, { tableName: 'permissions', underscored: true });
return Permission;
};
