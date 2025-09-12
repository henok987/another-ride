require('dotenv').config();
const { sequelize } = require('../config/database');
const { DataTypes } = require('sequelize');

async function migrate() {
  try {
    console.log('Starting migration...');
    
    // Add email and emergencyContacts to passengers if they don't exist
    try {
      await sequelize.getQueryInterface().addColumn('passengers', 'email', {
        type: DataTypes.STRING,
        allowNull: true,
        unique: true
      });
      console.log('Added email column to passengers table');
    } catch (error) {
      if (error.message.includes('Duplicate column name')) {
        console.log('email column already exists in passengers table');
      } else {
        console.error('Error adding email to passengers:', error.message);
      }
    }

    // Add status to staff if missing
    try {
      await sequelize.getQueryInterface().addColumn('staff', 'status', {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'active'
      });
      console.log('Added status column to staff table');
    } catch (error) {
      if (error.message.includes('Duplicate column name')) {
        console.log('status column already exists in staff table');
      } else {
        console.error('Error adding status to staff:', error.message);
      }
    }

    try {
      await sequelize.getQueryInterface().addColumn('passengers', 'contract_id', {
        type: DataTypes.STRING,
        allowNull: true
      });
      console.log('Added contract_id column to passengers table');
    } catch (error) {
      if (error.message.includes('Duplicate column name')) {
        console.log('contract_id column already exists in passengers table');
      } else {
        console.error('Error adding contract_id to passengers:', error.message);
      }
    }

    try {
      await sequelize.getQueryInterface().addColumn('passengers', 'emergency_contacts', {
        type: DataTypes.TEXT,
        allowNull: true
      });
      console.log('Added emergency_contacts column to passengers table');
    } catch (error) {
      if (error.message.includes('Duplicate column name')) {
        console.log('emergency_contacts column already exists in passengers table');
      } else {
        console.error('Error adding emergency_contacts to passengers:', error.message);
      }
    }

    // Drop rating_count from passengers if it exists
    try {
      await sequelize.getQueryInterface().removeColumn('passengers', 'rating_count');
      console.log('Removed rating_count column from passengers table');
    } catch (error) {
      console.log('Skipping removing rating_count from passengers:', error.message);
    }

    // Add email and emergencyContacts to drivers if they don't exist
    try {
      await sequelize.getQueryInterface().addColumn('drivers', 'email', {
        type: DataTypes.STRING,
        allowNull: true,
        unique: true
      });
      console.log('Added email column to drivers table');
    } catch (error) {
      if (error.message.includes('Duplicate column name')) {
        console.log('email column already exists in drivers table');
      } else {
        console.error('Error adding email to drivers:', error.message);
      }
    }

    // Create wallets table if it doesn't exist
    try {
      const qi = sequelize.getQueryInterface();
      const tables = await qi.showAllTables();
      const hasWallets = Array.isArray(tables) && tables.map(t => (typeof t === 'object' ? t.tableName || t.table_name : t)).includes('wallets');
      if (!hasWallets) {
        await qi.createTable('wallets', {
          id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
          driver_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: { model: 'drivers', key: 'id' },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE'
          },
          balance: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
          payment_method: { type: DataTypes.STRING, allowNull: true },
        });
        console.log('Created wallets table');
      } else {
        console.log('wallets table already exists');
      }
    } catch (error) {
      console.error('Error creating wallets table:', error.message);
    }

    try {
      await sequelize.getQueryInterface().addColumn('drivers', 'emergency_contacts', {
        type: DataTypes.TEXT,
        allowNull: true
      });
      console.log('Added emergency_contacts column to drivers table');
    } catch (error) {
      if (error.message.includes('Duplicate column name')) {
        console.log('emergency_contacts column already exists in drivers table');
      } else {
        console.error('Error adding emergency_contacts to drivers:', error.message);
      }
    }

    // Add driver document fields if they don't exist
    try {
      await sequelize.getQueryInterface().addColumn('drivers', 'national_id_file', {
        type: DataTypes.STRING,
        allowNull: true
      });
      console.log('Added national_id_file column to drivers table');
    } catch (error) {
      if (error.message.includes('Duplicate column name')) {
        console.log('national_id_file column already exists in drivers table');
      } else {
        console.error('Error adding national_id_file to drivers:', error.message);
      }
    }

    try {
      await sequelize.getQueryInterface().addColumn('drivers', 'vehicle_registration_file', {
        type: DataTypes.STRING,
        allowNull: true
      });
      console.log('Added vehicle_registration_file column to drivers table');
    } catch (error) {
      if (error.message.includes('Duplicate column name')) {
        console.log('vehicle_registration_file column already exists in drivers table');
      } else {
        console.error('Error adding vehicle_registration_file to drivers:', error.message);
      }
    }

    try {
      await sequelize.getQueryInterface().addColumn('drivers', 'insurance_file', {
        type: DataTypes.STRING,
        allowNull: true
      });
      console.log('Added insurance_file column to drivers table');
    } catch (error) {
      if (error.message.includes('Duplicate column name')) {
        console.log('insurance_file column already exists in drivers table');
      } else {
        console.error('Error adding insurance_file to drivers:', error.message);
      }
    }

    try {
      await sequelize.getQueryInterface().addColumn('drivers', 'insurance_expiry', {
        type: DataTypes.DATE,
        allowNull: true
      });
      console.log('Added insurance_expiry column to drivers table');
    } catch (error) {
      if (error.message.includes('Duplicate column name')) {
        console.log('insurance_expiry column already exists in drivers table');
      } else {
        console.error('Error adding insurance_expiry to drivers:', error.message);
      }
    }

    try {
      await sequelize.getQueryInterface().addColumn('drivers', 'document_status', {
        type: DataTypes.STRING,
        allowNull: true
      });
      console.log('Added document_status column to drivers table');
    } catch (error) {
      if (error.message.includes('Duplicate column name')) {
        console.log('document_status column already exists in drivers table');
      } else {
        console.error('Error adding document_status to drivers:', error.message);
      }
    }

    // Drop rating_count from drivers if it exists
    try {
      await sequelize.getQueryInterface().removeColumn('drivers', 'rating_count');
      console.log('Removed rating_count column from drivers table');
    } catch (error) {
      console.log('Skipping removing rating_count from drivers:', error.message);
    }

    console.log('Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrate();


