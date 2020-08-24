const axios = require('axios');
const BaseDriver = require('@cubejs-backend/query-orchestrator/driver/BaseDriver');
const SqlString = require('sqlstring');
const DremioQuery = require('./DremioQuery');

// limit - Determines how many rows are returned (maximum of 500). Default: 100
// @see https://docs.dremio.com/rest-api/jobs/get-job.html
const dremioJobLimit = 500;

const applyParams = (query, params) => SqlString.format(query, params);
class DremioDriver extends BaseDriver {
  static dialectClass() {
    return DremioQuery;
  }

  constructor(config = {}) {
    super();
    
    this.config = {
      host: config.host || process.env.CUBEJS_DB_HOST || 'localhost',
      port: config.port || process.env.CUBEJS_DB_PORT || 9047,
      user: config.user || process.env.CUBEJS_DB_USER,
      password: config.password || process.env.CUBEJS_DB_PASS,
      database: config.database || process.env.CUBEJS_DB_NAME
    };

    this.config.url = `http://${this.config.host}:${this.config.port}`;
  }

  async testConnection() {
    await this.getToken();
    return true;
  }

  quoteIdentifier(identifier) {
    if (/^".*"$/.test(identifier)) {
      return identifier;
    }

    return `"${identifier}"`;
  }

  async getToken() {
    if (this.authToken && this.authToken.expires > new Date().getTime()) {
      return `_dremio${this.authToken.token}`;
    }

    const { data } = await axios.post(`${this.config.url}/apiv2/login`, {
      userName: this.config.user,
      password: this.config.password
    });

    this.authToken = data;
    return `_dremio${this.authToken.token}`;
  }

  async restDremioQuery(type, url, data) {
    const token = await this.getToken();
    if (type === 'get') {
      return axios[type](`${this.config.url}${url}`, {
        headers: {
          Authorization: `${token}`
        }
      });
    }
    return axios[type](`${this.config.url}${url}`, data, {
      headers: {
        Authorization: `${token}`
      }
    });
  }

  async getJobStatus(jobId) {
    return this.restDremioQuery('get', `/api/v3/job/${jobId}`);
  }

  async getJobResults(jobId, limit = 500, offset = 0) {
    return this.restDremioQuery('get', `/api/v3/job/${jobId}/results?offset=${offset}&limit=${limit}`);
  }

  async sleep(time) {
    await new Promise((resolve) => setTimeout(resolve, time));
  }

  async executeQuery(sql) {
    const { data } = await this.restDremioQuery('post', '/api/v3/sql', { sql });
    return data.id;
  }

  async query(query, values) {
    const queryString = applyParams(
      query,
      (values || []).map(s => (typeof s === 'string' ? {
        toSqlString: () => SqlString.escape(s).replace(/\\\\([_%])/g, '\\$1').replace(/\\'/g, '\'\'')
      } : s))
    );

    await this.getToken();
    const jobId = await this.executeQuery(queryString);

    for (;;) {
      const { data } = await this.getJobStatus(jobId);

      console.log(data.jobState, jobId);

      if (data.jobState === 'FAILED') {
        throw new Error(data.errorMessage);
      } else if (data.jobState === 'CANCELED') {
        throw new Error(`Job ${jobId} was been canceled`);
      } else if (data.jobState === 'COMPLETED') {
        let rows = [];
        const querys = [];

        for (let i = 0; i < data.rowCount; i += dremioJobLimit) {
          querys.push(this.getJobResults(jobId, dremioJobLimit, i));
        }

        const parts = await Promise.all(querys);
        parts.forEach((e) => {
          rows = rows.concat(e.data.rows);
        });
        
        return rows;
      }

      await this.sleep(1000);
    }
  }
 
  async refreshTablesSchema(path) {
    const { data } = await this.restDremioQuery('get', `/api/v3/catalog/by-path/${path}`);
    if (!data || !data.children) {
      return true;
    }

    const querys = data.children.map(element => {
      const url = element.path.join('/');
      return this.refreshTablesSchema(url);
    });
 
    return Promise.all(querys);
  }

  async tablesSchema() {
    if (!this.config.database) {
      throw new Error('CUBEJS_DB_NAME can`t be empty. Please make sure this parameter is defined in the project settings.');
    }
    
    await this.refreshTablesSchema(this.config.database);
    const schema = await super.tablesSchema();
    
    const newschema = {};
    Object.keys(schema).forEach(key => {
      newschema[`"${key}"`] = schema[key];
    });
    return newschema;
  }

  informationSchemaQuery() {
    const q = `${super.informationSchemaQuery()} AND columns.table_schema NOT IN ('INFORMATION_SCHEMA', 'sys.cache')`;
    console.log(q);
    return q;
  }
}

module.exports = DremioDriver;
