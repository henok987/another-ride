module.exports = (sequelize, DataTypes) => {
const User = sequelize.define('User', {
id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
phone: { type: DataTypes.STRING, allowNull: false, unique: true },
status: { type: DataTypes.ENUM('pending','active'), allowNull: false, defaultValue: 'pending' },
}, { tableName: 'users', underscored: true, timestamps: false });
return User;
};


