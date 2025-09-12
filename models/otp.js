module.exports = (sequelize, DataTypes) => {
const Otp = sequelize.define('Otp', {
id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
phone: { type: DataTypes.STRING, allowNull: false },
hashedSecret: { type: DataTypes.STRING, allowNull: false },
expiresAt: { type: DataTypes.BIGINT, allowNull: false },
attempts: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
status: { type: DataTypes.STRING, allowNull: false, defaultValue: 'pending' },
referenceType: { type: DataTypes.STRING, allowNull: false },
referenceId: { type: DataTypes.INTEGER, allowNull: false },
}, { tableName: 'otps', underscored: true, timestamps: false });
return Otp;
};


