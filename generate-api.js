const swaggerUi = require("swagger-ui-express");
const swaggerJsdoc = require("swagger-jsdoc");
const yaml = require("yaml");
const fsPromise = require("fs").promises;
const path = require("path");
const fs = require("fs");

//dynamically generate the list of API files
async function getApiFiles() {
  const reportsDirectory = path.join(__dirname, "routes");
  const files = await fsPromise.readdir(reportsDirectory);
  const jsFiles = files.filter((file) => file.endsWith(".js"));
  return jsFiles.map((file) => path.join(reportsDirectory, file));
}

//function to generate and save Swagger docs
async function generateAndSaveSwaggerDocs() {
  const apiFiles = await getApiFiles();
  const options = {
    definition: {
      openapi: "3.0.3",
      info: {
        title: "Reporter API",
        description: "Report API for generating and handling reports",
        version: "1.0",
      },
      servers: [
        {
          url: "http://localhost:3000",
        },
      ],
      paths: {},
      components: {
        schemas: {
          ReportResponse: {
            type: "object",
            properties: {
              reportname: {
                type: "string",
                description: "The name of the report",
              },
              params: {
                type: "object",
                additionalProperties: {
                  type: "string",
                },
                description:
                  "The query parameters used for generating the report.",
              },
            },
          },
          SuggestionsResponse: {
            type: "object",
            properties: {
              suggestions: {
                type: "array",
                items: {
                  type: "string",
                },
                description: "Array of suggestions for the report.",
              },
            },
          },
        },
      },
    },
    apis: apiFiles.concat(__filename),
  };

  apiFiles.forEach((file) => {
    const reportname = path.basename(file, ".js");
    options.definition.paths[`/report/${reportname}`] = {
      get: {
        summary: `Retrieve ${reportname} report`,
        description: `Retrieves the ${reportname} report, optionally in a specified format (CSV or PDF). Supports dynamic query parameters.`,
        parameters: [
          {
            in: "path",
            name: "reportname",
            required: true,
            schema: {
              type: "string",
            },
            description: "The name of the report to retrieve",
          },
          {
            in: "query",
            name: "params",
            style: "form",
            explode: true,
            schema: {
              type: "object",
              additionalProperties: {
                type: "string",
              },
            },
            description: "Additional dynamic query parameters for the report.",
          },
          {
            in: "query",
            name: "format",
            schema: {
              type: "string",
              enum: ["csv", "pdf"],
            },
            description:
              "Optional. The format in which to retrieve the report (e.g., csv, pdf)",
          },
        ],
        responses: {
          200: {
            description: "Successful response",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/ReportResponse",
                },
              },
            },
          },
          404: {
            description: "Report Not Found",
          },
          500: {
            description: "Internal Server Error",
          },
        },
      },
    };

    options.definition.paths[`/report/${reportname}/suggestions`] = {
      get: {
        summary: `Retrieve suggestions for ${reportname} report`,
        description: `Retrieves suggestions for the ${reportname} report based on query parameters.`,
        parameters: [
          {
            in: "path",
            name: "reportname",
            required: true,
            schema: {
              type: "string",
            },
            description: "The name of the report to retrieve suggestions for",
          },
          {
            in: "query",
            name: "params",
            style: "form",
            explode: true,
            schema: {
              type: "object",
              additionalProperties: {
                type: "string",
              },
            },
            description:
              "Additional dynamic query parameters for the report suggestions.",
          },
        ],
        responses: {
          200: {
            description: "Successful response",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/SuggestionsResponse",
                },
              },
            },
          },
          404: {
            description: "Report Not Found",
          },
          500: {
            description: "Internal Server Error",
          },
        },
      },
    };
  });

  const specs = swaggerJsdoc(options);
  const yamlData = yaml.stringify(specs);
  fs.writeFileSync(path.join(__dirname, "swagger.yaml"), yamlData, "utf8");

  return specs;
}

//generate and save Swagger docs, then set up the Swagger UI
async function setupSwagger(app) {
  const specs = await generateAndSaveSwaggerDocs();

  app.use(
    "/api-docs",
    swaggerUi.serve,
    swaggerUi.setup(specs, { explorer: true })
  );
}

module.exports = { setupSwagger, getApiFiles, generateAndSaveSwaggerDocs };

