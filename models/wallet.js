module.exports = (sequelize, DataTypes) => {
const Wallet = sequelize.define('Wallet', {
id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
driverId: { type: DataTypes.INTEGER, allowNull: false },
balance: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
paymentMethod: { type: DataTypes.STRING, allowNull: true },
}, { tableName: 'wallets', underscored: true });
return Wallet;
};

