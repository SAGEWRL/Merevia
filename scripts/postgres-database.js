function postgresQuery(statement) {
  let parameter = 0;
  return statement.replace(/\?/g, () => `$${++parameter}`);
}

export function createPostgresDatabase(pool) {
  return {
    prepare(statement) {
      const query = postgresQuery(statement);
      return {
        async get(...parameters) {
          const result = await pool.query(query, parameters);
          return result.rows[0];
        },
        async all(...parameters) {
          const result = await pool.query(query, parameters);
          return result.rows;
        },
        async run(...parameters) {
          const result = await pool.query(query, parameters);
          return { changes: result.rowCount };
        },
      };
    },
    async exec(statement) {
      for (const query of statement.split(';').map((part) => part.trim()).filter(Boolean)) {
        await pool.query(query);
      }
    },
  };
}