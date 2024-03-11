const pg = require("pg");
const express = require("express");
const app = express();
const morgan = require("morgan");

app.use(express.json());
app.use(morgan("dev"));

const client = new pg.Client(
  process.env.DATABASE_URl || "postgres://localhost/acme-hr-employees-db"
);

app.get("/api/employees", async (req, res, next) => {
  try {
    const SQL = `
SELECT *
FROM employees;
`;
    const response = await client.query(SQL);
    res.send(response.rows);
  } catch (ex) {
    next(ex);
  }
});

app.get("/api/departments", async (req, res, next) => {
  try {
    const SQL = `
SELECT *
FROM departments;
`;
    const response = await client.query(SQL);
    res.send(response.rows);
  } catch (ex) {
    next(ex);
  }
});

app.delete("/api/employees/:id", async (req, res, next) => {
  try {
    const SQL = `
DELETE FROM employees
WHERE id = $1
`;
    await client.query(SQL, [req.params.id]);
    res.sendStatus(204);
  } catch (ex) {
    next(ex);
  }
});

app.post("/api/employees", async (req, res, next) => {
  try {
    const SQL = `
INSERT INTO employees(name, department_id)
VALUES ($1, $2)
RETURNING *
`;
    const response = await client.query(SQL, [
      req.body.name,
      req.body.department_id,
    ]);
    res.status(201).send(response.rows[0]);
  } catch (ex) {
    next(ex);
  }
});

app.put("/api/employees/:id", async (req, res, next) => {
  try {
    const SQL = `
UPDATE employees
SET name = $1,
updated_at = now(),
department_id = $
WHERE id = $4
RETURNING *
`;
    const response = await client.query(SQL, [
      req.body.name,
      req.body.department_id,
      req.params.id,
    ]);
    res.send(response.rows[0]);
  } catch (ex) {
    next(ex);
  }
});

app.use((err, req, res, next) => {
  res.status(err.status || 500).send({ error: err.message || err });
});

const init = async () => {
  console.log("connecting to database");
  await client.connect();
  console.log("connected to database");
  let SQL = `
  DROP TABLE IF EXISTS employees;
  DROP TABLE IF EXISTS departments;
  CREATE TABLE departments(
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL
  );
  CREATE TABLE employees(
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now(),
    department_id INTEGER REFERENCES departments(id) NOT NULL

);
  `;
  await client.query(SQL);
  console.log("tables created");
  SQL = `
  INSERT INTO departments(name) VALUES ('mentat department');
  INSERT INTO departments(name) VALUES ('bg department');
  INSERT INTO departments(name) VALUES ('suk department');
  INSERT INTO employees(name, department_id) VALUES ('thufir employee 1', (SELECT id FROM departments WHERE name ='mentat department'));
INSERT INTO employees(name, department_id) VALUES ('jessica employee 1', (SELECT id FROM departments WHERE name = 'bg department'));
INSERT INTO employees(name, department_id) VALUES ('yueh employee 1', (SELECT id FROM departments WHERE name = 'suk department'));
INSERT INTO employees(name, department_id) VALUES ('paul employee 2', (SELECT id FROM departments WHERE name = 'mentat department'))
  `;
  await client.query(SQL);
  console.log("tables seeded");
  const port = process.env.PORT || 3001;
  app.listen(port, () => {
    console.log(`listening on port ${port}`);
    console.log("curl commands to test application");
    console.log(`curl localhost:${port}/api/employees`);
    console.log(`curl localhost:${port}/api/departments`);
    console.log(`curl -X DELETE localhost:${port}/api/employees/1`);
    console.log(
      `curl -X POST localhost:${port}/api/employees -d '{ "name": "thufir employee 1", "department_id": 1}' -H "Content-Type:application/json"`
    );
    console.log(
      `curl -X PUT localhost:${port}/api/employees/4 -d '{ "name": "muad'dib", "department_id": 2}' -H "Content-Type:application/json"`
    );
  });
};

init();
