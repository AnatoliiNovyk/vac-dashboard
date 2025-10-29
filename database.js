const { pool } = require('./db.js'); // <--- Changed

const statusEnum = [
    'На роботі', 
    'Вихідний', 
    'В декреті', 
    'На лікарняному'
];

const createTables = async () => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Drop tables to ensure a clean state
        console.log('Dropping existing tables...');
        await client.query('DROP TABLE IF EXISTS vacations');
        await client.query('DROP TABLE IF EXISTS employees');
        await client.query('DROP TYPE IF EXISTS employee_status');

        // Create custom ENUM type for status
        console.log('Creating custom types...');
        const createStatusTypeQuery = `CREATE TYPE employee_status AS ENUM (${statusEnum.map(s => `'${s}'`).join(', ')})`;
        await client.query(createStatusTypeQuery);

        // Create employees table
        console.log('Creating "employees" table...');
        const createEmployeesTableQuery = `
            CREATE TABLE employees (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                department VARCHAR(100),
                role VARCHAR(50) NOT NULL DEFAULT 'employee',
                status employee_status NOT NULL,
                ipn VARCHAR(10) NOT NULL UNIQUE
            );
        `;
        await client.query(createEmployeesTableQuery);

        // Create vacations table
        console.log('Creating "vacations" table...');
        const createVacationsTableQuery = `
            CREATE TABLE vacations (
                id SERIAL PRIMARY KEY,
                employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
                start_date DATE NOT NULL,
                end_date DATE NOT NULL
            );
        `;
        await client.query(createVacationsTableQuery);

        await client.query('COMMIT');
        console.log('Tables created successfully.');
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error creating tables:', error);
        throw error;
    } finally {
        client.release();
    }
};

const seedData = async () => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        console.log('Seeding data...');

        // Seed employees
        const employees = [
            // HR User
            { name: 'Володимир Шевченко', department: 'HR', role: 'hr', status: 'На роботі', ipn: '0000000000' },
            // Employees
            { name: 'Олексій Коваленко', department: 'IT', role: 'employee', status: 'На роботі', ipn: '1111111111' },
            { name: 'Марина Петренко', department: 'IT', role: 'employee', status: 'На роботі', ipn: '2222222222' },
            { name: 'Дмитро Іваненко', department: 'Sales', role: 'employee', status: 'На лікарняному', ipn: '3333333333' },
            { name: 'Анна Сидоренко', department: 'Sales', role: 'employee', status: 'В декреті', ipn: '4444444444' },
            { name: 'Світлана Мельник', department: 'Marketing', role: 'employee', status: 'На роботі', ipn: '6666666666' }
        ];

        const insertEmployeeQuery = 'INSERT INTO employees (name, department, role, status, ipn) VALUES ($1, $2, $3, $4, $5) RETURNING id';
        const employeeIds = [];
        for (const emp of employees) {
            const res = await client.query(insertEmployeeQuery, [emp.name, emp.department, emp.role, emp.status, emp.ipn]);
            employeeIds.push(res.rows[0].id);
        }
        console.log('Employees seeded.');

        // Seed vacations
        const vacations = [
            // Current vacation for Олексій Коваленко
            { employee_id: employeeIds[1], start: '2024-07-15', end: '2024-07-25' },
            // Future (planned) vacation for Марина Петренко
            { employee_id: employeeIds[2], start: '2024-08-10', end: '2024-08-20' },
             // Past vacation for Світлана Мельник
            { employee_id: employeeIds[5], start: '2024-01-05', end: '2024-01-15' },
        ];

        const insertVacationQuery = 'INSERT INTO vacations (employee_id, start_date, end_date) VALUES ($1, $2, $3)';
        for (const vac of vacations) {
            // Adjust dates to be relative to the current date
            const today = new Date();
            let startDate, endDate;

            if (vacations.indexOf(vac) === 0) { // Current vacation
                startDate = new Date(today.setDate(today.getDate() - 5));
                endDate = new Date(today.setDate(today.getDate() + 10));
            } else if (vacations.indexOf(vac) === 1) { // Future vacation
                startDate = new Date(today.setDate(today.getDate() + 20));
                endDate = new Date(today.setDate(today.getDate() + 30));
            } else { // Past vacation
                 startDate = new Date(today.setDate(today.getDate() - 90));
                 endDate = new Date(today.setDate(today.getDate() - 80));
            }
            
            await client.query(insertVacationQuery, [vac.employee_id, startDate.toISOString().split('T')[0], endDate.toISOString().split('T')[0]]);
        }
        console.log('Vacations seeded.');

        await client.query('COMMIT');
        console.log('Data seeded successfully.');
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error seeding data:', error);
        throw error;
    } finally {
        client.release();
    }
};

const initializeDatabase = async () => {
    try {
        await createTables();
        await seedData();
        console.log('Database initialization complete.');
    } catch (error) {
        console.error('Failed to initialize the database:', error);
    } 
};

if (require.main === module) {
    initializeDatabase();
}
