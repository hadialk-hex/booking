import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';

const connection = await mysql.createConnection(process.env.DATABASE_URL);
const db = drizzle(connection);

const result = await connection.query('SELECT id, patientName, doctorId, doctorName, appointmentDate, appointmentTime FROM appointments LIMIT 5');
console.log(JSON.stringify(result[0], null, 2));

await connection.end();
