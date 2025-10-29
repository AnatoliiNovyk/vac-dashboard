const { pool } = require('./db.js'); // <--- Changed

const getEmployees = async (user) => {
    if (user.role === 'hr') {
        const result = await pool.query('SELECT * FROM employees');
        return result.rows;
    }
    if (user.role === 'manager') {
        const result = await pool.query('SELECT * FROM employees WHERE manager_id = $1', [user.id]);
        return result.rows;
    }
    return [];
};

const getEmployeeById = async (id) => {
    const result = await pool.query('SELECT * FROM employees WHERE id = $1', [id]);
    return result.rows[0];
};

const getSelf = async (userId) => {
    const result = await pool.query('SELECT * FROM employees WHERE id = $1', [userId]);
    return result.rows[0];
};

module.exports = {
    getEmployees,
    getEmployeeById,
    getSelf,
};