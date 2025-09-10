const { Passenger } = require('../models/userModels');
const { crudController } = require('./basic.crud');

const base = { ...crudController(Passenger) };

// Use local passenger data instead of external service calls
base.list = async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    let query = {};
    if (status) {
      query.status = status;
    }
    
    const passengers = await Passenger.find(query)
      .select('_id name phone email rating createdAt updatedAt')
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 })
      .lean();
    
    const total = await Passenger.countDocuments(query);
    
    const response = passengers.map(p => ({
      id: String(p._id),
      name: p.name,
      phone: p.phone,
      email: p.email,
      rating: p.rating || 5.0,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt
    }));
    
    return res.json({
      passengers: response,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (e) { 
    return res.status(500).json({ message: `Failed to list passengers: ${e.message}` }); 
  }
};

base.get = async (req, res) => {
  try {
    const passenger = await Passenger.findById(req.params.id)
      .select('_id name phone email rating createdAt updatedAt')
      .lean();
    
    if (!passenger) {
      return res.status(404).json({ message: 'Passenger not found' });
    }
    
    const response = {
      id: String(passenger._id),
      name: passenger.name,
      phone: passenger.phone,
      email: passenger.email,
      rating: passenger.rating || 5.0,
      createdAt: passenger.createdAt,
      updatedAt: passenger.updatedAt
    };
    
    return res.json(response);
  } catch (e) { 
    return res.status(500).json({ message: `Failed to get passenger: ${e.message}` }); 
  }
};

module.exports = base;

