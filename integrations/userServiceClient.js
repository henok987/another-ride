// userServiceClient.js (in your Booking Service)
const axios = require('axios');

const USER_SERVICE_BASE_URL = process.env.USER_SERVICE_BASE_URL || 'http://localhost:3000/api/users'; // Adjust this URL as needed

const userServiceClient = axios.create({
  baseURL: USER_SERVICE_BASE_URL,
  timeout: 5000, // 5 seconds timeout
});

const handleUserServiceError = (error, defaultMessage = 'User Service is currently unavailable.') => {
  if (error.response) {
    // The request was made and the server responded with a status code
    // that falls out of the range of 2xx
    console.error('User Service responded with error:', error.response.status, error.response.data);
    return {
      message: error.response.data.message || `User Service error: ${error.response.status}`,
      status: error.response.status,
      data: error.response.data,
    };
  } else if (error.request) {
    // The request was made but no response was received
    console.error('No response received from User Service:', error.request);
    return {
      message: 'User Service did not respond.',
      status: 503, // Service Unavailable
    };
  } else {
    // Something happened in setting up the request that triggered an Error
    console.error('Error setting up User Service request:', error.message);
    return {
      message: defaultMessage,
      status: 500, // Internal Server Error
    };
  }
};

const getUserDetails = async (userId, userType) => {
  try {
    let endpoint = '';
    switch (userType) {
      case 'passenger':
        endpoint = `/passengers/${userId}`;
        break;
      case 'driver':
        endpoint = `/drivers/${userId}`;
        break;
      case 'staff':
        endpoint = `/staff/${userId}`;
        break;
      case 'admin':
        endpoint = `/admins/${userId}`;
        break;
      default:
        throw new Error('Invalid user type provided.');
    }
    const response = await userServiceClient.get(endpoint);
    return { success: true, user: response.data };
  } catch (error) {
    const err = handleUserServiceError(error, `Failed to fetch ${userType} details for ID ${userId}.`);
    return { success: false, ...err };
  }
};

// You might add more specific functions here, e.g.,
// const getDriverDetails = async (driverId) => getUserDetails(driverId, 'driver');
// const getPassengerDetails = async (passengerId) => getUserDetails(passengerId, 'passenger');

module.exports = {
  getUserDetails,
  // Export individual getters if preferred for clarity
  getPassengerDetails: (passengerId) => getUserDetails(passengerId, 'passenger'),
  getDriverDetails: (driverId) => getUserDetails(driverId, 'driver'),
  getStaffDetails: (staffId) => getUserDetails(staffId, 'staff'),
  getAdminDetails: (adminId) => getUserDetails(adminId, 'admin'),
  /**
   * Fetch multiple driver summaries by IDs. Expects User Service to support
   * a batch endpoint like GET /drivers?ids=1,2,3 returning an array.
   */
  getDriversByIds: async (driverIds) => {
    try {
      const idsParam = (driverIds || []).map(String).join(',');
      const response = await userServiceClient.get(`/drivers`, { params: { ids: idsParam } });
      // Normalize to simple array of drivers
      const list = Array.isArray(response.data) ? response.data : response.data?.data || [];
      return list;
    } catch (error) {
      const err = handleUserServiceError(error, 'Failed to fetch drivers list.');
      console.error(err.message);
      return [];
    }
  }
};