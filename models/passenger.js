module.exports = (sequelize, DataTypes) => {
const Passenger = sequelize.define('Passenger', {
id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
name: { type: DataTypes.STRING, allowNull: false },
phone: { type: DataTypes.STRING, allowNull: false, unique: true },
password: { type: DataTypes.STRING, allowNull: false },
email: { type: DataTypes.STRING, allowNull: true, unique: true },
contractId: { type: DataTypes.STRING, allowNull: true },
wallet: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
rating: { type: DataTypes.FLOAT, defaultValue: 5.0 },
rewardPoints: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
emergencyContacts: { type: DataTypes.TEXT, allowNull: true },
}, { tableName: 'passengers', underscored: true });
return Passenger;
};
