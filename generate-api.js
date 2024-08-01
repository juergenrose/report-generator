const swaggerUi = require("swagger-ui-express");
const swaggerJsdoc = require("swagger-jsdoc");
const yaml = require("yaml");
const fsPromise = require("fs").promises;
const path = require("path");
const fs = require("fs");

// Class to handle Swagger documentation generation and setup
class SwaggerGenerator {
  constructor(app, routesDir, outputPath) {
    this.app = app;
    this.routesDir = routesDir;
    this.outputPath = outputPath;
  }

  // Method to retrieve all JavaScript files in the routes directory
  async getApiFiles() {
    // Read the directory contents
    const files = await fsPromise.readdir(this.routesDir);
    // Filter out non-JavaScript files
    const jsFiles = files.filter((file) => file.endsWith(".js"));
    // Return the full paths of the JavaScript files
    return jsFiles.map((file) => path.join(this.routesDir, file));
  }

  // Method to generate Swagger options based on the route files
  async generateSwaggerOptions() {
    // Get the list of API files
    const apiFiles = await this.getApiFiles();
    // Define the base options for Swagger
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
      // Include the current file for Swagger to process
      apis: apiFiles.concat(__filename),
    };

    // Add paths for each report and its suggestions
    apiFiles.forEach((file) => {
      const reportname = path.basename(file, ".js");
      options.definition.paths[`/report/${reportname}`] =
        this.createReportPath(reportname);
      options.definition.paths[`/report/${reportname}/suggestions`] =
        this.createSuggestionsPath(reportname);
    });

    return options;
  }

  // Method to create the path configuration for a report
  createReportPath(reportname) {
    return {
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
  }

  // Method to create the path configuration for report suggestions
  createSuggestionsPath(reportname) {
    return {
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
  }

  // Method to generate and save the Swagger documentation as a YAML file
  async generateAndSaveSwaggerDocs() {
    // Generate the Swagger options
    const options = await this.generateSwaggerOptions();
    // Generate the Swagger specifications
    const specs = swaggerJsdoc(options);
    // Convert the specifications to YAML format
    const yamlData = yaml.stringify(specs);
    // Write the YAML data to the output file
    fs.writeFileSync(this.outputPath, yamlData, "utf8");
    // Return the Swagger specifications
    return specs;
  }

  // Method to set up Swagger UI middleware
  async setupSwagger() {
    // Generate and save the Swagger documentation
    const specs = await this.generateAndSaveSwaggerDocs();
    // Set up the Swagger UI middleware with the generated specifications
    this.app.use(
      "/api-docs",
      swaggerUi.serve,
      swaggerUi.setup(specs, { explorer: true })
    );
  }
}

module.exports = SwaggerGenerator;
