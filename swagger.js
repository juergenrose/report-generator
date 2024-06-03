const swaggerDefinition = {
  openapi: "3.0.3",
  info: {
    title: "Reporter API",
    description: "Report API for generating and handling reports",
    version: "1.0"
  },
  servers: [
    {
      url: "http://localhost:3000"
    }
  ],
  paths: {
    "/report": {
      get: {
        summary: "Retrieve a list of available reports",
        description: "Returns a list of available reports in the routes folder.",
        responses: {
          '200': {
            description: "Successful response",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    reports: {
                      type: "array",
                      items: {
                        type: "string"
                      }
                    }
                  }
                }
              }
            }
          },
          '404': {
            description: "Report Not Found"
          },
          '500': {
            description: "Internal Server Error"
          }
        }
      }
    },
    "/report/{reportname}": {
      get: {
        summary: "Retrieve a specific report",
        description: "Retrieves the specified report, optionally in a specified format (CSV or PDF). Supports dynamic query parameters.",
        parameters: [
          {
            in: "path",
            name: "reportname",
            required: true,
            schema: {
              type: "string"
            },
            description: "The name of the report to retrieve"
          },
          {
            in: "query",
            name: "params",
            style: "form",
            explode: true,
            schema: {
              type: "object",
              additionalProperties: {
                type: "string"
              }
            },
            description: "Additional dynamic query parameters for the report. This object can contain any key-value pairs needed for the report generation"
          },
          {
            in: "query",
            name: "format",
            schema: {
              type: "string",
              enum: ["csv", "pdf"]
            },
            description: "Optional. The format in which to retrieve the report (e.g., csv, pdf)"
          }
        ],
        responses: {
          '200': {
            description: "Successful response",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/ReportResponse"
                }
              }
            }
          },
          '404': {
            description: "Report Not Found"
          },
          '500': {
            description: "Internal Server Error"
          }
        }
      }
    }
  },
  components: {
    schemas: {
      ReportResponse: {
        type: "object",
        properties: {
          reportname: {
            type: "string",
            description: "The name of the report"
          },
          params: {
            type: "object",
            additionalProperties: {
              type: "string"
            },
            description: "The query parameters used for generating the report. This object can contain any dynamic query parameters provided by the user."
          }
        }
      }
    }
  }
};

module.exports = swaggerDefinition;
